import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import {
  Canvas, Circle, Group, RadialGradient, vec, BlendMode, BlurMask,
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

// Google Gemini brand neon-glowing color scale
const COLORS = {
  cyan: [6, 182, 212] as const,     // Sky Cyan
  violet: [168, 85, 247] as const,  // Neon Violet
  pink: [236, 72, 153] as const,    // Magenta Pink
  amber: [245, 158, 11] as const,    // Golden Amber
  blue: [66, 133, 244] as const,     // Gemini Blue
  indigo: [79, 70, 229] as const,    // Gemini Indigo
  white: [255, 255, 255] as const,   // Specular Core
};

// Dynamics for different AI states
const STATE_CONFIG: Record<VoiceState, { speed: number; intensity: number; scale: number }> = {
  idle:       { speed: 0.5,  intensity: 0.65, scale: 0.95 },
  listening:  { speed: 1.5,  intensity: 1.10, scale: 1.05 }, // active expansion, highly receptive
  processing: { speed: 3.4,  intensity: 1.45, scale: 1.02 }, // intense, fast colorful swirl
  speaking:   { speed: 2.1,  intensity: 1.30, scale: 1.15 }, // dynamic pulsation mapping speech
};

const rgba = (arr: readonly [number, number, number], a: number) =>
  `rgba(${arr[0]},${arr[1]},${arr[2]},${a})`;

export function VoiceBall({ state, size = 120, onPress }: Props) {
  const cfg = STATE_CONFIG[state];
  const H = size / 2;
  const R = size * 0.44;

  // Shared value continuously incrementing to drive smooth, hardware-accelerated time loops
  const t = useSharedValue(0);
  const orbScale = useSharedValue(cfg.scale);

  useEffect(() => {
    // Smooth transition of overall orb scaling when state changes
    orbScale.value = withTiming(cfg.scale, { duration: 450, easing: Easing.out(Easing.back(1.5)) });

    // Continuous time loop with speed based on active voice state
    t.value = 0;
    t.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 8000 / cfg.speed, easing: Easing.linear }),
      -1,
      false,
    );
  }, [state, cfg.speed, cfg.scale]);

  // Dynamic trigonometry to morph 4 colorful blobs organic liquid shapes

  // 1. Blob Cyan: Swirling gently in top-left sector
  const blob1X = useDerivedValue(() => {
    const angle = t.value * 0.7;
    return H + Math.cos(angle) * R * 0.28;
  }, [t]);
  const blob1Y = useDerivedValue(() => {
    const angle = t.value * 0.8;
    return H + Math.sin(angle) * R * 0.25;
  }, [t]);
  const blob1R = useDerivedValue(() => {
    const multiplier = 0.58 + Math.sin(t.value * 0.5) * 0.08 * cfg.intensity;
    return R * multiplier;
  }, [t]);

  // 2. Blob Violet: Swirling opposite in bottom-right sector
  const blob2X = useDerivedValue(() => {
    const angle = t.value * 0.65 + 1.8;
    return H + Math.sin(angle) * R * 0.32;
  }, [t]);
  const blob2Y = useDerivedValue(() => {
    const angle = t.value * 0.75 + 1.0;
    return H + Math.cos(angle) * R * 0.28;
  }, [t]);
  const blob2R = useDerivedValue(() => {
    const multiplier = 0.52 + Math.cos(t.value * 0.6) * 0.07 * cfg.intensity;
    return R * multiplier;
  }, [t]);

  // 3. Blob Pink: Shifting in wide oval diagonal
  const blob3X = useDerivedValue(() => {
    const angle = t.value * 0.9 + 3.1;
    return H + Math.cos(angle) * R * 0.26;
  }, [t]);
  const blob3Y = useDerivedValue(() => {
    const angle = t.value * 0.85 + 2.2;
    return H + Math.sin(angle) * R * 0.30;
  }, [t]);
  const blob3R = useDerivedValue(() => {
    const multiplier = 0.48 + Math.sin(t.value * 0.4) * 0.09 * cfg.intensity;
    return R * multiplier;
  }, [t]);

  // 4. Blob Gold/Amber: Floating randomly to add warm highlights
  const blob4X = useDerivedValue(() => {
    const angle = t.value * 0.55 + 4.5;
    return H + Math.sin(angle) * R * 0.34;
  }, [t]);
  const blob4Y = useDerivedValue(() => {
    const angle = t.value * 0.7 + 2.8;
    return H + Math.cos(angle) * R * 0.32;
  }, [t]);
  const blob4R = useDerivedValue(() => {
    const multiplier = 0.38 + Math.cos(t.value * 0.8) * 0.06 * cfg.intensity;
    return R * multiplier;
  }, [t]);

  // 5. White Core: Pulsing in the middle to create the glowing volumetric core light
  const coreX = useDerivedValue(() => {
    return H + Math.sin(t.value * 0.45) * R * 0.08;
  }, [t]);
  const coreY = useDerivedValue(() => {
    return H + Math.cos(t.value * 0.45) * R * 0.08;
  }, [t]);
  const coreR = useDerivedValue(() => {
    // Dynamic breathing pulse based on speaking state to visualize voice
    const pulse = state === 'speaking' ? Math.sin(t.value * 3.5) * 0.07 : Math.sin(t.value * 1.1) * 0.03;
    return R * (0.24 + pulse * cfg.intensity);
  }, [t, state]);

  // Dynamic blur sigma proportional to the ball size to keep visual consistency
  const blurSigma = size * 0.15;

  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* Soft, outer, borderless ambient aura */}
        <Circle cx={H} cy={H} r={R * 1.75}>
          <RadialGradient
            c={vec(H, H)}
            r={R * 1.75}
            colors={[
              rgba(COLORS.violet, 0.15 * cfg.intensity),
              rgba(COLORS.cyan, 0.05 * cfg.intensity),
              'transparent',
            ]}
            positions={[0, 0.55, 1]}
          />
        </Circle>

        {/* Base dark backdrop containing fluid sphere */}
        <Circle cx={H} cy={H} r={R}>
          <RadialGradient
            c={vec(H - R * 0.1, H - R * 0.15)}
            r={R}
            colors={['#0c0f20', '#050711', '#010207']}
            positions={[0, 0.65, 1]}
          />
        </Circle>

        {/* Volumetric Glowing Fluid Group (using Screen Blend Mode to make overlapping elements bloom) */}
        <Group
          clip={{ x: H - R, y: H - R, width: R * 2, height: R * 2 }}
          blendMode="screen"
        >
          {/* Cyan Blob */}
          <Circle cx={blob1X as any} cy={blob1Y as any} r={blob1R as any}>
            <BlurMask blur={blurSigma} style="normal" />
            <RadialGradient
              c={vec(blob1X.value, blob1Y.value)}
              r={blob1R.value}
              colors={[rgba(COLORS.cyan, 0.88), rgba(COLORS.blue, 0.3), 'transparent']}
            />
          </Circle>

          {/* Violet Blob */}
          <Circle cx={blob2X as any} cy={blob2Y as any} r={blob2R as any}>
            <BlurMask blur={blurSigma} style="normal" />
            <RadialGradient
              c={vec(blob2X.value, blob2Y.value)}
              r={blob2R.value}
              colors={[rgba(COLORS.violet, 0.90), rgba(COLORS.indigo, 0.3), 'transparent']}
            />
          </Circle>

          {/* Pink Blob */}
          <Circle cx={blob3X as any} cy={blob3Y as any} r={blob3R as any}>
            <BlurMask blur={blurSigma} style="normal" />
            <RadialGradient
              c={vec(blob3X.value, blob3Y.value)}
              r={blob3R.value}
              colors={[rgba(COLORS.pink, 0.85), rgba(COLORS.violet, 0.2), 'transparent']}
            />
          </Circle>

          {/* Golden Amber Blob */}
          <Circle cx={blob4X as any} cy={blob4Y as any} r={blob4R as any}>
            <BlurMask blur={blurSigma} style="normal" />
            <RadialGradient
              c={vec(blob4X.value, blob4Y.value)}
              r={blob4R.value}
              colors={[rgba(COLORS.amber, 0.75), rgba(COLORS.pink, 0.15), 'transparent']}
            />
          </Circle>

          {/* White Volumetric Glowing Core */}
          <Circle cx={coreX as any} cy={coreY as any} r={coreR as any}>
            <BlurMask blur={blurSigma * 0.4} style="normal" />
            <RadialGradient
              c={vec(coreX.value, coreY.value)}
              r={coreR.value}
              colors={['#ffffff', rgba(COLORS.white, 0.6), 'transparent']}
            />
          </Circle>
        </Group>

        {/* High-end glass vignette overlay to give volumetric sphere lighting */}
        <Circle cx={H} cy={H} r={R}>
          <RadialGradient
            c={vec(H, H)}
            r={R}
            colors={['rgba(0,0,0,0)', 'rgba(2,4,10,0.06)', 'rgba(2,4,10,0.60)', 'rgba(1,2,5,0.85)']}
            positions={[0, 0.72, 0.94, 1]}
          />
        </Circle>

        {/* Specular light caustics - top-left gloss curve */}
        <Circle cx={H} cy={H} r={R}>
          <RadialGradient
            c={vec(H - R * 0.38, H - R * 0.40)}
            r={R * 0.52}
            colors={[
              'rgba(255, 255, 255, 0.28)',
              'rgba(255, 255, 255, 0.12)',
              'rgba(255, 255, 255, 0.03)',
              'transparent',
            ]}
            positions={[0, 0.28, 0.65, 1]}
          />
        </Circle>

        {/* Dynamic neon glass rim glow */}
        <Circle
          cx={H}
          cy={H}
          r={R}
          style="stroke"
          strokeWidth={1.3}
          color={rgba(COLORS.violet, 0.25)}
        />
      </Canvas>
    </Pressable>
  );
}
