/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createContext, useContext } from 'react';
import type { CarouselContextType } from '../types';

// @ts-ignore
export const CarouselContext = createContext<CarouselContextType>();

export function useCarouselContext() {
  const ctx = useContext(CarouselContext);
  if (!ctx) {
    throw new Error('Component must be wrapped with withCarouselContext');
  }
  return ctx;
}
