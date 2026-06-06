import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, ViewStyle } from 'react-native';
import { Canvas, Group, Path, Points, BlurMask, LinearGradient, Skia, vec, useClock } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Props {
  state: VoiceState;
  /** Live 0..1 audio level (shared value) — bounces the wave with real loudness. */
  amplitude?: SharedValue<number>;
  containerStyle?: ViewStyle;
  height?: number;
}

const STATE_VOL: Record<VoiceState, number> = {
  idle: 0.2,
  listening: 0.6,
  processing: 0.4,
  speaking: 1.0,
};

const COLORS = ['#E4A134', '#D537B0', '#0059FF', '#00C363'];
const POSITIONS = [0.0, 0.3, 0.65, 1.0];

export function CallWaves({ state, amplitude, containerStyle, height = 160 }: Props) {
  const { width } = useWindowDimensions();
  const clock = useClock();
  const stateVol = STATE_VOL[state] ?? 0.3;

  const cy = height / 2;
  const twistFreq = (Math.PI * 2 * 1.1) / width;
  const twistSpeed = 0.5;
  const f1 = (Math.PI * 2 * 1.2) / width;
  const f2 = (Math.PI * 2 * 2.6) / width;

  // Fixed ribbon-surface buffer: a (along), w (across), hover seeds.
  const particles = useMemo(
    () =>
      Array.from({ length: 1100 }, () => ({
        a: Math.random(),
        w: Math.random() * 2 - 1,
        drift: 0.4 + Math.random() * 1.4,
        seed: Math.random() * Math.PI * 2,
      })),
    [],
  );

  const wavePath = useDerivedValue(() => {
    'worklet';
    const t = clock.value / 1000;
    const live = amplitude ? amplitude.value : -1;
    const vol = live >= 0 ? Math.max(stateVol * 0.5, Math.min(1, live)) : stateVol;
    const v = 0.15 + vol * 0.85;
    const A = 14 + v * 18;
    const p = Skia.Path.Make();
    for (let x = 0; x <= width; x += 10) {
      const y = cy + A * Math.sin(f1 * x + 0.6 * t) + A * 0.35 * Math.sin(f2 * x - 0.9 * t);
      if (x === 0) p.moveTo(x, y); else p.lineTo(x, y);
    }
    return p;
  }, [clock, stateVol, amplitude, width, height]);

  const points = useDerivedValue(() => {
    'worklet';
    const t = clock.value / 1000;
    const live = amplitude ? amplitude.value : -1;
    const vol = live >= 0 ? Math.max(stateVol * 0.5, Math.min(1, live)) : stateVol;
    const v = 0.15 + vol * 0.85;
    const A = 14 + v * 18;
    const halfW = 26 + v * 34;
    return particles.map(p => {
      const x = p.a * width;
      const phi = x * twistFreq + t * twistSpeed;
      const yc = cy + A * Math.sin(f1 * x + 0.6 * t) + A * 0.35 * Math.sin(f2 * x - 0.9 * t);
      const y = yc + p.w * halfW * Math.cos(phi) + Math.sin(p.drift * t + p.seed) * 4;
      return vec(x, y);
    });
  }, [clock, stateVol, amplitude, width, height, particles]);

  return (
    <View style={[styles.default, containerStyle]} pointerEvents="none">
      <Canvas style={{ flex: 1 }}>
        {/* Ambient bloom following the centerline */}
        <Group>
          <BlurMask blur={26} style="normal" />
          <Path path={wavePath} style="stroke" strokeWidth={34} strokeCap="round" opacity={0.4}>
            <LinearGradient start={vec(0, 0)} end={vec(width, 0)} colors={COLORS} positions={POSITIONS} />
          </Path>
        </Group>

        {/* Twisting 3D ribbon as a particle field */}
        <Group>
          <BlurMask blur={1.6} style="normal" />
          <Points points={points} mode="points" strokeWidth={3} strokeCap="round">
            <LinearGradient start={vec(0, 0)} end={vec(width, 0)} colors={COLORS} positions={POSITIONS} />
          </Points>
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  default: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 2,
  },
});
