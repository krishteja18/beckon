import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Rect, RadialGradient, vec, Group, Circle } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';

interface Props {
  children?: React.ReactNode;
}

const PARTICLE_COUNT = 12;

export function AmbientBackground({ children }: Props) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // reverse on repeat for organic breathing feel
    );
  }, []);

  const particles = useMemo(() => {
    const list = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      list.push({
        x: Math.random() * width,
        startY: Math.random() * height,
        speed: 0.2 + Math.random() * 0.4,
        size: 3.0 + Math.random() * 4.0,
        opacity: 0.03 + Math.random() * 0.08,
        color: i % 2 === 0 ? '#6C5DD3' : '#38BDF8', // Brand purple or accent cyan
      });
    }
    return list;
  }, [width, height]);

  // Derived centers for pulsing auroras
  const violetCenter = useDerivedValue(() => {
    const offset = progress.value * 30;
    return vec(width * 0.95 + offset, -50 + offset * 0.5);
  }, [progress, width]);

  const blueCenter = useDerivedValue(() => {
    const offset = progress.value * 25;
    return vec(width * 0.05 - offset, -30 + offset * 0.8);
  }, [progress, width]);

  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Soft Lavender Light Base */}
        <Rect x={0} y={0} width={width} height={height} color="#F4F6FB" />

        {/* Premium Aurora Gradients */}
        <Group>
          {/* Top-Right Lavender Aurora */}
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={violetCenter}
              r={width * 1.0}
              colors={['rgba(108, 93, 211, 0.08)', 'rgba(236, 239, 250, 0.01)', 'transparent']}
              positions={[0, 0.6, 1]}
            />
          </Rect>

          {/* Top-Left Deep Blue/Indigo Aurora */}
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={blueCenter}
              r={width * 0.9}
              colors={['rgba(56, 189, 248, 0.05)', 'rgba(236, 239, 250, 0.01)', 'transparent']}
              positions={[0, 0.5, 1]}
            />
          </Rect>

          {/* Bottom Center Soft Glow */}
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient
              c={vec(width * 0.5, height * 1.2)}
              r={width * 0.9}
              colors={['rgba(108, 93, 211, 0.03)', 'transparent']}
              positions={[0, 1]}
            />
          </Rect>
        </Group>

        {/* Floating Soft Auroral Particles */}
        {particles.map((p, idx) => {
          const animatedY = useDerivedValue(() => {
            const deltaY = progress.value * height * p.speed;
            let currentY = p.startY - deltaY;
            if (currentY < -50) {
              currentY += height + 100;
            }
            return currentY;
          }, [progress]);

          return (
            <Circle
              key={`native-p-${idx}`}
              cx={p.x}
              cy={animatedY as any}
              r={p.size}
              color={p.color}
              opacity={p.opacity}
            />
          );
        })}
      </Canvas>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
});
