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
import type { CarouselProps, CarouselRef } from '../types';
import PageItem from './PageItem';
import { findNearestPage, generateOffsets } from '../utils';
import type { CarouselData } from '../types';

const { width: wWidth } = Dimensions.get('screen');

function Carousel(
  {
    style,
    data,
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
  }: CarouselProps,
  ref: Ref<CarouselRef>
) {
  const currentPage = useSharedValue(loop ? additionalPagesPerSide : 0);
  const [isDragging, setDragging] = useState(false);
  const animatedScroll = useSharedValue(currentPage.value * sliderWidth);
  const freeze = useSharedValue(loop);
  const expectedPosition = useRef(-1);
  const horizontalPadding = useMemo(() => {
    const padding = (sliderWidth - itemWidth) / 2;
    return firstItemAlignment === 'center' || loop ? padding : spaceHeadTail;
  }, [sliderWidth, itemWidth, firstItemAlignment, loop, spaceHeadTail]);
  const pageMapper = useRef<any>({})

  const scrollViewRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    next: goNext,
    prev: goPrev,
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
        pageMapper.current[i] = (data.length - additionalPagesPerSide + i) % data.length;
      }
      return newItems;
    } else {
      for (let i = 0; i < data.length; i++) {
        pageMapper.current[i] = i;
      }
      return data;
    }
  }, [data, loop]);  

  const getActualPage = useCallback(
    (page: number) => {
      return pageMapper.current[page]
    },
    []
  ); 

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
        jumpTo((additionalPagesPerSide * 2) - 1);
      } else if (page === 0) {
        jumpTo(pageItems.length - (additionalPagesPerSide * 2));
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
    if (currentPage.value !== 0) {
      setTimeout(() => {
        handleScrollTo(currentPage.value, false);
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

  function renderPage(item: CarouselData, i: number) {
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
        key={`${item.id}-${i}`}
        containerStyle={containerStyle}
        item={item}
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

export default forwardRef(Carousel);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
