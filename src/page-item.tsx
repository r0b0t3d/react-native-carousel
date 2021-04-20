import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import type Animated from 'react-native-reanimated';
import { withParallax } from './animators/parrallax';
import type { CarouselData } from './types';

const { width: wWidth } = Dimensions.get('window');

type Props = {
  item: CarouselData;
  index: number;
  renderImage?: any;
  renderOverlay?: any;
  animatedValue: Animated.SharedValue<number>;
  animation?: 'parallax';
  freeze: Animated.SharedValue<boolean>;
};

export default function PageItem({
  item,
  index,
  renderImage,
  renderOverlay,
  animatedValue,
  animation,
  freeze,
}: Props) {
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

  function renderContainer() {
    if (animation === 'parallax') {
      return withParallax(renderContent(), {
        animatedValue,
        index,
        freeze,
      });
    }
    return renderContent();
  }

  return (
    <View
      collapsable={false}
      style={{
        width: wWidth,
        overflow: 'hidden',
        backgroundColor: 'black',
      }}
    >
      {renderContainer()}
      {renderOverlay && (
        <View style={StyleSheet.absoluteFill} collapsable={false}>
          {renderOverlay(item)}
        </View>
      )}
    </View>
  );
}
