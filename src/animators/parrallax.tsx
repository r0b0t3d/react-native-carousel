import React, { ReactElement, useMemo } from 'react';
import { Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';

const { width: wWidth } = Dimensions.get('window');

type Props = {
  animatedValue: Animated.Value<number>;
  index: number;
  freeze?: boolean;
  children?: ReactElement;
};

export default function ParallaxContainer({ animatedValue, index, freeze = false, children }: Props) {
  const inputRange = [(index - 1) * wWidth, index * wWidth, (index + 1) * wWidth];
  const outputRange = freeze ? [0, 0, 0] : [-wWidth / 2, 0, wWidth / 2];

  const animatedStyle = useMemo(
    () => ({
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange,
            outputRange,
            extrapolate: Animated.Extrapolate.CLAMP,
          }),
        },
      ],
    }),
    [freeze],
  );
  return <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>;
}

export function withParallax(component: ReactElement, props: Props) {
  return <ParallaxContainer {...props}>{component}</ParallaxContainer>;
}
