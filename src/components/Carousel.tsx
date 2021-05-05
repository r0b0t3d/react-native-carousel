import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  Ref,
  useMemo,
} from 'react';
import { View, Dimensions, StyleSheet, Platform } from 'react-native';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
  useAnimatedProps,
} from 'react-native-reanimated';
import type { CarouselProps, CarouselHandles } from '../types';
import PageItem from './PageItem';
import { findNearestPage, generateOffsets } from '../utils';

const { width: wWidth } = Dimensions.get('screen');

function Carousel<TData>(
  {
    style,
    data,
    initialPage = 0,
    loop = false,
    additionalPagesPerSide = 2,
    autoPlay = false,
    duration = 1000,
    animation,
    sliderWidth = wWidth,
    itemWidth = wWidth,
    firstItemAlignment = 'center',
    inactiveOpacity = 1,
    inactiveScale = 1,
    spaceBetween = 0,
    spaceHeadTail = 0,
    renderItem,
    onPageChange,
    animatedPage = useSharedValue(0),
    keyExtractor,
  }: CarouselProps<TData>,
  ref: Ref<CarouselHandles>
) {
  const currentPage = useSharedValue(0);
  const animatedScroll = useSharedValue(currentPage.value * sliderWidth);
  const freeze = useSharedValue(loop);
  const [isDragging, setDragging] = useState(false);
  const expectedPosition = useRef(-1);
  const pageMapper = useRef<Record<number, number>>({});

  const horizontalPadding = useMemo(() => {
    const padding = (sliderWidth - itemWidth) / 2;
    return firstItemAlignment === 'center' || loop ? padding : spaceHeadTail;
  }, [sliderWidth, itemWidth, firstItemAlignment, loop, spaceHeadTail]);

  const scrollViewRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    goNext,
    goPrev,
    snapToItem,
  }));

  const offsets = useMemo(() => {
    return generateOffsets({
      sliderWidth,
      itemWidth,
      itemCount: data.length + (loop ? additionalPagesPerSide * 2 : 0),
      horizontalPadding,
    });
  }, [sliderWidth, itemWidth, data, horizontalPadding]);

  const pageItems = useMemo(() => {
    if (loop) {
      const headItems = data.slice(
        data.length - additionalPagesPerSide,
        data.length
      );
      const tailItems = data.slice(0, additionalPagesPerSide);
      const newItems = [...headItems, ...data, ...tailItems];
      for (let i = 0; i < newItems.length; i++) {
        pageMapper.current[i] =
          (data.length - additionalPagesPerSide + i) % data.length;
      }
      return newItems;
    } else {
      for (let i = 0; i < data.length; i++) {
        pageMapper.current[i] = i;
      }
      return data;
    }
  }, [data, loop]);

  const getActualPage = useCallback((page: number) => {
    return pageMapper.current[page];
  }, []);

  const getRef = useCallback(() => {
    if (!scrollViewRef.current) return;
    if (scrollViewRef.current.scrollTo) {
      return scrollViewRef.current;
    }
    return scrollViewRef.current.getNode();
  }, []);

  const handleScrollTo = useCallback(
    (page: number, animated = true) => {
      if (getRef()) {
        getRef().scrollTo({ x: offsets[page], y: 0, animated });
      }
    },
    [getRef, offsets]
  );

  const jumpTo = useCallback(
    (page: number, delay = 200) => {
      expectedPosition.current = page;
      if (Platform.OS === 'android') {
        freeze.value = true;
      }
      setTimeout(() => {
        animatedScroll.value = offsets[page];
        handleScrollTo(page, false);
      }, delay);
    },
    [handleScrollTo, animatedScroll, freeze]
  );

  const goNext = useCallback(() => {
    const next = currentPage.value + 1;
    handleScrollTo(next);
  }, [handleScrollTo]);

  const goPrev = useCallback(() => {
    const prev = currentPage.value - 1;
    handleScrollTo(prev);
  }, [handleScrollTo]);

  const snapToItem = useCallback(
    (index: number, animated = true) => {
      if (index < 0 || index >= data.length) {
        console.error(`Index not valid ${index}`);
        return;
      }
      let pageIndex = index;
      if (loop) {
        const indices: number[] = Object.keys(pageMapper.current)
          .filter((idx) => pageMapper.current[Number(idx)] === index)
          .map((idx) => Number(idx));
        const toIndex = findNearestPage(currentPage.value, indices, 10);
        pageIndex = indices[toIndex];
      }
      handleScrollTo(pageIndex, animated);
    },
    [handleScrollTo]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const actualPage = getActualPage(page);
      animatedPage.value = actualPage;
      if (onPageChange) {
        onPageChange(actualPage);
      }
      currentPage.value = page;
      if (!loop) return;
      if (page === pageItems.length - 1) {
        jumpTo(additionalPagesPerSide * 2 - 1);
      } else if (page === 0) {
        jumpTo(pageItems.length - additionalPagesPerSide * 2);
      }
    },
    [onPageChange, loop, getActualPage, jumpTo, pageItems]
  );

  const refreshPage = useCallback(
    (offset) => {
      'worklet';
      const pageNum = findNearestPage(offset, offsets, 20);
      if (pageNum === -1) {
        return;
      }
      if (pageNum !== currentPage.value) {
        if (expectedPosition.current === pageNum) {
          freeze.value = false;
        }
        runOnJS(handlePageChange)(pageNum);
      }
    },
    [isDragging, offsets, handlePageChange]
  );

  useInterval(
    () => {
      goNext();
    },
    !autoPlay || !loop || isDragging ? -1 : duration
  );

  useEffect(() => {
    if (initialPage < 0 || initialPage >= data.length) {
      console.error(`Invalid initialPage ${initialPage}`);
      return;
    }
    let pageIndex = initialPage;
    if (loop) {
      pageIndex = initialPage + additionalPagesPerSide;
    }
    if (currentPage.value !== pageIndex) {
      setTimeout(() => {
        handleScrollTo(pageIndex, false);
        freeze.value = false;
      });
    }
  }, []);

  const beginDrag = useCallback(() => {
    setDragging(true);
  }, []);

  const endDrag = useCallback(() => {
    setTimeout(() => setDragging(false), 200);
  }, []);

  const getItemKey = useCallback(
    (item: TData, index: number): string => {
      if (keyExtractor) {
        return `${keyExtractor(item, index)}-${index}`;
      }
      if ((item as any).id) {
        return `${(item as any).id}-${index}`;
      }
      console.error('You need implement keyExtractor');
      return '';
    },
    [keyExtractor]
  );

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        animatedScroll.value = event.contentOffset.x;
        refreshPage(animatedScroll.value);
      },
      onBeginDrag: (_e) => {
        runOnJS(beginDrag)();
      },
      onEndDrag: (_e) => {
        runOnJS(endDrag)();
      },
    },
    [beginDrag, endDrag, refreshPage]
  );

  const scrollViewProps = useAnimatedProps(() => {
    return {
      scrollEnabled: !freeze.value,
    };
  }, []);

  function renderPage(item: TData, i: number) {
    const containerStyle = useMemo(() => {
      if (firstItemAlignment === 'start') {
        return {
          paddingLeft: i === 0 ? 0 : spaceBetween / 2,
          paddingRight: i === data.length - 1 ? 0 : spaceBetween / 2,
        };
      }
      return {
        paddingLeft: spaceBetween / 2,
        paddingRight: spaceBetween / 2,
      };
    }, [spaceBetween, firstItemAlignment]);

    return (
      <PageItem
        key={getItemKey(item, i)}
        containerStyle={containerStyle}
        item={item}
        index={i}
        offset={offsets[i]}
        itemWidth={itemWidth}
        animatedValue={animatedScroll}
        animation={animation}
        renderItem={renderItem}
        freeze={freeze}
        inactiveOpacity={inactiveOpacity}
        inactiveScale={inactiveScale}
      />
    );
  }

  return (
    <View style={[style]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.container}
        horizontal
        disableScrollViewPanResponder
        disableIntervalMomentum={false}
        showsHorizontalScrollIndicator={false}
        snapToOffsets={offsets}
        snapToStart
        snapToEnd
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
        }}
        {...{ scrollViewProps }}
      >
        {pageItems.map(renderPage)}
      </Animated.ScrollView>
    </View>
  );
}

const ForwardedCarousel = forwardRef(Carousel) as <T>(
  props: CarouselProps<T> & { ref?: Ref<CarouselHandles> }
) => ReturnType<typeof Carousel>;

export default ForwardedCarousel;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
