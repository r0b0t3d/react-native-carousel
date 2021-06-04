/**
 * Sample React Native App
 *
 * adapted from App.js generated by the following command:
 *
 * react-native init example
 *
 * https://github.com/facebook/react-native
 */

import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
  TouchableOpacity,
  Text,
  ImageProps,
} from 'react-native';
import Carousel, {
  CarouselHandles,
  PaginationIndicator,
} from '@r0b0t3d/react-native-carousel';
import { useSharedValue } from 'react-native-reanimated';

type CarouselData = {
  id: string;
  source: ImageProps['source'];
  url: string;
};

const data: CarouselData[] = [
  {
    id: 'image1',
    source: {
      uri:
        'https://ae01.alicdn.com/kf/HTB10xLEPFXXXXbRaXXXq6xXFXXXm/danbo-10-pcs-set-Danbo-Mini-Danbor-High-Quality-children-Gift-Toy-Cat-backyard-Anime-In.jpg_640x640.jpg',
    },
    url:
      'https://ae01.alicdn.com/kf/HTB10xLEPFXXXXbRaXXXq6xXFXXXm/danbo-10-pcs-set-Danbo-Mini-Danbor-High-Quality-children-Gift-Toy-Cat-backyard-Anime-In.jpg_640x640.jpg',
  },
  {
    id: 'image2',
    source: {
      uri: 'https://live.staticflickr.com/5324/31332023695_1e3135f8d0_b.jpg',
    },
    url: 'https://live.staticflickr.com/5324/31332023695_1e3135f8d0_b.jpg',
  },
  {
    id: 'image3',
    source: {
      uri:
        'https://4.bp.blogspot.com/_N44PgSKJwQY/TOtoPtIo3_I/AAAAAAAAANE/7WwIFzgm-IU/s1600/Danboard.obstacles.jpg',
    },
    url:
      'https://4.bp.blogspot.com/_N44PgSKJwQY/TOtoPtIo3_I/AAAAAAAAANE/7WwIFzgm-IU/s1600/Danboard.obstacles.jpg',
  },
  {
    id: 'image4',
    source: {
      uri:
        'https://i.pinimg.com/originals/97/17/8a/97178ac9a3e25b3080a0e7f8b728ac29.jpg',
    },
    url:
      'https://i.pinimg.com/originals/97/17/8a/97178ac9a3e25b3080a0e7f8b728ac29.jpg',
  },
  {
    id: 'image5',
    source: {
      uri:
        'https://c4.wallpaperflare.com/wallpaper/289/627/693/danbo-cardboard-robot-hat-walk-wallpaper-preview.jpg',
    },
    url:
      'https://c4.wallpaperflare.com/wallpaper/289/627/693/danbo-cardboard-robot-hat-walk-wallpaper-preview.jpg',
  },
];

const { width } = Dimensions.get('window');

export default function App() {
  const currentPage = useSharedValue(0);
  const carousel = useRef<CarouselHandles>(null);

  const handleRandom = useCallback(() => {
    const randomIdx = Math.floor(Math.random() * data.length);
    carousel.current?.snapToItem(randomIdx, true);
  }, []);

  const handleNext = useCallback(() => {
    carousel.current?.goNext();
  }, []);

  const handlePrev = useCallback(() => {
    carousel.current?.goPrev();
  }, []);

  return (
    <View style={styles.container}>
      <Carousel
        ref={carousel}
        style={{ height: 200 }}
        initialPage={2}
        data={data}
        loop={true}
        autoPlay={false}
        duration={3000}
        itemWidth={width - 100}
        inactiveOpacity={0.5}
        inactiveScale={0.8}
        firstItemAlignment="center"
        spaceBetween={10}
        spaceHeadTail={20}
        animatedPage={currentPage}
        additionalPagesPerSide={3}
        scrollViewProps={{
          scrollEnabled: true,
        }}
        renderItem={({ item }) => {
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
            height: 20,
            borderRadius: 5,
          }}
          indicatorConfigs={{
            spaceBetween: 10,
            indicatorWidth: 10,
            indicatorSelectedWidth: 20,
          }}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handlePrev}>
          <Text>PREV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleRandom}>
          <Text>RANDOM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text>NEXT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  buttonContainer: {
    marginTop: 30,
    flexDirection: 'row',
  },
  button: {
    backgroundColor: '#b2b2b2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 20,
  },
});
