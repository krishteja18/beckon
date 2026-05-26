import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import {
  Canvas, Circle, Group, RadialGradient, LinearGradient, Path, Skia, vec, BlendMode, Paint,
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

/**
 * Glass plasma orb — blue fluid swirling inside a glass sphere.
 * Pure React Native via Skia. Matches the v3 prototype design.
 *
 * Color palette is locked: blue across all states. Only speed + intensity vary.
 */
const PALETTE = {
  c1: [56, 189, 248] as const,   // primary blue
  c2: [14, 116, 180] as const,   // mid blue
  c3: [4, 30, 65] as const,      // deep navy
  bright: [200, 235, 255] as const, // near-white caustic
};

const STATE_CONFIG: Record<VoiceState, { speed: number; intensity: number }> = {
  idle:       { speed: 0.22, intensity: 0.70 },
  listening:  { speed: 0.55, intensity: 0.85 },
  processing: { speed: 1.50, intensity: 1.00 },
  speaking:   { speed: 0.90, intensity: 1.15 },
};

const rgba = (arr: readonly [number, number, number], a: number) =>
  `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`;

export function VoiceBall({ state, size = 88, onPress }: Props) {
  const cfg = STATE_CONFIG[state];
  const H = size / 2;
  const R = size * 0.43;

  // Drive animation with a continuously incrementing time value
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 10000 / cfg.speed, easing: Easing.linear }),
      -1,
      false,
    );
  }, [state, cfg.speed]);

  // Animated paths for the 3 fluid bands (recompute every frame via Skia's frame ticker)
  // For RN Skia, we use Path objects rebuilt from time-based control points.
  const path1 = useDerivedValue(() => {
    const time = t.value;
    const path = Skia.Path.Make();
    const rot = time;
    const sr = R * 1.55;
    const ax = H + Math.cos(rot + Math.PI * 0.85) * sr;
    const ay = H + Math.sin(rot + Math.PI * 0.85) * sr * 0.82;
    const bx = H + Math.cos(rot - Math.PI * 0.55) * sr * 0.88;
    const by = H + Math.sin(rot - Math.PI * 0.55) * sr * 0.75;
    const cp1x = H + Math.cos(rot + Math.PI * 0.1) * R * 1.24;
    const cp1y = H + Math.sin(rot + Math.PI * 0.1) * R * 1.1;
    const cp2x = H + Math.cos(rot - Math.PI * 0.9) * R * 1.16;
    const cp2y = H + Math.sin(rot - Math.PI * 0.9) * R * 1.04;
    path.moveTo(ax, ay);
    path.cubicTo(cp1x, cp1y, cp2x, cp2y, bx, by);
    return path;
  }, [t]);

  const path2 = useDerivedValue(() => {
    const time = t.value * 0.7 + Math.PI * 0.65;
    const path = Skia.Path.Make();
    const ax = H + Math.cos(time) * R * 1.36;
    const ay = H + Math.sin(time) * R * 1.3;
    const bx = H + Math.cos(time + Math.PI * 1.1) * R * 1.44;
    const by = H + Math.sin(time + Math.PI * 1.1) * R * 1.2;
    const cp1x = H + Math.cos(time + Math.PI * 0.35) * R * 0.76;
    const cp1y = H + Math.sin(time + Math.PI * 0.35) * R * 0.84;
    const cp2x = H + Math.cos(time + Math.PI * 0.75) * R * 0.9;
    const cp2y = H + Math.sin(time + Math.PI * 0.75) * R * 0.76;
    path.moveTo(ax, ay);
    path.cubicTo(cp1x, cp1y, cp2x, cp2y, bx, by);
    return path;
  }, [t]);

  const path3 = useDerivedValue(() => {
    const time = t.value * 1.15 + Math.PI * 1.3;
    const path = Skia.Path.Make();
    const ir = R * 0.84;
    const ax = H + Math.cos(time) * ir;
    const ay = H + Math.sin(time) * ir;
    const bx = H + Math.cos(time + Math.PI * 1.25) * ir * 0.9;
    const by = H + Math.sin(time + Math.PI * 1.25) * ir * 0.85;
    const cp1x = H + Math.cos(time + Math.PI * 0.3) * R * 0.56;
    const cp1y = H + Math.sin(time + Math.PI * 0.3) * R * 0.56;
    const cp2x = H + Math.cos(time + Math.PI * 0.85) * R * 0.64;
    const cp2y = H + Math.sin(time + Math.PI * 0.85) * R * 0.5;
    path.moveTo(ax, ay);
    path.cubicTo(cp1x, cp1y, cp2x, cp2y, bx, by);
    return path;
  }, [t]);

  // Caustic blob positions — separate scalars so Skia can bind them directly
  const blob1X = useDerivedValue(() => H + Math.sin(t.value * 0.6) * R * 0.56, [t]);
  const blob1Y = useDerivedValue(() => H + Math.cos(t.value * 0.5) * R * 0.48, [t]);
  const blob2X = useDerivedValue(() => H + Math.sin(t.value * 0.45 + 2.1) * R * 0.44, [t]);
  const blob2Y = useDerivedValue(() => H + Math.cos(t.value * 0.4 + 1.8) * R * 0.4, [t]);

  // Bloom passes for each fluid band (wide dim → thin bright)
  const BLOOM = [
    { w: size * 0.42, a: 0.018 },
    { w: size * 0.31, a: 0.030 },
    { w: size * 0.22, a: 0.048 },
    { w: size * 0.15, a: 0.072 },
    { w: size * 0.10, a: 0.110 },
    { w: size * 0.054, a: 0.170 },
    { w: size * 0.027, a: 0.260 },
    { w: size * 0.012, a: 0.480 },
  ];

  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* outer ambient glow */}
        <Circle cx={H} cy={H} r={R * 1.6}>
          <RadialGradient
            c={vec(H, H)} r={R * 1.6}
            colors={[rgba(PALETTE.c1, 0.12 * cfg.intensity), rgba(PALETTE.c1, 0.04), rgba(PALETTE.c1, 0)]}
            positions={[0, 0.6, 1]}
          />
        </Circle>

        {/* base dark sphere */}
        <Circle cx={H} cy={H} r={R}>
          <RadialGradient
            c={vec(H - R * 0.12, H - R * 0.15)} r={R}
            colors={['#0a2138', '#020a15', '#01030b']}
            positions={[0, 0.55, 1]}
          />
        </Circle>

        {/* fluid bands (clipped to sphere) */}
        <Group
          clip={{ x: H - R, y: H - R, width: R * 2, height: R * 2 }}
          blendMode="screen"
        >
          {/* band 1: bloom passes */}
          {BLOOM.map((b, i) => (
            <Path
              key={`b1-${i}`}
              path={path1}
              style="stroke"
              strokeWidth={b.w}
              strokeCap="round"
              color={rgba(PALETTE.bright, b.a * cfg.intensity * 1.1)}
            />
          ))}

          {/* band 2: counter-sweep */}
          {BLOOM.map((b, i) => (
            <Path
              key={`b2-${i}`}
              path={path2}
              style="stroke"
              strokeWidth={b.w * 0.85}
              strokeCap="round"
              color={rgba(PALETTE.c1, b.a * cfg.intensity * 0.7)}
            />
          ))}

          {/* band 3: inner swirl */}
          {BLOOM.map((b, i) => (
            <Path
              key={`b3-${i}`}
              path={path3}
              style="stroke"
              strokeWidth={b.w * 0.7}
              strokeCap="round"
              color={rgba(PALETTE.bright, b.a * cfg.intensity * 0.55)}
            />
          ))}

          {/* caustic blob 1 */}
          <Circle cx={blob1X} cy={blob1Y} r={R * 0.5} opacity={0.55 * cfg.intensity}
            color={rgba(PALETTE.bright, 0.55 * cfg.intensity)} />

          {/* caustic blob 2 */}
          <Circle cx={blob2X} cy={blob2Y} r={R * 0.42} opacity={0.35 * cfg.intensity}
            color={rgba(PALETTE.bright, 0.35 * cfg.intensity)} />
        </Group>

        {/* edge vignette (rim darkening) */}
        <Circle cx={H} cy={H} r={R}>
          <RadialGradient
            c={vec(H, H)} r={R}
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.62)', 'rgba(0,0,0,0.85)']}
            positions={[0, 0.82, 0.95, 1]}
          />
        </Circle>

        {/* glass rim glow */}
        <Circle cx={H} cy={H} r={R} style="stroke" strokeWidth={1.2}
          color={rgba(PALETTE.c1, 0.18)} />

        {/* specular highlight (top-left) */}
        <Circle cx={H} cy={H} r={R}>
          <RadialGradient
            c={vec(H - R * 0.32, H - R * 0.34)} r={R * 0.46}
            colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
            positions={[0, 0.3, 0.7, 1]}
          />
        </Circle>
      </Canvas>
    </Pressable>
  );
}
