import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: { transform: [{ scale: 1 }], opacity: 1 },
    20: { opacity: 1 },
    70: { opacity: 0, easing: Easing.elastic(0.7) },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  const mark = (
    <View style={styles.mark}>
      <Text style={styles.bolt}>ϟ</Text>
    </View>
  );

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      style={styles.splashOverlay}>
      {mark}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        void SplashScreen.hideAsync().finally(() => setAnimate(true));
      }}
      style={styles.splashOverlay}>
      {mark}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 82,
    height: 82,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolt: { color: '#FF6B35', fontSize: 54, fontWeight: '900', lineHeight: 58 },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
