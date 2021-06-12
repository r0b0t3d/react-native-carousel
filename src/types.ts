import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import type Animated from 'react-native-reanimated';

export type CarouselProps<T = any> = {
  style?: StyleProp<ViewStyle>;
  data: T[];
  initialPage?: number;
  loop?: boolean;
  additionalPagesPerSide?: number;
  autoPlay?: boolean;
  duration?: number;
  animation?: 'parallax';
  sliderWidth?: number;
  itemWidth?: number;
  firstItemAlignment?: 'start' | 'center';
  inactiveOpacity?: number;
  inactiveScale?: number;
  spaceBetween?: number;
  spaceHeadTail?: number;
  animatedPage?: Animated.SharedValue<number>;
  scrollViewProps?: ScrollViewProps;
  renderItem: (
    data: { item: T; index?: number },
    animatedData?: {
      scrollPosition?: Animated.SharedValue<number>;
      offset?: number;
    }
  ) => React.ReactNode;
  onPageChange?: (index: number) => void;
  keyExtractor?: (item: T, index?: number) => string;
};

export type CarouselHandles = {
  goNext(): void;
  goPrev(): void;
  snapToItem(index: number, animated?: boolean): void;
};

export type CarouselContextType = {
  goNext(): void;
  goPrev(): void;
  snapToItem(index: number, animated?: boolean): void;
  currentPage: Animated.SharedValue<number>;
  totalPage: Animated.SharedValue<number>;
};

export type CarouselContextInternalType = {
  setCarouselHandlers: (handlers: any) => void;
}

export type AnimatorProps = {
  animatedValue: Animated.SharedValue<number>;
  offset: number;
  freeze: Animated.SharedValue<boolean>;
  itemWidth: number;
};

export type PaginationProps = {
  totalPage: number;
  containerStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: Omit<StyleProp<ViewStyle>, 'width'>;
  activeIndicatorStyle?: Omit<StyleProp<ViewStyle>, 'width'>;
  indicatorConfigs?: IndicatorConfigs;
};

export type IndicatorConfigs = {
  indicatorColor?: string;
  indicatorWidth?: number;
  indicatorSelectedColor?: string;
  indicatorSelectedWidth?: number;
  spaceBetween?: number;
};
