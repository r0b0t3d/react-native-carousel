import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import type { PaginationProps } from 'src/types';

const defaultIndicatorConfigs = {
  indicatorColor: 'gray',
  indicatorSelectedColor: 'blue',
  indicatorWidth: 6,
  spaceBetween: 3,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelectedStyle: {
    position: 'absolute',
  },
});

const defaultSpringConfig = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

export default function PaginationIndicator({
  totalPage,
  currentPage,
  containerStyle,
  indicatorStyle,
  activeIndicatorStyle,
  indicatorConfigs,
}: PaginationProps) {
  const configs = useMemo(() => {
    return {
      ...defaultIndicatorConfigs,
      ...indicatorConfigs,
    };
  }, [indicatorConfigs]);

  const translateX = useDerivedValue(() => {
    return withSpring(
      currentPage.value * (configs.indicatorWidth + configs.spaceBetween),
      defaultSpringConfig
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: translateX.value,
        },
      ],
    };
  }, []);

  const renderItem = useCallback((pageNumber: number) => {
    const dotContainerStyle: ViewStyle = StyleSheet.flatten([
      styles.dotContainer,
      {
        width: configs.indicatorWidth,
        height: configs.indicatorWidth,
        marginEnd: configs.spaceBetween,
      },
      activeIndicatorStyle
    ]);
    const dotStyle: ViewStyle = StyleSheet.flatten([
      {
        width: configs.indicatorWidth,
        height: configs.indicatorWidth,
        borderRadius: configs.indicatorWidth / 2,
        backgroundColor: configs.indicatorColor,
      },
      indicatorStyle,
    ]);
    const aStyle = useAnimatedStyle(() => {
      return {
        width: withSpring(
          currentPage.value === pageNumber
            ? (dotContainerStyle.width as number || configs.indicatorWidth)
            : (dotStyle.width as number || configs.indicatorWidth),
          defaultSpringConfig
        ),
      };
    }, []);
    return (
      <Animated.View
        key={`index${pageNumber}`}
        style={[dotContainerStyle, aStyle]}
      >
        <View style={dotStyle} />
      </Animated.View>
    );
  }, []);

  return (
    <View style={[styles.container, containerStyle]}>
      {[...Array(totalPage).keys()].map(renderItem)}
      <Animated.View
        style={[
          styles.dotSelectedStyle,
          {
            width: configs.indicatorWidth,
            height: configs.indicatorWidth,
            borderRadius: configs.indicatorWidth / 2,
            backgroundColor: configs.indicatorSelectedColor,
          },
          activeIndicatorStyle,
          animatedStyle,
        ]}
      />
    </View>
  );
}
