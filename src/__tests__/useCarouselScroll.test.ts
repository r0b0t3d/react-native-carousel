import { act, renderHook } from '@testing-library/react-native';
import {
  CarouselState,
  useCarouselScroll,
} from '../components/useCarouselScroll';

// `useAnimatedScrollHandler`'s real (unmocked-in-types) return type is an
// opaque callable that doesn't expose these handler names — but our mock
// (and the real runtime object) does. Cast to the shape we actually use.
type ScrollHandler = {
  onScroll: (event: { contentOffset: { x: number } }) => void;
  onBeginDrag: () => void;
  onEndDrag: () => void;
  onMomentumEnd: (event: { contentOffset: { x: number } }) => void;
};

function handlersOf(result: {
  current: ReturnType<typeof useCarouselScroll>;
}): ScrollHandler {
  return result.current.scrollHandler as unknown as ScrollHandler;
}

// offsets/render-index math for a loop carousel with dataLength=3,
// additionalPagesPerSide=1 (itemWidth=100):
//   render 0        -> clone of data[2] (head)
//   render 1..3     -> data[0], data[1], data[2]
//   render 4        -> clone of data[0] (tail)
const LOOP_OFFSETS = [0, 100, 200, 300, 400];

describe('useCarouselScroll — loop boundary jump', () => {
  test('drag onto the head clone jumps, then autoplayPaused resolves false and state returns to IDLE on arrival', async () => {
    const onPageChange = jest.fn();
    const { result } = await renderHook(() =>
      useCarouselScroll({
        dataLength: 3,
        loop: true,
        additionalPagesPerSide: 1,
        offsets: LOOP_OFFSETS,
        onPageChange,
      })
    );

    // User starts dragging.
    await act(() => {
      handlersOf(result).onBeginDrag();
    });
    expect(result.current.autoplayPaused).toBe(true);

    // Drag settles on the head clone (render index 0) — triggers a loop jump.
    await act(() => {
      handlersOf(result).onMomentumEnd({
        contentOffset: { x: 0 },
      });
    });
    expect(result.current.carouselState.value).toBe(CarouselState.LOOP_JUMP);
    expect(result.current.currentRenderPage.value).toBe(3);
    expect(result.current.currentLogicalPage.value).toBe(2);
    expect(onPageChange).toHaveBeenCalledWith(2);
    // Not released yet — arrival hasn't happened.
    expect(result.current.autoplayPaused).toBe(true);

    // Scroll arrives at the jump destination (render index 3, offset 300).
    await act(() => {
      handlersOf(result).onScroll({
        contentOffset: { x: 300 },
      });
    });
    expect(result.current.carouselState.value).toBe(CarouselState.IDLE);
    expect(result.current.autoplayPaused).toBe(false);
  });

  test('intermediate onScroll events before arrival do not release autoplayPaused', async () => {
    const onPageChange = jest.fn();
    const { result } = await renderHook(() =>
      useCarouselScroll({
        dataLength: 3,
        loop: true,
        additionalPagesPerSide: 1,
        offsets: LOOP_OFFSETS,
        onPageChange,
      })
    );

    await act(() => {
      handlersOf(result).onBeginDrag();
    });
    await act(() => {
      handlersOf(result).onMomentumEnd({ contentOffset: { x: 0 } });
    });

    // Scroll is still in flight, hasn't reached the destination (300) yet.
    await act(() => {
      handlersOf(result).onScroll({ contentOffset: { x: 150 } });
    });
    expect(result.current.carouselState.value).toBe(CarouselState.LOOP_JUMP);
    expect(result.current.autoplayPaused).toBe(true);
  });
});

describe('useCarouselScroll — programmatic navigation', () => {
  // Non-loop, so render index === logical index and offsets map 1:1.
  const OFFSETS = [0, 100, 200, 300, 400];

  async function setup(onPageChange = jest.fn()) {
    const hook = await renderHook(() =>
      useCarouselScroll({
        dataLength: 5,
        loop: false,
        additionalPagesPerSide: 2,
        offsets: OFFSETS,
        onPageChange,
      })
    );
    return { ...hook, onPageChange };
  }

  test('goNext moves currentRenderPage immediately but only fires onPageChange once momentum settles', async () => {
    const { result, onPageChange } = await setup();

    await act(() => {
      result.current.goNext();
    });
    expect(result.current.currentRenderPage.value).toBe(1);
    expect(onPageChange).not.toHaveBeenCalled();

    await act(() => {
      handlersOf(result).onMomentumEnd({
        contentOffset: { x: 100 },
      });
    });
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  test('goPrev moves currentRenderPage immediately but only fires onPageChange once momentum settles', async () => {
    const { result, onPageChange } = await setup();

    await act(() => {
      result.current.goNext();
    });
    await act(() => {
      handlersOf(result).onMomentumEnd({
        contentOffset: { x: 100 },
      });
    });
    onPageChange.mockClear();

    await act(() => {
      result.current.goPrev();
    });
    expect(result.current.currentRenderPage.value).toBe(0);
    expect(onPageChange).not.toHaveBeenCalled();

    await act(() => {
      handlersOf(result).onMomentumEnd({
        contentOffset: { x: 0 },
      });
    });
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  test('snapToItem sets render/logical page immediately but only fires onPageChange once momentum settles', async () => {
    const { result, onPageChange } = await setup();

    await act(() => {
      result.current.snapToItem(3, false);
    });
    expect(result.current.currentRenderPage.value).toBe(3);
    expect(result.current.currentLogicalPage.value).toBe(3);
    expect(onPageChange).not.toHaveBeenCalled();

    await act(() => {
      handlersOf(result).onMomentumEnd({
        contentOffset: { x: 300 },
      });
    });
    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
