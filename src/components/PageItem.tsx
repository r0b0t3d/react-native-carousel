/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { CarouselData } from '../types';

type Props = {
  item: CarouselData;
  offset: number;
  renderImage?: any;
  renderOverlay?: any;
  animatedValue: Animated.SharedValue<number>;
  animation?: 'parallax';
  freeze: Animated.SharedValue<boolean>;
  itemWidth: number;
  inactiveOpacity: number;
  inactiveScale: number;
  containerStyle: StyleProp<ViewStyle>;
};

export default function PageItem({
  item,
  offset,
  renderImage,
  renderOverlay,
  animatedValue,
  animation,
  freeze,
  itemWidth,
  inactiveOpacity,
  inactiveScale,
  containerStyle,
}: Props) {
  // @ts-ignore
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [offset - itemWidth, offset, offset + itemWidth];
    const scaleOutputRange = freeze.value
      ? [1, 1, 1]
      : [inactiveScale, 1, inactiveScale];
    const opacityOutputRange = freeze.value
      ? [1, 1, 1]
      : [inactiveOpacity, 1, inactiveOpacity];
    const parallaxOutputRange = freeze.value
      ? [0, 0, 0]
      : [-itemWidth / 2, 0, itemWidth / 4];

    const transform: ViewStyle['transform'] = [
      {
        scale: interpolate(animatedValue.value, inputRange, scaleOutputRange),
      },
    ];
    if (animation === 'parallax') {
      transform.push({
        translateX: interpolate(
          animatedValue.value,
          inputRange,
          parallaxOutputRange
        ),
      });
    }
    return {
      opacity: interpolate(animatedValue.value, inputRange, opacityOutputRange),
      transform,
    };
  }, [inactiveScale, inactiveOpacity, animation, itemWidth, offset]);

  function renderContent() {
    if (renderImage) {
      renderImage(item);
    }
    return (
      <Image
        source={item.source!}
        style={{
          ...StyleSheet.absoluteFillObject,
          height: undefined,
          width: undefined,
        }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      collapsable={false}
      style={[
        {
          width: itemWidth,
          overflow: 'hidden',
        },
        containerStyle,
      ]}
    >
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {renderContent()}
      </Animated.View>
      {renderOverlay && (
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {renderOverlay(item)}
        </View>
      )}
    </View>
  );
}
