/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import type { CarouselProps } from '../types';

type Props<TData> = {
  item: TData;
  index: number;
  offset: number;
  renderItem: CarouselProps['renderItem'];
  animatedValue: SharedValue<number>;
  animation?: 'parallax';
  freeze: SharedValue<boolean>;
  itemWidth: number;
  inactiveOpacity: number;
  inactiveScale: number;
  containerStyle: StyleProp<ViewStyle>;
  onPress?: () => void;
};

// Pull the inline renderContent() into a named component so React
// preserves its identity across renders and doesn't remount internal
// state (images, nested components, etc.).
function PageContent<TData>({
  renderItem,
  item,
  index,
  animatedValue,
  offset,
}: {
  renderItem: CarouselProps['renderItem'];
  item: TData;
  index: number;
  animatedValue: SharedValue<number>;
  offset: number;
}) {
  if (renderItem) {
    return renderItem(
      { item, index },
      { scrollPosition: animatedValue, offset }
    );
  }
  if (typeof item === 'object' && (item as any).source) {
    return (
      <Image
        source={(item as any).source}
        style={[STYLES.image, StyleSheet.absoluteFill]}
        resizeMode="cover"
      />
    );
  }
  return null;
}

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
  onPress,
}: Props<TData>) {
  const scale = useDerivedValue(() => {
    const inputRange = [offset - itemWidth, offset, offset + itemWidth];
    const scaleOutputRange = [inactiveScale, 1, inactiveScale];
    return interpolate(animatedValue.value, inputRange, scaleOutputRange);
  }, []);

  const translateX = useDerivedValue(() => {
    const inputRange = [offset - itemWidth, offset, offset + itemWidth];
    const parallaxOutputRange = freeze.value
      ? [0, 0, 0]
      : [-itemWidth / 2, 0, itemWidth / 4];

    return interpolate(animatedValue.value, inputRange, parallaxOutputRange);
  }, []);

  const opacity = useDerivedValue(() => {
    const inputRange = [offset - itemWidth, offset, offset + itemWidth];
    const opacityOutputRange = freeze.value
      ? [1, 1, 1]
      : [inactiveOpacity, 1, inactiveOpacity];
    return interpolate(animatedValue.value, inputRange, opacityOutputRange);
  }, []);
  // @ts-ignore
  const animatedStyle = useAnimatedStyle(() => {
    const transform: any = [
      {
        scale: scale.value,
      },
    ];
    if (animation === 'parallax') {
      transform.push({
        translateX: translateX.value,
      });
    }
    return {
      opacity: opacity.value,
      transform,
    };
  }, []);

  const mContainerStyle: StyleProp<ViewStyle> = useMemo(() => {
    return [
      {
        width: itemWidth,
        overflow: 'hidden',
      },
      containerStyle,
    ];
  }, [itemWidth, containerStyle]);

  return (
    <Pressable
      style={({ pressed }) => [
        mContainerStyle,
        pressed && { opacity: 0.9 },
      ]}
      onPress={onPress}
    >
      <Animated.View style={[STYLES.container, animatedStyle]}>
        <PageContent
          renderItem={renderItem}
          item={item}
          index={index}
          animatedValue={animatedValue}
          offset={offset}
        />
      </Animated.View>
    </Pressable>
  );
}

const STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    height: undefined,
    width: undefined,
  },
});
