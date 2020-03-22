/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { useInterval } from '@r0b0t3d/react-native-hooks';
import Indicator from './indicator';
import { CarouselProps, CarouselData } from './types';

const { width: wWidth } = Dimensions.get('window');

let Animated: any = null;
try {
  //@ts-ignore
  Animated = require('react-native-reanimated');
} catch (error) {
  Animated = require('react-native').Animated;
}

export default function Carousel({
  data,
  loop = false,
  autoPlay = false,
  duration = 1000,
  indicatorContainerStyle,
  renderIndicator,
  renderOverlay,
}: CarouselProps) {
  const [currentPage, setCurrentPage] = useState(loop ? 1 : 0);
  const animatedScroll = new Animated.Value(0);
  const [isDragging, setDragging] = useState(false);

  const scrollViewRef = useRef<any>();

  useEffect(() => {
    goToPage(currentPage, false);
  }, []);

  useEffect(() => {
    if (!loop) return;
    if (currentPage === data.length + 1) {
      goToPage(1, false);
      setCurrentPage(1);
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
    setCurrentPage(page);
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
      extrapolate: 'clamp',
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: 'black' }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => setDragging(true)}
        onScrollEndDrag={() => setDragging(false)}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  x: animatedScroll,
                },
              },
            },
          ],
          { useNativeDriver: true },
        )}
        onMomentumScrollEnd={onScrollEnd}
      >
        {loop && <PageItem item={data[data.length - 1]} translateX={getInterpolate(0)} renderOverlay={renderOverlay} />}
        {data.map((item, i) => (
          <PageItem
            key={item.id}
            item={item}
            translateX={getInterpolate(i + (loop ? 1 : 0))}
            renderOverlay={renderOverlay}
          />
        ))}
        {loop && <PageItem item={data[0]} translateX={getInterpolate(data.length + 1)} renderOverlay={renderOverlay} />}
      </Animated.ScrollView>
      <Indicator
        totalPage={data.length}
        currentPage={currentPage}
        style={indicatorContainerStyle}
        renderIndicator={renderIndicator}
      />
    </View>
  );
}

function PageItem({ item, translateX, renderOverlay }: { item: CarouselData; translateX: any; renderOverlay?: any }) {
  const animateStyle = {
    transform: [{ translateX }],
  };

  return (
    <View collapsable={false} style={{ width: wWidth, overflow: 'hidden', backgroundColor: 'black' }}>
      <Animated.Image
        source={{ uri: item.url }}
        style={[{ flex: 1, backgroundColor: 'red' }, animateStyle]}
        resizeMode="cover"
      />
      {renderOverlay && (
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {renderOverlay({ item })}
        </View>
      )}
    </View>
  );
}
