import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Dimensions, StyleSheet, Platform, AppState } from 'react-native';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import type { CarouselProps } from '../types';
import PageItem from './PageItem';
import {
  findNearestPage,
  generateOffsets,
  getLogicalPage,
  getLoopBoundaryTarget,
} from '../utils';
import { useCarouselContext } from './useCarouselContext';
import { useInternalCarouselContext } from './useInternalCarouselContext';

// ---------------------------------------------------------------------------
// Carousel state machine
// ---------------------------------------------------------------------------
// Transitions:
//
//   IDLE ── onBeginDrag ──► DRAGGING
//   IDLE ── programmatic scroll ──► (stays IDLE, onMomentumEnd fires)
//   DRAGGING ── onMomentumEnd ──► IDLE (or LOOP_JUMP at boundary)
//   LOOP_JUMP ── onScroll (arrival) ──► IDLE
//   LOOP_JUMP ── onBeginDrag (user overrides) ──► DRAGGING
//
// Page change (onPageChange / animatedPage) fires from onMomentumEnd for
// both user drags and programmatic scrolls (goNext / goPrev / snapToItem).
// Autoplay only advances when state === IDLE.
// ---------------------------------------------------------------------------

enum CarouselState {
  IDLE = 0,
  DRAGGING = 1,
  LOOP_JUMP = 2,
}

// ---------------------------------------------------------------------------
// Terminology
// ---------------------------------------------------------------------------
//   render index  – position in the padded pageItems array (includes loop
//                   clones at head/tail). Used for scroll offsets.
//   logical index – position in the original data array (0 .. data.length-1).
//                   All consumer-facing callbacks receive logical indices.
// ---------------------------------------------------------------------------

const getScreenWidth = () => {
  return Dimensions.get('screen').width;
};

