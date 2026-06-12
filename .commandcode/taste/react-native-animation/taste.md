# React Native Animation
- Use Reanimated shared values (useSharedValue) for animation/UI-thread state; use plain React useRef for JS-only non-animation state (e.g., app foreground flag). Confidence: 0.80
- Avoid setTimeout() and JS timers in scroll/animation logic; use Reanimated-native alternatives like scrollTo with useAnimatedRef. Confidence: 0.85
- Update page state only on momentum end, not during onScroll or drag. Confidence: 0.80
- Import scheduleOnRN and scheduleOnUI from 'react-native-worklets' instead of runOnJS and runOnUI from 'react-native-reanimated'. Confidence: 0.85
- Pass arguments directly to scheduleOnRN/scheduleOnUI (e.g., scheduleOnRN(fn, arg1, arg2)) instead of the curried runOnJS(fn)(args) pattern. Confidence: 0.85
- Use explicit state machines (enum in useSharedValue) instead of boolean flags for carousel/touch states (e.g., IDLE/DRAGGING/MOMENTUM/LOOP_JUMP). Confidence: 0.85
- Use AppState.addEventListener to pause/resume autoplay when app backgrounds (pause on inactive/background, resume on active). Confidence: 0.80
- Pause autoplay on onBeginDrag and resume only after onMomentumEnd, not onEndDrag; avoid timers or debounce hacks for autoplay lifecycle. Confidence: 0.70
- Consumer-facing callbacks (renderItem, onItemPress, onPageChange) should receive logical index only, never render index, in loop mode. Confidence: 0.85
