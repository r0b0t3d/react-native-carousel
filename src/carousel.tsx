/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, Ref, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import Animated, { block, set, call, Value, useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import Indicator from './indicator';
import { CarouselProps, CarouselRef } from './types';
import PageItem from './page-item';

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
    indicatorContainerStyle,
    renderIndicator,
    renderImage,
    renderOverlay,
    onPageChange,
  }: CarouselProps,
  ref: Ref<CarouselRef>,
) {
  const animatedScroll = useSharedValue(0);

  const [currentPage, setCurrentPage] = useState(loop ? 1 : 0);
  const [isDragging, setDragging] = useState(false);
  const [freeze, setFreeze] = useState(false);

  const scrollViewRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    next: goNext,
    prev: goPrev,
  }));

  useEffect(() => {
    handleScrollTo(currentPage, false);
  }, []);
  
  const pageItems = useMemo(() => {
    const items = [
      ...(loop ? [data[data.length - 1]] : []),
      ...data,
      ...(loop ? [data[0]] : []),
    ]
    return items;
  }, [data]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      animatedScroll.value = event.contentOffset.x;
    },
    onBeginDrag: (e) => {
      const pageNum = Math.floor(animatedScroll.value / wWidth);
      // setDragging(true);const pageNum = Math.floor(animatedScroll.value / wWidth);
      if (pageNum >= 0 && pageNum !== currentPage) {
        setCurrentPage(pageNum);
      }
      setDragging(true);
    },
    onEndDrag: (e) => {
      // setDragging(false);
    },
  })

  useEffect(() => {
    if (onPageChange) {
      const index = getCurrentPage();
      onPageChange(data[index], index);
    }
    if (!loop) return;
    if (currentPage === data.length + 1) {
      setTimeout(() => {
        animatedScroll.value = 1 * wWidth;
        handleScrollTo(1, false);
        setCurrentPage(1);
      }, 200);
    } else if (currentPage === 0) {
      setTimeout(() => {
        animatedScroll.value = data.length * wWidth;
        handleScrollTo(data.length, false);
        setCurrentPage(data.length);
      }, 200);
    }
  }, [currentPage]);

  const goNext = () =>
    setCurrentPage(current => {
      const next = current + 1;
      handleScrollTo(next);
      return next;
    });

  const goPrev = () =>
    setCurrentPage(current => {
      const prev = current - 1;
      handleScrollTo(prev);
      return prev;
    });

  useInterval(
    () => {
      goNext();
    },
    !autoPlay || isDragging ? -1 : duration,
  );

  function handleScrollTo(page: number, animated = true) {
    const to = page * wWidth;
    if (getRef()) {
      getRef().scrollTo({ x: to, y: 0, animated });
    }
  }

  const getRef = () => {
    if (!scrollViewRef.current) return;
    if (scrollViewRef.current.scrollTo) {
      return scrollViewRef.current;
    }
    return scrollViewRef.current.getNode();
  }

  const onScrollEnd = useCallback(
    e => {
      const { contentOffset } = e.nativeEvent;
      const viewSize = e.nativeEvent.layoutMeasurement;
      // Divide the horizontal offset by the width of the view to see which page is visible
      const pageNum = Math.floor(contentOffset.x / viewSize.width);
      // Note: on iOS, scroll end event is triggered when calling `scrollTo` function
      if (isDragging && pageNum >= 0 && pageNum !== currentPage) {
        if (loop) {
          if (pageNum === data.length + 1) {
            animatedScroll.value = 1 * viewSize.width;
            handleScrollTo(1, false);
            setCurrentPage(1);
          } else if (pageNum === 0) {
            animatedScroll.value = data.length * viewSize.width;
            handleScrollTo(data.length, false);
            setCurrentPage(data.length);
          } else {
            setCurrentPage(pageNum);  
          }
        } else {
          setCurrentPage(pageNum);
        }
      }
      setDragging(false);
    },
    [currentPage, isDragging],
  );

  const getCurrentPage = () => {
    if (loop) {
      if (currentPage > data.length) return 0;
      if (currentPage === 0) return data.length - 1;
      return currentPage - 1;
    }
    return currentPage;
  };

  return (
    <View style={[style]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        scrollEventThrottle={16}
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          const pageNum = Math.floor(animatedScroll.value / wWidth);
          if (pageNum >= 0 && pageNum !== currentPage) {
            setCurrentPage(pageNum);
          }
          setDragging(true);
        }}
        onScroll={scrollHandler}
        onMomentumScrollEnd={onScrollEnd}
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
          currentPage={getCurrentPage()}
          style={indicatorContainerStyle}
          renderIndicator={renderIndicator}
        />
      )}
    </View>
  );
}

export default forwardRef(Carousel);
