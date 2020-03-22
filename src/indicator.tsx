import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';

const configs = {
    dotColor: 'gray',
    dotSelectedColor: 'green',
    dotWidth: 6,
    dotSelectedWidth: 10,
  };

const styles = StyleSheet.create({
    dotStyle: {
      width: configs.dotWidth,
      height: configs.dotWidth,
      borderRadius: configs.dotWidth / 2,
      backgroundColor: configs.dotColor,
      marginEnd: 5,
    },
    dotSelectedStyle: {
      width: configs.dotSelectedWidth,
      height: configs.dotSelectedWidth,
      borderRadius: configs.dotSelectedWidth / 2,
      backgroundColor: configs.dotSelectedColor,
      marginEnd: 5,
    },
  });

export default function Indicator({
    totalPage,
    currentPage,
    style = {
      position: 'absolute',
      left: 10,
      bottom: 10,
    },
    renderIndicator,
  }: {
    totalPage: number;
    currentPage: number;
    style: StyleProp<ViewStyle>;
    renderIndicator?: any;
  }) {
    const indicators: any[] = [];
    for (let i = 0; i < totalPage; i+=1) {
        let indicator: any = null;
        const selected = currentPage === i + 1;
        if (renderIndicator) {
            indicator = renderIndicator({ selected });
        } else {
            indicator = <Dot selected={selected} />
        }
        indicators.push(indicator);
    }

    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
          },
          style,
        ]}
      >
        {indicators}
      </View>
    );
  }

  function Dot({ selected }: { selected: boolean }) {
    return (
      <View
        style={selected ? styles.dotSelectedStyle : styles.dotStyle}
      />
    );
  }
  