function Carousel<TData>({
  style,
  data,
  initialPage = 0,
  loop = false,
  additionalPagesPerSide = 2,
  autoPlay = false,
  duration = 1000,
  animation,
  sliderWidth = getScreenWidth(),
  itemWidth = getScreenWidth(),
  firstItemAlignment = 'center',
  inactiveOpacity = 1,
  inactiveScale = 1,
  spaceBetween = 0,
  spaceHeadTail = 0,
  renderItem,
  onPageChange,
  scrollViewProps = {},
  keyExtractor,
  onItemPress,
  disableItemPress = false,
  scrollViewRef: externalScrollViewRef,
}: CarouselProps<TData>) {
  // ---- shared values (UI-thread state) ------------------------------------

  const currentRenderPage = useSharedValue(0);
  const currentLogicalPage = useSharedValue(0);
  const animatedScroll = useSharedValue(0);

  const carouselState = useSharedValue(CarouselState.IDLE);
  // Destination render page for a loop jump. Used to detect arrival via
  // onScroll and release the jump lock.
  const jumpDestination = useSharedValue(-1);
  // Suppresses parallax/opacity animations during instant scrolls on
  // Android where the scroll isn't truly synchronous.
  const freeze = useSharedValue(false);
  // When false, autoplay is suppressed (app backgrounded). Plain ref —
  // only read on JS thread by the autoplay interval.
  const appActiveRef = useRef(true);

  const internalAnimatedRef = useAnimatedRef<Animated.ScrollView>();
  const { currentPage: animatedPage, totalPage } = useCarouselContext();

  // ---- derived values -----------------------------------------------------

  const horizontalPadding = useMemo(() => {
    const padding = (sliderWidth - itemWidth) / 2;
    return firstItemAlignment === 'center' || loop ? padding : spaceHeadTail;
  }, [sliderWidth, itemWidth, firstItemAlignment, loop, spaceHeadTail]);

  const offsets = useMemo(() => {
    return generateOffsets({
      sliderWidth,
      itemWidth,
      itemCount: data.length + (loop ? additionalPagesPerSide * 2 : 0),
      horizontalPadding,
    });
  }, [sliderWidth, itemWidth, data.length, loop, additionalPagesPerSide, horizontalPadding]);

  const pageItems = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    if (loop) {
      const headItems = data.slice(
        data.length - additionalPagesPerSide,
        data.length
      );
      const tailItems = data.slice(0, additionalPagesPerSide);
      return [...headItems, ...data, ...tailItems];
    }
    return data;
  }, [data, loop, additionalPagesPerSide]);

   // ---- page-change callback (JS thread) -----------------------------------

  const handlePageChange = useCallback(
    (logicalPage: number) => {
      animatedPage.value = logicalPage;
      if (onPageChange) {
        onPageChange(logicalPage);
      }
    },
    [onPageChange, animatedPage]
  );

  // ---- side effects -------------------------------------------------------

  useEffect(() => {
    totalPage.value = data.length;
  }, [data.length, totalPage]);

  // When the carousel layout or data changes (orientation, split-screen,
  // toggling loop, data shrinking), reposition so the current logical
  // page stays visible at its new render index and scroll offset.
  useEffect(() => {
    if (data.length === 0 || offsets.length === 0) return;

    const prevLogical = currentLogicalPage.value;
    const clampedLogical = Math.min(currentLogicalPage.value, data.length - 1);
    const renderIdx = loop
      ? clampedLogical + additionalPagesPerSide
      : clampedLogical;
    const safeRenderIdx = Math.max(0, Math.min(renderIdx, offsets.length - 1));
    const safeLogicalIdx = getLogicalPage(
      safeRenderIdx,
      data.length,
      additionalPagesPerSide,
      loop
    );

    currentRenderPage.value = safeRenderIdx;
    currentLogicalPage.value = safeLogicalIdx;
    animatedPage.value = safeLogicalIdx;

    const scrollOffset = renderOffset(safeRenderIdx);
    animatedScroll.value = scrollOffset;

    scheduleOnUI((_idx: number, offsetVal: number) => {
      'worklet';
      scrollTo(internalAnimatedRef, offsetVal, 0, false);
    }, safeRenderIdx, scrollOffset);

    if (safeLogicalIdx !== prevLogical) {
      handlePageChange(safeLogicalIdx);
    }
  }, [data.length, sliderWidth, itemWidth, loop, additionalPagesPerSide, offsets.length, handlePageChange]);

  // ---- app-state listener (pause autoplay when backgrounded) --------------

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appActiveRef.current = state === 'active';
    });
    return () => sub.remove();
  }, []);

  // ---- scroll helpers -----------------------------------------------------

  // Safe accessor: returns offset for a render index, clamping to valid
  // range and falling back to 0 if offsets is empty.
  const renderOffset = useCallback(
    (renderIdx: number): number => {
      if (offsets.length === 0) return 0;
      const clamped = Math.max(0, Math.min(renderIdx, offsets.length - 1));
      return offsets[clamped];
    },
    [offsets]
  );

  const handleScrollTo = useCallback(
    (page: number, animated = true) => {
      const offset = renderOffset(page);
      scheduleOnUI((offsetVal: number, isAnimated: boolean) => {
        'worklet';
        scrollTo(internalAnimatedRef, offsetVal, 0, isAnimated);
      }, offset, animated);
    },
    [renderOffset, internalAnimatedRef]
  );

  // ---- navigation ---------------------------------------------------------

  const goNext = useCallback(() => {
    if (carouselState.value !== CarouselState.IDLE || data.length === 0) return;
    const next = currentRenderPage.value + 1;
    if (next < offsets.length) {
      currentRenderPage.value = next;
      handleScrollTo(next);
    }
  }, [handleScrollTo, offsets.length, data.length]);

  const goPrev = useCallback(() => {
    if (carouselState.value !== CarouselState.IDLE || data.length === 0) return;
    const prev = currentRenderPage.value - 1;
    if (prev >= 0) {
      currentRenderPage.value = prev;
      handleScrollTo(prev);
    }
  }, [handleScrollTo]);

  const snapToItem = useCallback(
    (index: number, animated = true) => {
      if (data.length === 0) return;
      if (index < 0 || index >= data.length) {
        console.error(`Index not valid ${index}`);
        return;
      }
      const renderIndex = loop ? index + additionalPagesPerSide : index;
      const clamped = Math.max(0, Math.min(renderIndex, offsets.length - 1));
      currentRenderPage.value = clamped;
      currentLogicalPage.value = index;
      handleScrollTo(clamped, animated);
    },
    [loop, additionalPagesPerSide, offsets.length, handleScrollTo, data.length]
  );

  // ---- context wiring -----------------------------------------------------

  const { setCarouselHandlers } = useInternalCarouselContext();

  useEffect(() => {
    if (setCarouselHandlers) {
      setCarouselHandlers({
        goNext,
        goPrev,
        snapToItem,
      });
    }
  }, [goNext, goPrev, snapToItem, setCarouselHandlers]);

  // ---- autoplay -----------------------------------------------------------

  // isDragging acts as a debounce — autoplay resumes 200ms after the
  // user lifts their finger, preventing an immediate auto-advance.
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  useInterval(
    () => {
      if (
        carouselState.value === CarouselState.IDLE &&
        appActiveRef.current
      ) {
        goNext();
      }
    },
    !autoPlay || !loop || autoplayPaused ? -1 : duration
  );

  // ---- initial page setup -------------------------------------------------

  const didInitialMount = useRef(false);

  useEffect(() => {
    if (didInitialMount.current) return;
    didInitialMount.current = true;

    if (data.length === 0) return;
    if (initialPage < 0 || initialPage >= data.length) {
      console.error(`Invalid initialPage ${initialPage}`);
      return;
    }
    const renderIndex = loop ? initialPage + additionalPagesPerSide : initialPage;
    const safeIdx = Math.max(0, Math.min(renderIndex, offsets.length - 1));
    currentRenderPage.value = safeIdx;
    currentLogicalPage.value = initialPage;
    animatedPage.value = initialPage;

    scheduleOnUI((idx: number) => {
      'worklet';
      scrollTo(internalAnimatedRef, offsets[idx], 0, false);
    }, safeIdx);
    animatedScroll.value = offsets[safeIdx] ?? 0;
  }, [data.length, initialPage, loop, additionalPagesPerSide, offsets]);

  // ---- scroll handler (UI thread worklet) ---------------------------------

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        animatedScroll.value = event.contentOffset.x;

        // During a loop jump, detect when the scroll arrives at the
        // destination and transition back to IDLE.
        if (
          carouselState.value === CarouselState.LOOP_JUMP &&
          jumpDestination.value !== -1
        ) {
          const nearest = findNearestPage(event.contentOffset.x, offsets);
          if (nearest === jumpDestination.value) {
            freeze.value = false;
            carouselState.value = CarouselState.IDLE;
            jumpDestination.value = -1;
          }
        }
      },

      onBeginDrag: () => {
        // User gesture always wins. Cancel any in-flight loop jump
        // so the carousel doesn't fight the user's drag.
        if (carouselState.value === CarouselState.LOOP_JUMP) {
          jumpDestination.value = -1;
          freeze.value = false;
        }
        carouselState.value = CarouselState.DRAGGING;
        scheduleOnRN(setAutoplayPaused, true);
      },

      onEndDrag: () => {
        // Autoplay resumes in onMomentumEnd after momentum settles.
      },

      onMomentumEnd: (event) => {
        // Process page changes after both user drags and programmatic
        // scrolls (goNext / goPrev / snapToItem). Loop jumps are
        // instant scrolls that are resolved via onScroll instead.
        if (carouselState.value === CarouselState.LOOP_JUMP) {
          return;
        }

        const offset = event.contentOffset.x;
        if (isNaN(offset) || offsets.length === 0) {
          carouselState.value = CarouselState.IDLE;
          scheduleOnRN(setAutoplayPaused, false);
          return;
        }

        const renderPage = findNearestPage(offset, offsets);

        // Loop boundary — user scrolled into the cloned head/tail pages.
        if (loop) {
          const boundaryTarget = getLoopBoundaryTarget(
            renderPage,
            data.length,
            additionalPagesPerSide
          );
          if (boundaryTarget !== -1) {
            // Jump instantly to the matching real page.
            // On Android, freeze animations during the jump to prevent
            // a visual flash from the clones.
            carouselState.value = CarouselState.LOOP_JUMP;
            jumpDestination.value = boundaryTarget;
            freeze.value = Platform.OS === 'android';
            animatedScroll.value = offsets[boundaryTarget];
            scrollTo(internalAnimatedRef, offsets[boundaryTarget], 0, false);

            currentRenderPage.value = boundaryTarget;
            currentLogicalPage.value = getLogicalPage(
              boundaryTarget,
              data.length,
              additionalPagesPerSide,
              loop
            );
            scheduleOnRN(handlePageChange, currentLogicalPage.value);
            return;
          }
        }

        // Normal page change — no loop boundary involved.
        carouselState.value = CarouselState.IDLE;
        currentRenderPage.value = renderPage;
        currentLogicalPage.value = getLogicalPage(
          renderPage,
          data.length,
          additionalPagesPerSide,
          loop
        );
        scheduleOnRN(handlePageChange, currentLogicalPage.value);
        // Autoplay only resumes once momentum fully settles.
        scheduleOnRN(setAutoplayPaused, false);
      },
    },
    [
      offsets,
      loop,
      data.length,
      additionalPagesPerSide,
      handlePageChange,
      internalAnimatedRef,
    ]
  );

  // ---- render helpers -----------------------------------------------------

  const getItemKey = useCallback(
    (item: TData, index: number): string => {
      if (keyExtractor) {
        return `${keyExtractor(item, index)}-${index}`;
      }
      if ((item as any).id) {
        return `${(item as any).id}-${index}`;
      }
      return `carousel-item-${index}`;
    },
    [keyExtractor]
  );

  const containerStyles = useMemo(() => {
    if (data.length === 0) return [];
    return pageItems.map((_, i) => {
      if (firstItemAlignment !== 'start') {
        return {
          paddingLeft: spaceBetween / 2,
          paddingRight: spaceBetween / 2,
        } as const;
      }
      const logicalIndex = loop
        ? getLogicalPage(i, data.length, additionalPagesPerSide, loop)
        : i;
      return {
        paddingLeft: logicalIndex === 0 ? 0 : spaceBetween / 2,
        paddingRight:
          logicalIndex === data.length - 1 ? 0 : spaceBetween / 2,
      } as const;
    });
  }, [pageItems, firstItemAlignment, spaceBetween, data.length, loop, additionalPagesPerSide]);

  const itemPressHandlers = useMemo(() => {
    if (disableItemPress) return [];
    return pageItems.map((item, i) => {
      const logicalIndex = loop
        ? getLogicalPage(i, data.length, additionalPagesPerSide, loop)
        : i;
      return () => {
        handleScrollTo(i);
        if (onItemPress) {
          onItemPress(item, logicalIndex);
        }
      };
    });
  }, [pageItems, disableItemPress, loop, data.length, additionalPagesPerSide, handleScrollTo, onItemPress]);

  const contentContainerStyle = useMemo(
    () => ({ paddingHorizontal: horizontalPadding }),
    [horizontalPadding]
  );

  const renderPage = useCallback(
    (item: TData, i: number) => {
      // Compute the logical index so consumer callbacks (renderItem,
      // onItemPress via `index` prop) receive logical, not render.
      const logicalIndex = loop
        ? getLogicalPage(i, data.length, additionalPagesPerSide, loop)
        : i;
      return (
        <PageItem
          key={getItemKey(item, i)}
          containerStyle={containerStyles[i]}
          item={item}
          index={logicalIndex}
          offset={offsets[i]}
          itemWidth={itemWidth}
          animatedValue={animatedScroll}
          animation={animation}
          renderItem={renderItem}
          freeze={freeze}
          inactiveOpacity={inactiveOpacity}
          inactiveScale={inactiveScale}
          onPress={itemPressHandlers[i]}
        />
      );
    },
    [
      loop,
      data.length,
      additionalPagesPerSide,
      getItemKey,
      containerStyles,
      offsets,
      itemWidth,
      animatedScroll,
      animation,
      renderItem,
      freeze,
      inactiveOpacity,
      inactiveScale,
      itemPressHandlers,
    ]
  );

  // ---- render -------------------------------------------------------------

  return (
    <Animated.ScrollView
      {...scrollViewProps}
      ref={(nativeRef: any) => {
        internalAnimatedRef(nativeRef);
        if (externalScrollViewRef) {
          externalScrollViewRef.current = nativeRef;
        }
      }}
      style={[styles.container, style]}
      horizontal
      disableScrollViewPanResponder
      disableIntervalMomentum
      showsHorizontalScrollIndicator={false}
      snapToOffsets={offsets}
      snapToStart
      snapToEnd
      decelerationRate="fast"
      scrollEventThrottle={4}
      onScroll={scrollHandler}
      bounces={false}
      contentContainerStyle={contentContainerStyle}
    >
      {pageItems.map(renderPage)}
    </Animated.ScrollView>
  );
}

export default Carousel;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
