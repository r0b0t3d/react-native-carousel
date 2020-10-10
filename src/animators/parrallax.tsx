import React, { ReactElement } from 'react';
import { Dimensions } from 'react-native';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';

const { width: wWidth } = Dimensions.get('window');

type Props = {
  animatedValue: Animated.SharedValue<number>;
  index: number;
  children?: ReactElement;
};

export default function ParallaxContainer({ animatedValue, index, children }: Props) {
  const inputRange = [(index - 1) * wWidth, index * wWidth, (index + 1) * wWidth];
  const outputRange = index === 0 ? [0, 0, 150] : [-300, 0, 150];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(animatedValue.value, inputRange, outputRange, Animated.Extrapolate.CLAMP) }],
  }));
  return <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>;
}

export function withParallax(component: ReactElement, props: Props) {
  return <ParallaxContainer {...props}>{component}</ParallaxContainer>;
}
