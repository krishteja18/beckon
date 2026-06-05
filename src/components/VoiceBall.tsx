import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import {
  Canvas, Circle, Group, RadialGradient, vec, BlurMask, Line, LinearGradient,
} from '@shopify/react-native-skia';
import {
  useSharedValue, useDerivedValue, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Props {
  state: VoiceState;
  size?: number;
  onPress?: () => void;
}

export function VoiceBall({ state, size = 120, onPress }: Props) {
  const H = size / 2;
  const R = size * 0.38; // Core sphere radius

  // Continuous animation clock swept at 60 FPS
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
  }, [state]);

  // Derived morphing parameters for the organic liquid core plasma
  const blob1X = useDerivedValue(() => H + Math.cos(t.value * 1.2) * R * 0.15, [t]);
  const blob1Y = useDerivedValue(() => H + Math.sin(t.value * 1.0) * R * 0.12, [t]);
  const blob1R = useDerivedValue(() => R * (0.65 + Math.sin(t.value * 0.8) * 0.05), [t]);

  const blob2X = useDerivedValue(() => H + Math.sin(t.value * 0.95 + 1.2) * R * 0.18, [t]);
  const blob2Y = useDerivedValue(() => H + Math.cos(t.value * 1.1 + 0.8) * R * 0.15, [t]);
  const blob2R = useDerivedValue(() => R * (0.58 + Math.cos(t.value * 0.7) * 0.06), [t]);

  // Dynamic eye heights and blink scale driven by State
  const eyeScaleY = useDerivedValue(() => {
    if (state === 'speaking') {
      // Energetic voice stretch
      return 1.0 + Math.sin(t.value * 4.5) * 0.18;
    }
    if (state === 'listening') {
      // Soft breathing
      return 1.0 + Math.sin(t.value * 1.8) * 0.08;
    }
    // Idle state: periodically blink
    const sweep = t.value % (2 * Math.PI);
    if (sweep > 5.8 && sweep < 6.0) {
      return 0.08; // close eyes quickly
    }
    return 1.0;
  }, [t, state]);

  const eyeHalfHeight = R * 0.18;
  const leftEyeY1 = useDerivedValue(() => H - eyeHalfHeight * eyeScaleY.value, [eyeScaleY]);
  const leftEyeY2 = useDerivedValue(() => H + eyeHalfHeight * eyeScaleY.value, [eyeScaleY]);

  const rightEyeY1 = useDerivedValue(() => {
    // slight phase offset for right eye to look more organic
    const offsetScale = state === 'speaking' ? 1.0 + Math.sin(t.value * 4.5 + 0.6) * 0.18 : eyeScaleY.value;
    return H - eyeHalfHeight * offsetScale;
  }, [t, state, eyeScaleY]);

  const rightEyeY2 = useDerivedValue(() => {
    const offsetScale = state === 'speaking' ? 1.0 + Math.sin(t.value * 4.5 + 0.6) * 0.18 : eyeScaleY.value;
    return H + eyeHalfHeight * offsetScale;
  }, [t, state, eyeScaleY]);

  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        
        {/* Soft, deep volumetric back-overlay glow */}
        <Circle cx={H} cy={H} r={R * 1.8}>
          <RadialGradient
            c={vec(H, H)}
            r={R * 1.8}
            colors={['rgba(108, 93, 211, 0.15)', 'rgba(56, 189, 248, 0.05)', 'transparent']}
            positions={[0, 0.55, 1]}
          />
        </Circle>

        {/* Concentric liquid gradient ring */}
        <Circle cx={H} cy={H} r={R * 1.15} style="stroke" strokeWidth={R * 0.18}>
          <LinearGradient
            start={vec(H - R, H - R)}
            end={vec(H + R, H + R)}
            colors={['#6C5DD3', '#38BDF8', '#FB923C']}
          />
        </Circle>

        {/* Central Reactor Core Sphere */}
        <Circle cx={H} cy={H} r={R * 0.88}>
          <RadialGradient
            c={vec(H - R * 0.08, H - R * 0.15)}
            r={R * 0.88}
            colors={['#1E1B4B', '#110E3B', '#0D0A2B']}
            positions={[0, 0.75, 1]}
          />
        </Circle>

        {/* Morphing internal plasma energy layer (clipped to core sphere) */}
        <Group
          clip={{ x: H - R * 0.86, y: H - R * 0.86, width: R * 1.72, height: R * 1.72 }}
          blendMode="screen"
        >
          {/* Teal Plasma Blob */}
          <Circle cx={blob1X as any} cy={blob1Y as any} r={blob1R as any}>
            <BlurMask blur={R * 0.28} style="normal" />
            <RadialGradient
              c={vec(blob1X.value, blob1Y.value)}
              r={blob1R.value}
              colors={['rgba(56, 189, 248, 0.75)', 'transparent']}
            />
          </Circle>

          {/* Lime Plasma Blob */}
          <Circle cx={blob2X as any} cy={blob2Y as any} r={blob2R as any}>
            <BlurMask blur={R * 0.28} style="normal" />
            <RadialGradient
              c={vec(blob2X.value, blob2Y.value)}
              r={blob2R.value}
              colors={['rgba(108, 93, 211, 0.5)', 'transparent']}
            />
          </Circle>
        </Group>

        {/* Two glowing white neon vertical eyes (||) */}
        <Group>
          {/* Left Eye */}
          <Line
            p1={vec(H - R * 0.22, leftEyeY1.value as any)}
            p2={vec(H - R * 0.22, leftEyeY2.value as any)}
            strokeWidth={R * 0.12}
            strokeCap="round"
            color="#FFFFFF"
          />

          {/* Right Eye */}
          <Line
            p1={vec(H + R * 0.22, rightEyeY1.value as any)}
            p2={vec(H + R * 0.22, rightEyeY2.value as any)}
            strokeWidth={R * 0.12}
            strokeCap="round"
            color="#FFFFFF"
          />
        </Group>

        {/* Volumetric spherical glass gloss layer */}
        <Circle cx={H} cy={H} r={R * 0.88}>
          <RadialGradient
            c={vec(H, H)}
            r={R * 0.88}
            colors={['rgba(0,0,0,0)', 'rgba(1,2,5,0.68)', 'rgba(0,0,0,0.95)']}
            positions={[0, 0.82, 1]}
          />
        </Circle>

        {/* Specular glass caustic reflections */}
        <Circle cx={H} cy={H} r={R * 0.88}>
          <RadialGradient
            c={vec(H - R * 0.36, H - R * 0.4)}
            r={R * 0.48}
            colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.05)', 'transparent']}
            positions={[0, 0.4, 1]}
          />
        </Circle>

        {/* Thin elegant rim border */}
        <Circle
          cx={H}
          cy={H}
          r={R * 0.88}
          style="stroke"
          strokeWidth={1.2}
          color="rgba(108, 93, 211, 0.2)"
        />

      </Canvas>
    </Pressable>
  );
}
