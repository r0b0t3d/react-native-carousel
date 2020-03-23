/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, StyleSheet, Image } from 'react-native';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import Animated, { block, set, call, Value } from 'react-native-reanimated';
import { CarouselProps, CarouselData } from './types';
import Indicator from './indicator';

const { width: wWidth } = Dimensions.get('screen');

function useAnimatedValue(initial): Animated.Value<any> {
  const value = useRef(new Value(initial));
  return value.current;
}

export default function Carousel({
  style,
  data,
  loop = false,
  autoPlay = false,
  duration = 1000,
  indicatorContainerStyle,
  renderIndicator,
  renderImage,
  renderOverlay,
}: CarouselProps) {
  const [currentPage, setCurrentPage] = useState(loop ? 1 : 0);
  const animatedScroll = useAnimatedValue(0);
  const [isDragging, setDragging] = useState(false);

  const scrollViewRef = useRef<any>(null);
  const currentOffset = useRef(0);

  useEffect(() => {
    requestAnimationFrame(() => {
      goToPage(currentPage, false);
    });
  }, []);

  useEffect(() => {
    if (!loop) return;
    if (currentPage === data.length + 1) {
      requestAnimationFrame(() => {
        goToPage(1, false);
        setCurrentPage(1);
      });
    }
    if (currentPage === 0) {
      goToPage(data.length, false);
      setCurrentPage(data.length);
    }
  }, [currentPage]);

  const goNext = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage]);

  useInterval(
    () => {
      goNext();
    },
    !autoPlay || isDragging ? -1 : duration,
  );

  function goToPage(page: number, animated = true) {
    const to = page * wWidth;
    scrollViewRef.current.getNode().scrollTo({ x: to, y: 0, animated });
  }

  function onScrollEnd(e) {
    const { contentOffset } = e.nativeEvent;
    const viewSize = e.nativeEvent.layoutMeasurement;

    // Divide the horizontal offset by the width of the view to see which page is visible
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    if (pageNum >= 0 && pageNum !== currentPage) {
      setCurrentPage(pageNum);
    }
  }

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

  const indicatorIndex = getCurrentPage();

  return (
    <View style={[style]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: 'black' }}
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
        onScrollEndDrag={() => setDragging(false)}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  x: x =>
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
      <Indicator
        totalPage={data.length}
        currentPage={indicatorIndex}
        style={indicatorContainerStyle}
        renderIndicator={renderIndicator}
      />
    </View>
  );
}

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
