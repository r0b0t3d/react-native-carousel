import type { StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';

export type CarouselData = {
  id: string;
  source?: ImageSourcePropType;
  [key: string]: any;
};

export type CarouselProps = {
  style?: StyleProp<ViewStyle>;
  data: CarouselData[];
  loop?: boolean;
  autoPlay?: boolean;
  duration?: number;
  useIndicator?: boolean;
  indicatorContainerStyle?: StyleProp<ViewStyle>;
  animation?: 'parallax';
  sliderWidth?: number;
  itemWidth?: number;
  firstItemAlignment?: 'start' | 'center'
  renderIndicator?: (props: {
    selected: boolean;
    index: number;
  }) => React.ReactNode;
  renderImage?: (item: any) => React.ReactNode;
  renderOverlay?: (item: CarouselData) => React.ReactNode;
  onPageChange?: (item: CarouselData, index: number) => void;
};

export type CarouselRef = {
  next(): void;
  prev(): void;
};
