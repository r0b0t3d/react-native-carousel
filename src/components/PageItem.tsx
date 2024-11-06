/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useMemo } from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
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
  onPress: () => void;
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
    const transform: ViewStyle['transform'] = [
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

  function renderContent() {
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
          style={styles.image}
          resizeMode="cover"
        />
      );
    }
    console.error('You need implement renderItem');
    return null;
  }

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
    <TouchableOpacity
      activeOpacity={0.9}
      style={mContainerStyle}
      onPress={onPress}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        {renderContent()}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    height: undefined,
    width: undefined,
  },
});
