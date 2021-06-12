import React, {
  FC,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import Animated, { useSharedValue } from 'react-native-reanimated';
import type { CarouselHandles } from 'src/types';
import { CarouselContext } from './useCarouselContext';
import { InternalCarouselContext } from './useInternalCarouselContext';

type Props = {
  children: ReactNode;
};

function CarouselContainer({ children }: Props) {
  const carouselHandlers = useRef<CarouselHandles>();
  const currentPage = useSharedValue(0);
  const totalPage = useSharedValue(0);

  const setCarouselHandlers = useCallback((handlers) => {
    carouselHandlers.current = handlers;
  }, []);

  const context = useMemo(() => {
    return {
      goNext: () => carouselHandlers.current?.goNext(),
      goPrev: () => carouselHandlers.current?.goPrev(),
      snapToItem: (index: number, animated: boolean) =>
        carouselHandlers.current?.snapToItem(index, animated),
      currentPage,
      totalPage,
    };
  }, []);

  const internalContext = useMemo(
    () => ({
      setCarouselHandlers,
    }),
    []
  );
  
  return (
    <CarouselContext.Provider value={context}>
      <InternalCarouselContext.Provider value={internalContext}>
        {children}
      </InternalCarouselContext.Provider>
    </CarouselContext.Provider>
  );
}

export default function withCarouselContext<T>(Component: FC<T>) {
  return (props: T) => {
    return (
      <CarouselContainer>
        <Component {...props} />
      </CarouselContainer>
    );
  };
}
