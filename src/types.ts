import { StyleProp, ViewStyle, ImageSourcePropType } from 'react-native';

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
  renderIndicator?: (props: { selected: boolean; index: number }) => React.ReactNode;
  renderImage?: (item: any) => React.ReactNode;
  renderOverlay?: (item: CarouselData) => React.ReactNode;
  onPageChange?: (item: CarouselData, index: number) => void;
};

export type Carousel = {
  next(): void;
  prev(): void;
};
