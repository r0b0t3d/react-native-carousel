export const generateOffsets = ({
  sliderWidth,
  itemWidth,
  itemCount,
  horizontalPadding,
}: {
  sliderWidth: number;
  itemWidth: number;
  itemCount: number;
  horizontalPadding: number;
}) => {
  const padding = (sliderWidth - itemWidth) / 2;
  const result: number[] = [];
  for (let i = 0; i < itemCount; i++) {
    if (i === 0) {
      result.push(0);
    } else if (i === itemCount - 1) {
      result.push(i * itemWidth + 2 * (horizontalPadding - padding));
    } else {
      result.push(i * itemWidth + horizontalPadding - padding);
    }
  }
  return result;
};

export const findNearestPage = (
  offset: number,
  offsets: number[],
  delta: number
) => {
  'worklet';
  let mid;
  let lo = 0;
  let hi = offsets.length - 1;
  while (hi - lo > 1) {
    mid = Math.floor((lo + hi) / 2);
    if (offsets[mid] < offset) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const nearestPage = offset - offsets[lo] <= offsets[hi] - offset ? lo : hi;
  if (Math.abs(offsets[nearestPage] - offset) < delta) {
    return nearestPage;
  }
  return -1;
};
