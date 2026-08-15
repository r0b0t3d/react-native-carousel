import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Carousel from '../components/Carousel';
import withCarouselContext from '../components/CarouselContainer';
import { useCarouselContext } from '../components/useCarouselContext';
import type { CarouselContextType } from '../types';

// sliderWidth === itemWidth makes horizontalPadding 0, so offsets collapse
// to a plain `renderIndex * itemWidth` sequence — deterministic without
// needing to duplicate generateOffsets' math here.
const ITEM_WIDTH = 100;
const SCROLL_VIEW_TEST_ID = 'carousel-scroll';

const renderItem = ({ item }: { item: { id: string } }) => (
  <Text>{item.id}</Text>
);

function ContextSpy({
  onReady,
}: {
  onReady: (ctx: CarouselContextType) => void;
}) {
  onReady(useCarouselContext());
  return null;
}

async function renderCarousel(props: {
  data: { id: string }[];
  initialPage?: number;
  loop?: boolean;
  additionalPagesPerSide?: number;
}) {
  let ctx: CarouselContextType;
  function Wrapper(p: any) {
    return (
      <>
        <Carousel {...p} />
        <ContextSpy
          onReady={(c) => {
            ctx = c;
          }}
        />
      </>
    );
  }
  const Wrapped = withCarouselContext(Wrapper);

  const utils = await render(
    <Wrapped
      renderItem={renderItem}
      sliderWidth={ITEM_WIDTH}
      itemWidth={ITEM_WIDTH}
      scrollViewProps={{ testID: SCROLL_VIEW_TEST_ID }}
      {...props}
    />
  );
  return { ...utils, getCtx: () => ctx! };
}

function getContentOffsetX(utils: { getByTestId: (id: string) => any }) {
  return utils.getByTestId(SCROLL_VIEW_TEST_ID).props.contentOffset.x;
}

const DATA = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('Carousel initialPage', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('valid first page', async () => {
    const utils = await renderCarousel({ data: DATA, initialPage: 0 });
    expect(getContentOffsetX(utils)).toBe(0);
    expect(utils.getCtx().currentPage.value).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('valid last page', async () => {
    const utils = await renderCarousel({ data: DATA, initialPage: 2 });
    expect(getContentOffsetX(utils)).toBe(200);
    expect(utils.getCtx().currentPage.value).toBe(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('looped initial page', async () => {
    // loop + additionalPagesPerSide=1 shifts render index by 1:
    // render 0 = clone, render 1..3 = data[0..2], render 4 = clone.
    const utils = await renderCarousel({
      data: DATA,
      initialPage: 1,
      loop: true,
      additionalPagesPerSide: 1,
    });
    expect(getContentOffsetX(utils)).toBe(200);
    expect(utils.getCtx().currentPage.value).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('invalid negative page falls back to page 0', async () => {
    const utils = await renderCarousel({ data: DATA, initialPage: -1 });
    expect(getContentOffsetX(utils)).toBe(0);
    expect(utils.getCtx().currentPage.value).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith('Invalid initialPage -1');
  });

  test('invalid page >= data.length falls back to page 0', async () => {
    const utils = await renderCarousel({ data: DATA, initialPage: 5 });
    expect(getContentOffsetX(utils)).toBe(0);
    expect(utils.getCtx().currentPage.value).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith('Invalid initialPage 5');
  });

  test('empty data renders without error and stays at page 0', async () => {
    const utils = await renderCarousel({ data: [], initialPage: 1 });
    expect(getContentOffsetX(utils)).toBe(0);
    expect(utils.getCtx().currentPage.value).toBe(0);
    // Empty data short-circuits before the invalid-page check — no
    // "Invalid initialPage" warning should fire.
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
