import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import type { CarouselProps } from '../types';
import PageItem from './PageItem';
import { generateOffsets, getLogicalPage } from '../utils';
import { useCarouselContext } from './useCarouselContext';
import { useInternalCarouselContext } from './useInternalCarouselContext';
import { useCarouselScroll } from './useCarouselScroll';
import { useCarouselAutoplay } from './useCarouselAutoplay';

// ---------------------------------------------------------------------------
// Terminology
// ---------------------------------------------------------------------------
//   render index  – position in the padded pageItems array (includes loop
//                   clones at head/tail). Used for scroll offsets.
//   logical index – position in the original data array (0 .. data.length-1).
//                   All consumer-facing callbacks receive logical indices.
// The scroll/state-machine mechanics (CarouselState, jumpDestination, the
// scroll handler, navigation) live in useCarouselScroll; this component
// wires that engine to context, props, and rendering.
// ---------------------------------------------------------------------------

function Carousel<TData>({
  style,
  data,
  initialPage = 0,
  loop = false,
  additionalPagesPerSide = 2,
  autoPlay = false,
  duration = 1000,
  animation,
  sliderWidth,
  itemWidth,
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
  const { width: screenWidth } = useWindowDimensions();
  const effectiveSliderWidth = sliderWidth ?? screenWidth;
  const effectiveItemWidth = itemWidth ?? screenWidth;

  const { currentPage: animatedPage, totalPage } = useCarouselContext();

  // ---- derived values -------------------------------------------------------

  const horizontalPadding = useMemo(() => {
    const padding = (effectiveSliderWidth - effectiveItemWidth) / 2;
    return firstItemAlignment === 'center' || loop ? padding : spaceHeadTail;
  }, [effectiveSliderWidth, effectiveItemWidth, firstItemAlignment, loop, spaceHeadTail]);

  const offsets = useMemo(() => {
    return generateOffsets({
      sliderWidth: effectiveSliderWidth,
      itemWidth: effectiveItemWidth,
      itemCount: data.length + (loop ? additionalPagesPerSide * 2 : 0),
      horizontalPadding,
    });
  }, [
    effectiveSliderWidth,
    effectiveItemWidth,
    data.length,
    loop,
    additionalPagesPerSide,
    horizontalPadding,
  ]);

  // Single source of truth for initialPage validity — initialRenderIndex,
  // initialContentOffset, and the initial-page-setup effect below all derive
  // from this so they can't disagree about whether initialPage is usable.
  const isValidInitialPage = initialPage >= 0 && initialPage < data.length;

  // Safe render index + native scroll offset for initialPage, used both to
  // seed useCarouselScroll's shared values below and as the ScrollView's
  // `contentOffset` — lets the native view mount already scrolled to the
  // right page instead of scrolling it there after mount (which raced the
  // animated ref's UI-thread registration).
  // An invalid initialPage falls back to render index 0 rather than a
  // clamped-but-misleading index, so the mounted visual position always
  // agrees with the page-0 shared-value state seeded below.
  const initialRenderIndex = useMemo(() => {
    if (!isValidInitialPage) return 0;
    const renderIndex = loop ? initialPage + additionalPagesPerSide : initialPage;
    return Math.max(0, Math.min(renderIndex, offsets.length - 1));
  }, [isValidInitialPage, initialPage, loop, additionalPagesPerSide, offsets.length]);

  const initialContentOffset = useMemo(
    () => offsets[initialRenderIndex] ?? 0,
    [offsets, initialRenderIndex],
  );

  const pageItems = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    if (loop) {
      const headItems = data.slice(data.length - additionalPagesPerSide, data.length);
      const tailItems = data.slice(0, additionalPagesPerSide);
      return [...headItems, ...data, ...tailItems];
    }
    return data;
  }, [data, loop, additionalPagesPerSide]);

  // ---- page-change callback (JS thread) --------------------------------------

  const handlePageChange = useCallback(
    (logicalPage: number) => {
      animatedPage.value = logicalPage;
      if (onPageChange) {
        onPageChange(logicalPage);
      }
    },
    [onPageChange, animatedPage],
  );

  // ---- scroll / state-machine engine + autoplay ------------------------------

  const scroll = useCarouselScroll({
    dataLength: data.length,
    loop,
    additionalPagesPerSide,
    offsets,
    onPageChange: handlePageChange,
  });

  useCarouselAutoplay({
    enabled: autoPlay && loop,
    duration,
    paused: scroll.autoplayPaused,
    carouselState: scroll.carouselState,
    goNext: scroll.goNext,
  });

  // ---- side effects -----------------------------------------------------------

  // Hoisted above the reposition effect below, which reads it to skip its
  // mount-time run (see that effect for why).
  const didInitialMount = useRef(false);

  useEffect(() => {
    totalPage.value = data.length;
  }, [data.length, totalPage]);

  // When the carousel layout or data changes (orientation, split-screen,
  // toggling loop, data shrinking), reposition so the current logical page
  // stays visible at its new render index and scroll offset.
  useEffect(() => {
    // Skip on mount: this effect runs in the same commit as the "initial
    // page setup" effect below, both scrolling from currentLogicalPage=0
    // (the shared-value default) before initialPage has been applied —
    // racing its scrollTo(initialPage) and leaving the ScrollView on page 0
    // even though currentLogicalPage/animatedPage end up correct.
    if (!didInitialMount.current) return;
    if (data.length === 0 || offsets.length === 0) return;

    const prevLogical = scroll.currentLogicalPage.value;
    const clampedLogical = Math.min(scroll.currentLogicalPage.value, data.length - 1);
    const renderIdx = loop ? clampedLogical + additionalPagesPerSide : clampedLogical;
    const safeRenderIdx = Math.max(0, Math.min(renderIdx, offsets.length - 1));
    const safeLogicalIdx = getLogicalPage(safeRenderIdx, data.length, additionalPagesPerSide, loop);

    scroll.currentRenderPage.value = safeRenderIdx;
    scroll.currentLogicalPage.value = safeLogicalIdx;
    animatedPage.value = safeLogicalIdx;
    scroll.animatedScroll.value = offsets[safeRenderIdx];

    scroll.scrollToRenderIndex(safeRenderIdx, false);

    if (safeLogicalIdx !== prevLogical) {
      handlePageChange(safeLogicalIdx);
    }
  }, [data.length, effectiveSliderWidth, effectiveItemWidth, loop, additionalPagesPerSide, offsets]);

  // ---- context wiring -----------------------------------------------------------

  const { setCarouselHandlers } = useInternalCarouselContext();

  useEffect(() => {
    if (setCarouselHandlers) {
      setCarouselHandlers({
        goNext: scroll.goNext,
        goPrev: scroll.goPrev,
        snapToItem: scroll.snapToItem,
      });
    }
  }, [scroll.goNext, scroll.goPrev, scroll.snapToItem, setCarouselHandlers]);

  // ---- initial page setup -------------------------------------------------------

  // Visual scroll position for initialPage is set declaratively via the
  // ScrollView's `contentOffset` prop below (native-mount time, no ref
  // needed — sidesteps the animated ref's UI-thread registration race).
  // This effect only seeds the shared values that drive parallax/pagination
  // state to match.
  useEffect(() => {
    if (didInitialMount.current) return;
    didInitialMount.current = true;

    if (data.length === 0) return;
    if (!isValidInitialPage) {
      console.error(`Invalid initialPage ${initialPage}`);
    }
    // Invalid initialPage falls back to page 0 — matches initialRenderIndex
    // /initialContentOffset above, so the seeded state always agrees with
    // where the ScrollView actually mounted.
    const seededLogicalPage = isValidInitialPage ? initialPage : 0;
    scroll.currentRenderPage.value = initialRenderIndex;
    scroll.currentLogicalPage.value = seededLogicalPage;
    animatedPage.value = seededLogicalPage;
    scroll.animatedScroll.value = initialContentOffset;
  }, [data.length, initialPage, isValidInitialPage, initialRenderIndex, initialContentOffset]);

  // ---- render helpers -----------------------------------------------------------

  // NOTE: keyExtractor is called with the render index (position in the
  // padded/cloned pageItems array), not the logical index — this matches
  // the pre-refactor behavior. It's arguably inconsistent with renderItem /
  // onItemPress (which get the logical index), but that's a public-API
  // behavior change and out of scope here; flagging as a possible future
  // fix rather than making it silently.
  const getItemKey = useCallback(
    (item: TData, renderIndex: number): string => {
      if (keyExtractor) {
        return `${keyExtractor(item, renderIndex)}-${renderIndex}`;
      }
      if ((item as any).id) {
        return `${(item as any).id}-${renderIndex}`;
      }
      return `carousel-item-${renderIndex}`;
    },
    [keyExtractor],
  );

  type PageModel = {
    key: string;
    item: TData;
    logicalIndex: number;
    offset: number;
    containerStyle: { paddingLeft: number; paddingRight: number };
    onPress?: () => void;
  };

  // Single pass over pageItems — containerStyle, the press handler, and the
  // React key all need the logical index, so compute it once per item
  // instead of re-deriving it three times.
  const pageModels: PageModel[] = useMemo(() => {
    return pageItems.map((item, i) => {
      const logicalIndex = loop ? getLogicalPage(i, data.length, additionalPagesPerSide, loop) : i;
      const containerStyle =
        firstItemAlignment !== 'start'
          ? { paddingLeft: spaceBetween / 2, paddingRight: spaceBetween / 2 }
          : {
              paddingLeft: logicalIndex === 0 ? 0 : spaceBetween / 2,
              paddingRight: logicalIndex === data.length - 1 ? 0 : spaceBetween / 2,
            };
      return {
        key: getItemKey(item, i),
        item,
        logicalIndex,
        offset: offsets[i],
        containerStyle,
        onPress: disableItemPress
          ? undefined
          : () => {
              scroll.scrollToRenderIndex(i);
              if (onItemPress) {
                onItemPress(item, logicalIndex);
              }
            },
      };
    });
  }, [
    pageItems,
    data.length,
    loop,
    additionalPagesPerSide,
    firstItemAlignment,
    spaceBetween,
    offsets,
    getItemKey,
    disableItemPress,
    onItemPress,
    scroll.scrollToRenderIndex,
  ]);

  const contentContainerStyle = useMemo(
    () => ({ paddingHorizontal: horizontalPadding }),
    [horizontalPadding],
  );

  const renderPage = useCallback(
    (model: PageModel) => (
      <PageItem
        key={model.key}
        containerStyle={model.containerStyle}
        item={model.item}
        index={model.logicalIndex}
        offset={model.offset}
        itemWidth={effectiveItemWidth}
        animatedValue={scroll.animatedScroll}
        animation={animation}
        renderItem={renderItem}
        freeze={scroll.freeze}
        inactiveOpacity={inactiveOpacity}
        inactiveScale={inactiveScale}
        onPress={model.onPress}
      />
    ),
    [
      effectiveItemWidth,
      scroll.animatedScroll,
      animation,
      renderItem,
      scroll.freeze,
      inactiveOpacity,
      inactiveScale,
    ],
  );

  // ---- render ---------------------------------------------------------------

  return (
    <Animated.ScrollView
      {...scrollViewProps}
      ref={(nativeRef: any) => {
        scroll.animatedRef(nativeRef);
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
      onScroll={scroll.scrollHandler}
      bounces={false}
      contentContainerStyle={contentContainerStyle}
      contentOffset={{
        x: initialContentOffset,
        y: 0,
      }}
    >
      {pageModels.map(renderPage)}
    </Animated.ScrollView>
  );
}

export default Carousel;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
