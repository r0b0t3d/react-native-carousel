# react-native-carousel
![alt text](pictures/intro.gif "Intro")
## Getting started

`$ yarn add @r0b0t3d/react-native-carousel`

Note: Currently, I am using `react-native-reanimated` for animation. So you should install it as well

`$ yarn add react-native-reanimated`

## Breaking changes
 ### v3.0.0
  - Added: 
    - `animatedPage`: animated value used which is current selected page. Used to pass into the `PaginationIndicator` for animation.
  - Removed:
    - `useIndicator`, `indicatorContainerStyle`, `renderIndicator`, . Used `PaginationIndicator` instead
    - `renderOverlay`: you can render overlay inside `renderItem` function
  - Changed: 
    - `renderImage` -> `renderItem`
 ### v2.0.0
  - requires `react-native-reanimated@2.1.0`

## Show cases

| Loop | Scale | Alignment |
| -----| ----- | --------- |
| ![alt text](pictures/loop.gif "Loop") | ![alt text](pictures/scale.gif "Scale") | ![alt text](pictures/alignment.gif "Alignment") |
### Loop
```tsx
<Carousel
  loop={true}
  autoPlay={true}
  duration={3000}
  animation="parallax"
/>
```

### Scale
```tsx
<Carousel
  itemWidth={width - 100}
  inactiveOpacity={0.5}
  inactiveScale={0.9}
/>
```

### Alignment
```tsx
<Carousel
  itemWidth={width - 100}
  inactiveOpacity={0.5}
  inactiveScale={0.9}
  firstItemAlignment="start"
/>
```
## Usage
```javascript
import Carousel from '@r0b0t3d/react-native-carousel';

function MyCarousel() {
  const currentPage = useSharedValue(0);
  return (
    <View>
    <Carousel
      style={{ height: 200 }}
      data={data}
      loop={false}
      autoPlay={true}
      duration={3000}
      itemWidth={width - 100}
      inactiveOpacity={0.5}
      inactiveScale={0.9}
      firstItemAlignment="start"
      spaceBetween={20}
      animatedPage={currentPage}
      renderItem={(item) => {
        return (
          <Image
            style={{
              flex: 1,
              backgroundColor: 'red',
            }}
            source={{ uri: item.url }}
          />
        );
      }}
    />
    <View>
      <PaginationIndicator
        totalPage={data.length}
        currentPage={currentPage}
        containerStyle={{ marginTop: 20 }}
        activeIndicatorStyle={{
          width: 20,
          height: 10,
          borderRadius: 5,
        }}
        indicatorConfigs={{
          spaceBetween: 10
        }}
      />
    </View>
  </View>
}
```

## Properties

| Props | Description | Default |
| ----- | ----------- |:-------:|
| data | Array of item to be rendered.<br>- `id: string`: this will be used as key to render<br>- `source: ImageSourcePropType`: optional. Image source. If you don't want to pass `source` here. You could use `renderItem` below to render your custom image. <br> ------ <br>Or it could be array of string |
|loop?| Whether your carousel can loop or not | false |
|initialPage?| Set the first page show up | 0 |
|additionalPagesPerSide?| When looping, how many page will be added at head and tail to perform loop effect | 2 |
|autoPlay?| Auto animate to next image with `duration`.| false|
|duration?| Duration to animate. used with `autoPlay` above|1000|
|animation?| Predefined animation. Will be `parallax` for now||
|sliderWidth?| Define slider width | screen's width |
|itemWidth?| Define item width | screen's width |
|firstItemAlignment?| `'center' | 'start'`<br> Align first item | center |
|inactiveOpacity?| [0 - 1] Define opacity for inactive items | 1 |
|inactiveScale?| [0 - 1] define scale value for inactive items | 1 |
|spaceBetween?| Add additional space between items | 0 |
|spaceHeadTail?| Add more space in head/tail. This only work if `firstItemAlignment = 'start'` | 0 |
|animatedPage?| Animated value which is the current page. This value used to pass into `PaginationIndicator` for animation | |
|renderItem?| `(item: CarouselData) => React.ReactNode`<br> Custom image render. | |
|onPageChange?| `(index: number) => void`<br> Callback to notify when page change | |

## Methods

| Method | Description |
| ------ | ----------- |
| goNext | Go to next index |
| goPrev | Go to previous index |
| snapToItem | `(index: number, animated?: boolean) => void`<br>Snap to specific index <br>- `index`: destination index<br>- `animated`: should animate or not, default is `true` |
## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT