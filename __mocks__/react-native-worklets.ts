// Manual Jest mock for react-native-worklets (see
// react-native-reanimated.tsx mock in this same directory for why).
//
// Collapses the JS-thread/UI-thread boundary to a synchronous same-thread
// call — sufficient for tests, which run everything on one thread anyway.
export function scheduleOnRN(fn: (...args: any[]) => void, ...args: any[]) {
  fn(...args);
}

export function scheduleOnUI(fn: (...args: any[]) => void, ...args: any[]) {
  fn(...args);
}
