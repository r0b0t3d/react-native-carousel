/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import type { IndicatorConfigs, PaginationProps } from '../types';
import { useCarouselContext } from './useCarouselContext';

const defaultIndicatorConfigs: IndicatorConfigs = {
  indicatorColor: 'gray',
  indicatorWidth: 6,
  indicatorSelectedColor: 'blue',
  indicatorSelectedWidth: 6,
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
  containerStyle,
  indicatorStyle,
  activeIndicatorStyle,
  indicatorConfigs,
}: PaginationProps) {
  const {currentPage, totalPage} = useCarouselContext();

  const configs = useMemo(() => {
    return {
      ...defaultIndicatorConfigs,
      ...indicatorConfigs,
    };
  }, [indicatorConfigs]);

  const translateX = useDerivedValue(() => {
    return withSpring(
      currentPage.value * (configs.indicatorWidth! + configs.spaceBetween!),
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
    // @ts-ignore
    if (activeIndicatorStyle?.width) {
      console.error(
        'Do not use activeIndicatorStyle: { width }. Please use indicatorConfigs: { indicatorSelectedWidth } instead'
      );
    }
    // @ts-ignore
    if (indicatorStyle?.width) {
      console.error(
        'Do not use indicatorStyle: { width }. Please use indicatorConfigs: { indicatorWidth } instead'
      );
    }
    const dotContainerStyle: ViewStyle = StyleSheet.flatten([
      styles.dotContainer,
      {
        width: configs.indicatorSelectedWidth,
        height: configs.indicatorWidth,
        marginEnd: configs.spaceBetween,
      },
      activeIndicatorStyle,
      {
        // Disable backgroundColor in activeIndicatorStyle
        backgroundColor: undefined,
      },
    ]);
    const dotStyle: ViewStyle = StyleSheet.flatten([
      {
        width: configs.indicatorWidth,
        height: configs.indicatorWidth,
        borderRadius: configs.indicatorWidth! / 2,
        backgroundColor: configs.indicatorColor,
      },
      indicatorStyle,
    ]);

    const aStyle = useAnimatedStyle(() => {
      return {
        width: withSpring(
          currentPage.value === pageNumber
            ? configs.indicatorSelectedWidth!
            : configs.indicatorWidth!,
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
      {[...Array(totalPage.value).keys()].map(renderItem)}
      <Animated.View
        style={[
          styles.dotSelectedStyle,
          {
            width: configs.indicatorSelectedWidth,
            height: configs.indicatorWidth,
            borderRadius: configs.indicatorWidth! / 2,
            backgroundColor: configs.indicatorSelectedColor,
          },
          activeIndicatorStyle,
          animatedStyle,
        ]}
      />
    </View>
  );
}
