import { StyleProp, ViewStyle } from 'react-native';

export type CarouselData = {
  id: string;
  url: string;
};

export type CarouselProps = {
  data: CarouselData[];
  loop: boolean;
  autoPlay: boolean;
  duration: number;
  indicatorContainerStyle: StyleProp<ViewStyle>;
  renderIndicator?: ({ selected }: { selected: boolean }) => React.ReactNode;
  renderOverlay?: () => React.ReactNode;
};
