import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import type Animated from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';

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
  animatedPage?: SharedValue<number>;
  scrollViewProps?: ScrollViewProps;
  renderItem: (
    data: { item: T; index?: number },
    animatedData?: {
      scrollPosition?: SharedValue<number>;
      offset?: number;
    }
  ) => React.ReactNode;
  onPageChange?: (index: number) => void;
  keyExtractor?: (item: T, index?: number) => string;
  onItemPress?: (item: T, index?: number) => void;
  disableItemPress?: boolean;
  scrollViewRef?: any;
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
  currentPage: SharedValue<number>;
  totalPage: SharedValue<number>;
};

export type CarouselContextInternalType = {
  setCarouselHandlers: (handlers: any) => void;
}

export type AnimatorProps = {
  animatedValue: SharedValue<number>;
  offset: number;
  freeze: SharedValue<boolean>;
  itemWidth: number;
};

export type PaginationProps = {
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
