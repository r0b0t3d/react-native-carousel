// Manual Jest mock for react-native-reanimated.
//
// Jest automatically substitutes this file for the real package in every
// test (no `jest.mock()` call needed) because it lives in a root-level
// `__mocks__/<package-name>` file — see
// https://jestjs.io/docs/manual-mocks#mocking-node-modules
//
// Why this exists: the real package's UI-thread runtime (via
// react-native-worklets' NativeWorklets turbo module) throws when loaded
// under Jest/Node, since no native binding is present. Rather than fight
// that, this mock provides plain synchronous JS equivalents of the handful
// of APIs the carousel uses — enough to exercise its real state-machine /
// callback logic in tests without a real UI thread.
import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

export function useSharedValue<T>(initial: T) {
  const ref = React.useRef({ value: initial });
  return ref.current;
}

export function useAnimatedRef<T = any>() {
  const ref = React.useRef<any>(null);
  if (ref.current === null) {
    const animatedRef: any = (node: T) => {
      animatedRef.current = node;
    };
    animatedRef.current = null;
    ref.current = animatedRef;
  }
  return ref.current;
}

// Returns the handlers object as-is, so tests can invoke the real
// business logic directly — e.g. `scrollHandler.onScroll(event)`,
// `.onBeginDrag()`, `.onEndDrag()`, `.onMomentumEnd(event)` — bypassing
// native event dispatch entirely.
export function useAnimatedScrollHandler(handlers: any) {
  return handlers;
}

export function useAnimatedStyle(factory: () => any) {
  return factory();
}

export function useDerivedValue<T>(factory: () => T) {
  return { value: factory() };
}

export function interpolate(
  value: number,
  inputRange: number[],
  outputRange: number[]
) {
  if (value <= inputRange[0]) return outputRange[0];
  const last = inputRange.length - 1;
  if (value >= inputRange[last]) return outputRange[last];
  for (let i = 1; i < inputRange.length; i++) {
    if (value <= inputRange[i]) {
      const ratio =
        (value - inputRange[i - 1]) / (inputRange[i] - inputRange[i - 1]);
      return outputRange[i - 1] + ratio * (outputRange[i] - outputRange[i - 1]);
    }
  }
  return outputRange[last];
}

export function scrollTo() {
  // no-op: no real native ScrollView to imperatively scroll under Jest.
}

const Animated = {
  ScrollView,
  View,
  Text,
  Image,
  createAnimatedComponent: (Component: any) => Component,
};

export default Animated;
