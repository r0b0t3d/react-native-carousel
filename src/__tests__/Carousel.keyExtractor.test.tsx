import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Carousel from '../components/Carousel';
import withCarouselContext from '../components/CarouselContainer';
import type { CarouselProps } from '../types';

const ITEM_WIDTH = 100;
const DATA = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

const renderItem = ({ item }: { item: { id: string } }) => (
  <Text>{item.id}</Text>
);

// `Carousel` is generic; pin TData explicitly so keyExtractor/renderItem
// below type-check against `{ id: string }` instead of defaulting to `unknown`.
const WrappedCarousel = withCarouselContext<CarouselProps<{ id: string }>>(
  Carousel
);

describe('Carousel keyExtractor', () => {
  test('receives the render index, not the logical index', async () => {
    const keyExtractor = jest.fn((item: { id: string }) => item.id);

    await render(
      <WrappedCarousel
        data={DATA}
        loop
        additionalPagesPerSide={1}
        sliderWidth={ITEM_WIDTH}
        itemWidth={ITEM_WIDTH}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    );

    // loop + additionalPagesPerSide=1 pads the data:
    //   render 0 -> data[2] (head clone)
    //   render 1 -> data[0]
    //   render 2 -> data[1]
    //   render 3 -> data[2]
    //   render 4 -> data[0] (tail clone)
    // keyExtractor must see the render index (not the logical/data index),
    // which is why data[2] and data[0] each appear twice with different
    // index arguments.
    expect(keyExtractor.mock.calls).toEqual([
      [DATA[2], 0],
      [DATA[0], 1],
      [DATA[1], 2],
      [DATA[2], 3],
      [DATA[0], 4],
    ]);
  });

  test('loop clones receive unique React keys even when keyExtractor returns duplicate values', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Deliberately ignores the index — a realistic naive keyExtractor that
    // would collide across loop clones (data[0]/data[2] each render twice)
    // if getItemKey didn't suffix the render index onto it.
    const keyExtractor = (item: { id: string }) => item.id;

    await render(
      <WrappedCarousel
        data={DATA}
        loop
        additionalPagesPerSide={1}
        sliderWidth={ITEM_WIDTH}
        itemWidth={ITEM_WIDTH}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
      />
    );

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      String(call[0]).toLowerCase().includes('same key')
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });
});
