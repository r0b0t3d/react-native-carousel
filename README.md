# react-native-carousel

## Getting started

>🎉  Reanimated 2 support 🎉 
>
>For someone would love to try `Reanimated 2`
>
>`$ yarn add @r0b0t3d/react-native-carousel@alpha`

`$ npm install @r0b0t3d/react-native-carousel --save`

or

`$ yarn add @r0b0t3d/react-native-carousel`

Note: Currently, I am using `react-native-reanimated` for animation. So you should install it as well

`$ yarn add react-native-reanimated`


## Usage
```javascript
import Carousel from '@r0b0t3d/react-native-carousel';

<Carousel
    style={{ height: 200 }}
    data={data}
    loop
    autoPlay
    animation="parallax"
    renderImage={(item) => {
        return <Image
            style={{
                flex: 1,
                backgroundColor: 'red',
            }}
            source={{ uri: item.url }}
        />
    }}
/>
```

## Properties

- `data`: array of item to be rendered.
    + `id: string`: this will be used as key to render
    + `source: ImageSourcePropType`: optional. Image source. If you don't want to pass `source` here. You could use `renderImage` below to render your custom image.
- `loop: boolean`: [default `false`] Whether your carousel can loop or not
- `autoPlay: boolean`: [default `false`] Auto animate to next image with `duration`.
- `duration: number`: [default `1000`] duration to animate. used with `autoPlay` above
- `indicatorContainerStyle: StyleProp<ViewStyle>`
- `renderIndicator?: ({ selected, index }: { selected: boolean, index: number }) => React.ReactNode`: custom render for indicator
- `animation`: predefined animation. Will be `parallax` for now
- `renderImage?: (item: CarouselData) => React.ReactNode`: custom image render.
- `renderOverlay?: (item: CarouselData) => React.ReactNode`: render custom overlay above image
