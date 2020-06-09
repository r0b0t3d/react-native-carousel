/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, Ref } from 'react';
import { View, Dimensions, StyleSheet, Image, Platform } from 'react-native';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import Animated, { block, set, call, Value, debug, interpolate } from 'react-native-reanimated';
import Indicator from './indicator';
import { CarouselProps, Carousel, CarouselData } from './types';

const { width: wWidth } = Dimensions.get('screen');

function useAnimatedValue(initial): Animated.Value<any> {
  const value = useRef(new Value(initial));
  return value.current;
}

function Carousel(
  {
    style,
    data,
    loop = false,
    autoPlay = false,
    duration = 1000,
    useIndicator = true,
    indicatorContainerStyle,
    renderIndicator,
    renderImage,
    renderOverlay,
    onPageChange,
  }: CarouselProps,
  ref: Ref<Carousel>,
) {
  const animatedScroll = useAnimatedValue(0);
  const [currentPage, setCurrentPage] = useState(loop ? 1 : 0);
  const [isDragging, setDragging] = useState(false);

  const scrollViewRef = useRef<any>(null);
  const currentOffset = useRef(0);

  useImperativeHandle(ref, () => ({
    next: goNext,
    prev: goPrev,
  }));

  useEffect(() => {
    handleScrollTo(currentPage, false);
  }, []);

  useEffect(() => {
    if (onPageChange) {
      const index = getCurrentPage();
      onPageChange(data[index], index);
    }
    if (!loop) return;
    if (currentPage === data.length + 1) {
      setTimeout(() => {
        animatedScroll.setValue(1 * wWidth);
        handleScrollTo(1, false);
        setCurrentPage(1);
      }, 200);
    } else if (currentPage === 0) {
      setTimeout(() => {
        animatedScroll.setValue(data.length * wWidth);
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
            animatedScroll.setValue(1 * viewSize.width);
            handleScrollTo(1, false);
            setCurrentPage(1);
          } else if (pageNum === 0) {
            animatedScroll.setValue(data.length * viewSize.width);
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

  function getInterpolate(i: number) {
    const inputRange = [(i - 1) * wWidth, i * wWidth, (i + 1) * wWidth];
    const outputRange = i === 0 ? [0, 0, 150] : [-300, 0, 150];
    return animatedScroll.interpolate({
      inputRange,
      outputRange,
      extrapolate: Animated.Extrapolate.CLAMP,
    });
  }

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
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          const pageNum = Math.floor(currentOffset.current / wWidth);
          if (pageNum >= 0 && pageNum !== currentPage) {
            setCurrentPage(pageNum);
          }
          setDragging(true);
        }}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  x: (x: any) =>
                    block([
                      set(animatedScroll, x),
                      call(
                        [x],
                        // eslint-disable-next-line no-return-assign
                        ([offsetX]) => (currentOffset.current = offsetX),
                      ),
                    ]),
                },
              },
            },
          ],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={onScrollEnd}
      >
        {loop && (
          <PageItem
            item={data[data.length - 1]}
            translateX={getInterpolate(0)}
            renderImage={renderImage}
            renderOverlay={renderOverlay}
          />
        )}
        {data.map((item, i) => (
          <PageItem
            key={item.id}
            item={item}
            translateX={getInterpolate(i + (loop ? 1 : 0))}
            renderImage={renderImage}
            renderOverlay={renderOverlay}
          />
        ))}
        {loop && (
          <PageItem
            item={data[0]}
            translateX={getInterpolate(data.length + 1)}
            renderImage={renderImage}
            renderOverlay={renderOverlay}
          />
        )}
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

function PageItem({
  item,
  translateX,
  renderImage,
  renderOverlay,
}: {
  item: CarouselData;
  translateX: any;
  renderImage?: any;
  renderOverlay?: any;
}) {
  const animateStyle = {
    transform: [{ translateX }],
  };

  return (
    <View
      collapsable={false}
      style={{
        width: wWidth,
        overflow: 'hidden',
        backgroundColor: 'black',
      }}
    >
      <Animated.View style={[{ flex: 1 }, animateStyle]}>
        {renderImage ? (
          renderImage(item)
        ) : (
          <Image
            source={item.source!}
            style={{
              ...StyleSheet.absoluteFillObject,
              height: undefined,
              width: undefined,
            }}
            resizeMode="cover"
          />
        )}
      </Animated.View>
      {renderOverlay && (
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {renderOverlay(item)}
        </View>
      )}
    </View>
  );
}
