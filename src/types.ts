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
  indicatorContainerStyle?: StyleProp<ViewStyle>;
  renderIndicator?: ({ selected }: { selected: boolean }) => React.ReactNode;
  renderImage?: (item: any) => React.ReactNode;
  renderOverlay?: (item: CarouselData) => React.ReactNode;
};
