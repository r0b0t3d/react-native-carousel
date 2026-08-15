import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import { CarouselState } from './useCarouselScroll';

type UseCarouselAutoplayParams = {
  // autoPlay && loop — autoplay only makes sense with looping enabled.
  enabled: boolean;
  duration: number;
  // True while dragging or a programmatic scroll hasn't settled yet
  // (see useCarouselScroll's autoplayPaused).
  paused: boolean;
  carouselState: SharedValue<CarouselState>;
  goNext: () => void;
};

// Pauses autoplay while the app is backgrounded, while the user is
// dragging, and until momentum settles — mirrors useCarouselScroll's
// state machine without owning it.
export function useCarouselAutoplay({
  enabled,
  duration,
  paused,
  carouselState,
  goNext,
}: UseCarouselAutoplayParams) {
  // Only read on JS thread by the autoplay interval below.
  const appActiveRef = useRef(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appActiveRef.current = state === 'active';
    });
    return () => sub.remove();
  }, []);

  useInterval(
    () => {
      if (carouselState.value === CarouselState.IDLE && appActiveRef.current) {
        goNext();
      }
    },
    !enabled || paused ? -1 : duration,
  );
}
