/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, Ref, useMemo } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { useInterval, useTimeout } from '@r0b0t3d/react-native-hooks';
import Animated, { useSharedValue, useAnimatedScrollHandler, runOnJS, runOnUI } from 'react-native-reanimated';
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
    const items = [...(loop ? [data[data.length - 1]] : []), ...data, ...(loop ? [data[0]] : [])];
    return items;
  }, [data]);

  function beginDrag() {
    const pageNum = Math.floor(animatedScroll.value / wWidth);
    if (pageNum >= 0 && pageNum !== currentPage) {
      setCurrentPage(pageNum);
    }
    setDragging(true);
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      animatedScroll.value = event.contentOffset.x;
    },
    onBeginDrag: e => {
      runOnJS(beginDrag)();
    },
  });

  useEffect(() => {
    if (onPageChange) {
      const index = getCurrentPage();
      onPageChange(data[index], index);
    }
    if (!loop) return;
    if (currentPage === data.length + 1) {
      jumpTo(1);
    } else if (currentPage === 0) {
      jumpTo(data.length);
    }
  }, [currentPage]);

  useTimeout(
    () => {
      setFreeze(false);
    },
    freeze ? 200 : -1,
  );

  function jumpTo(page: number) {
    setFreeze(true);
    setTimeout(
      () => {
        animatedScroll.value = page * wWidth;
        handleScrollTo(page, false);
        setCurrentPage(page);
      },
      Platform.OS === 'android' ? 200 : 0,
    );
  }

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
  };

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
            jumpTo(1);
          } else if (pageNum === 0) {
            jumpTo(data.length);
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
        // onScrollBeginDrag={() => {
        //   const pageNum = Math.floor(animatedScroll.value / wWidth);
        //   if (pageNum >= 0 && pageNum !== currentPage) {
        //     setCurrentPage(pageNum);
        //   }
        //   setDragging(true);
        // }}
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
