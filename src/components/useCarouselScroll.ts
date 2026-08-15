import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { findNearestPage, getLogicalPage, getLoopBoundaryTarget } from '../utils';

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
// Page change (onPageChange) fires from onMomentumEnd for both user drags
// and programmatic scrolls (goNext / goPrev / snapToItem). Autoplay only
// advances while state === IDLE (see useCarouselAutoplay).
// ---------------------------------------------------------------------------

export enum CarouselState {
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

type UseCarouselScrollParams = {
  // Primitive snapshot of data.length — never pass the `data` array itself
  // in, the scroll handler below is a worklet and Reanimated can't clone
  // non-shareable item values (e.g. JSX) to the UI thread.
  dataLength: number;
  loop: boolean;
  additionalPagesPerSide: number;
  offsets: number[];
  // JS-thread callback invoked with the new logical page whenever a page
  // change commits (user drag settling, programmatic scroll settling, or a
  // loop boundary jump).
  onPageChange: (logicalPage: number) => void;
};

export function useCarouselScroll({
  dataLength,
  loop,
  additionalPagesPerSide,
  offsets,
  onPageChange,
}: UseCarouselScrollParams) {
  const animatedRef = useAnimatedRef<Animated.ScrollView>();

  // ---- shared values (UI-thread state) -------------------------------------

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

  // Drag/settle debounce for autoplay — true while the user is dragging or
  // a programmatic scroll hasn't settled yet. Consumed by useCarouselAutoplay.
  const [autoplayPaused, setAutoplayPaused] = useState(false);

  // ---- scroll helpers -------------------------------------------------------

  // Safe accessor: returns offset for a render index, clamping to valid
  // range and falling back to 0 if offsets is empty.
  const renderOffset = useCallback(
    (renderIdx: number): number => {
      if (offsets.length === 0) return 0;
      const clamped = Math.max(0, Math.min(renderIdx, offsets.length - 1));
      return offsets[clamped];
    },
    [offsets],
  );

  // JS -> UI thread scrollTo helper.
  const scrollToRenderIndex = useCallback(
    (renderIdx: number, animated = true) => {
      const offset = renderOffset(renderIdx);
      scheduleOnUI(
        (offsetVal: number, isAnimated: boolean) => {
          'worklet';
          scrollTo(animatedRef, offsetVal, 0, isAnimated);
        },
        offset,
        animated,
      );
    },
    [renderOffset, animatedRef],
  );

  // ---- navigation -----------------------------------------------------------

  const goNext = useCallback(() => {
    if (carouselState.value !== CarouselState.IDLE || dataLength === 0) return;
    const next = currentRenderPage.value + 1;
    if (next < offsets.length) {
      currentRenderPage.value = next;
      scrollToRenderIndex(next);
    }
  }, [scrollToRenderIndex, offsets.length, dataLength]);

  const goPrev = useCallback(() => {
    if (carouselState.value !== CarouselState.IDLE || dataLength === 0) return;
    const prev = currentRenderPage.value - 1;
    if (prev >= 0) {
      currentRenderPage.value = prev;
      scrollToRenderIndex(prev);
    }
  }, [scrollToRenderIndex]);

  const snapToItem = useCallback(
    (index: number, animated = true) => {
      if (dataLength === 0) return;
      if (index < 0 || index >= dataLength) {
        console.error(`Index not valid ${index}`);
        return;
      }
      const renderIndex = loop ? index + additionalPagesPerSide : index;
      const clamped = Math.max(0, Math.min(renderIndex, offsets.length - 1));
      currentRenderPage.value = clamped;
      currentLogicalPage.value = index;
      scrollToRenderIndex(clamped, animated);
    },
    [loop, additionalPagesPerSide, offsets.length, scrollToRenderIndex, dataLength],
  );

  // ---- scroll handler (UI thread worklet) ------------------------------------

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        animatedScroll.value = event.contentOffset.x;

        // During a loop jump, detect when the scroll arrives at the
        // destination and transition back to IDLE.
        if (carouselState.value === CarouselState.LOOP_JUMP && jumpDestination.value !== -1) {
          const nearest = findNearestPage(event.contentOffset.x, offsets);
          if (nearest === jumpDestination.value) {
            freeze.value = false;
            carouselState.value = CarouselState.IDLE;
            jumpDestination.value = -1;
            // A loop jump can arrive while autoplayPaused is still true
            // (e.g. the user dragged onto a cloned boundary page, which
            // set it via onBeginDrag). Release it here so autoplay isn't
            // stuck paused forever with no further drag to reset it.
            scheduleOnRN(setAutoplayPaused, false);
          }
        }
      },

      onBeginDrag: () => {
        // User gesture always wins. Cancel any in-flight loop jump so the
        // carousel doesn't fight the user's drag.
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
        // scrolls (goNext / goPrev / snapToItem). Loop jumps are instant
        // scrolls that are resolved via onScroll instead.
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
          const boundaryTarget = getLoopBoundaryTarget(renderPage, dataLength, additionalPagesPerSide);
          if (boundaryTarget !== -1) {
            // Jump instantly to the matching real page. On Android, freeze
            // animations during the jump to prevent a visual flash from
            // the clones.
            carouselState.value = CarouselState.LOOP_JUMP;
            jumpDestination.value = boundaryTarget;
            freeze.value = Platform.OS === 'android';
            animatedScroll.value = offsets[boundaryTarget];
            scrollTo(animatedRef, offsets[boundaryTarget], 0, false);

            currentRenderPage.value = boundaryTarget;
            currentLogicalPage.value = getLogicalPage(boundaryTarget, dataLength, additionalPagesPerSide, loop);
            scheduleOnRN(onPageChange, currentLogicalPage.value);
            return;
          }
        }

        // Normal page change — no loop boundary involved.
        carouselState.value = CarouselState.IDLE;
        currentRenderPage.value = renderPage;
        currentLogicalPage.value = getLogicalPage(renderPage, dataLength, additionalPagesPerSide, loop);
        scheduleOnRN(onPageChange, currentLogicalPage.value);
        // Autoplay only resumes once momentum fully settles.
        scheduleOnRN(setAutoplayPaused, false);
      },
    },
    [offsets, loop, dataLength, additionalPagesPerSide, onPageChange, animatedRef],
  );

  return {
    animatedRef,
    currentRenderPage,
    currentLogicalPage,
    animatedScroll,
    carouselState,
    freeze,
    autoplayPaused,
    scrollHandler,
    goNext,
    goPrev,
    snapToItem,
    scrollToRenderIndex,
  };
}
