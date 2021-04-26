import type { StyleProp, ViewStyle } from 'react-native';
import type Animated from 'react-native-reanimated';

export type CarouselData = {
  id: string;
  [key: string]: any;
};

export type CarouselProps = {
  style?: StyleProp<ViewStyle>;
  data: CarouselData[];
  loop?: boolean;
  autoPlay?: boolean;
  duration?: number;
  animation?: 'parallax';
  sliderWidth?: number;
  itemWidth?: number;
  firstItemAlignment?: 'start' | 'center';
  inactiveOpacity?: number;
  inactiveScale?: number;
  spaceBetween?: number;
  animatedPage?: Animated.SharedValue<number>;
  renderItem?: (item: any) => React.ReactNode;
  onPageChange?: (index: number) => void;
};

export type CarouselRef = {
  next(): void;
  prev(): void;
};

export type AnimatorProps = {
  animatedValue: Animated.SharedValue<number>;
  offset: number;
  freeze: Animated.SharedValue<boolean>;
  itemWidth: number;
};

export type PaginationProps = {
  totalPage: number;
  currentPage: Animated.SharedValue<number>;
  containerStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  activeIndicatorStyle?: StyleProp<ViewStyle>;
  indicatorConfigs?: IndicatorConfigs
}

export type IndicatorConfigs = {
  indicatorColor?: string,
  indicatorSelectedColor?: string,
  indicatorWidth?: number,
  spaceBetween?: number,
}