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
import { View, Dimensions, StyleSheet } from 'react-native';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
  useAnimatedProps,
} from 'react-native-reanimated';
import Indicator from './Indicator';
import type { CarouselProps, CarouselRef } from '../types';
import PageItem from './PageItem';

const { width: wWidth } = Dimensions.get('screen');

function Carousel(
  {
    style,
    data,
    loop = false,
    autoPlay = false,
    duration = 1000,
    useIndicator = true,
    animation,
    sliderWidth = wWidth,
    indicatorContainerStyle,
    renderIndicator,
    renderImage,
    renderOverlay,
    onPageChange,
  }: CarouselProps,
  ref: Ref<CarouselRef>
) {
  const [currentPage, setCurrentPage] = useState(loop ? 1 : 0);
  const [isDragging, setDragging] = useState(false);
  const animatedScroll = useSharedValue(currentPage * sliderWidth);
  const freeze = useSharedValue(true);
  const expectedPosition = useRef(-1);

  const scrollViewRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    next: goNext,
    prev: goPrev,
  }));

  const pageItems = useMemo(() => {
    const items = [
      ...(loop ? [data[data.length - 1]] : []),
      ...data,
      ...(loop ? [data[0]] : []),
    ];
    return items;
  }, [data, loop]);

  const refreshPage = useCallback(
    (e) => {
      const viewSize = e.layoutMeasurement;
      // Divide the horizontal offset by the width of the view to see which page is visible
      const page = e.contentOffset.x / viewSize.width;
      const leftPage = Math.round(page);
      const rightPage = leftPage + 1;
      const diff = 0.2;
      let pageNum = currentPage;
      if (page - leftPage <= diff) {
        pageNum = leftPage;
      } else if (rightPage - page <= diff) {
        pageNum = rightPage;
      }
      if (pageNum !== currentPage) {
        if (expectedPosition.current === pageNum) {
          freeze.value = false;
        }
        setCurrentPage(pageNum);
      }
    },
    [currentPage, isDragging]
  );

  const beginDrag = useCallback(() => {
    setDragging(true);
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
      const to = page * sliderWidth;
      if (getRef()) {
        getRef().scrollTo({ x: to, y: 0, animated });
      }
    },
    [getRef, sliderWidth]
  );

  useEffect(() => {
    setTimeout(() => {
      handleScrollTo(currentPage, false);
      freeze.value = false;
    });
  }, []);

  const jumpTo = useCallback(
    (page: number, delay = 200) => {
      expectedPosition.current = page;
      freeze.value = true;
      setTimeout(() => {
        animatedScroll.value = page * sliderWidth;
        handleScrollTo(page, false);
      }, delay);
    },
    [handleScrollTo, animatedScroll, freeze, sliderWidth]
  );

  const getCurrentPage = useMemo(() => {
    if (loop) {
      if (currentPage > data.length) return 0;
      if (currentPage === 0) return data.length - 1;
      return currentPage - 1;
    }
    return currentPage;
  }, [loop, currentPage, data]);

  useEffect(() => {
    if (onPageChange) {
      const index = getCurrentPage;
      onPageChange(data[index], index);
    }
    if (!loop) return;
    if (currentPage === data.length + 1) {
      jumpTo(1);
    } else if (currentPage === 0) {
      jumpTo(data.length);
    }
  }, [currentPage]);

  const goNext = useCallback(() => {
    const next = currentPage + 1;
    handleScrollTo(next);
  }, [handleScrollTo, currentPage]);

  const goPrev = useCallback(() => {
    const prev = currentPage - 1;
    handleScrollTo(prev);
  }, [handleScrollTo, currentPage]);

  useInterval(
    () => {
      goNext();
    },
    !autoPlay || isDragging ? -1 : duration
  );

  const endDrag = useCallback(() => {
    setTimeout(() => setDragging(false), 200);
  }, []);

  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        animatedScroll.value = event.contentOffset.x;
        runOnJS(refreshPage)(event);
      },
      onBeginDrag: (_e) => {
        runOnJS(beginDrag)();
      },
      onEndDrag: (_e) => {
        runOnJS(endDrag)();
      },
    },
    [beginDrag, endDrag, refreshPage, currentPage]
  );

  const scrollViewProps = useAnimatedProps(() => {
    return {
      scrollEnabled: !freeze.value,
    };
  }, []);

  return (
    <View style={[style]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.container}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScroll={scrollHandler}
        bounces={false}
        {...{ scrollViewProps }}
      >
        {pageItems.map((item, i) => (
          <PageItem
            key={`${item.id}-${i}`}
            item={item}
            index={i}
            animatedValue={animatedScroll}
            animation={animation}
            renderImage={renderImage}
            renderOverlay={renderOverlay}
            freeze={freeze}
          />
        ))}
      </Animated.ScrollView>
      {useIndicator && (
        <Indicator
          totalPage={data.length}
          currentPage={getCurrentPage}
          style={indicatorContainerStyle}
          renderIndicator={renderIndicator}
        />
      )}
    </View>
  );
}

export default forwardRef(Carousel);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
