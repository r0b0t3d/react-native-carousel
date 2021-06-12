/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createContext, useContext } from 'react';
import type { CarouselContextInternalType } from '../types';

export const InternalCarouselContext = createContext<CarouselContextInternalType>({
  setCarouselHandlers: () => null,
});

export function useInternalCarouselContext() {
  const ctx = useContext(InternalCarouselContext);
  if (!ctx) {
    console.log('Component should be rendered inside CarouselContainer');
  }
  return ctx;
}
