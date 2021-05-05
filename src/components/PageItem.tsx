/* eslint-disable @typescript-eslint/ban-ts-comment */
import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { CarouselProps } from '../types';

type Props<TData> = {
  item: TData;
  index: number;
  offset: number;
  renderItem: CarouselProps['renderItem'];
  animatedValue: Animated.SharedValue<number>;
  animation?: 'parallax';
  freeze: Animated.SharedValue<boolean>;
  itemWidth: number;
  inactiveOpacity: number;
  inactiveScale: number;
  containerStyle: StyleProp<ViewStyle>;
};

export default function PageItem<TData = any>({
  item,
  index,
  offset,
  renderItem,
  animatedValue,
  animation,
  freeze,
  itemWidth,
  inactiveOpacity,
  inactiveScale,
  containerStyle,
}: Props<TData>) {
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
    if (renderItem) {
      return renderItem({ item, index }, { scrollPosition: animatedValue, offset });
    }
    if (typeof item === 'object' && (item as any).source) {
      return (
        <Image
          source={(item as any).source}
          style={{
            ...StyleSheet.absoluteFillObject,
            height: undefined,
            width: undefined,
          }}
          resizeMode="cover"
        />
      );
    }
    console.error('You need implement renderItem');
    return null;
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
    </View>
  );
}
