import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Rect, RadialGradient, vec } from '@shopify/react-native-skia';

interface Props {
  children?: React.ReactNode;
}

/**
 * Premium Gemini ambient background.
 * Renders hardware-accelerated dark space color fields using Skia.
 * Combines soft, wide blurred violet and blue light leaks with a deep slate background.
 */
export function AmbientBackground({ children }: Props) {
  return (
    <View style={styles.container}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Fill deep space background color */}
        <Rect x={0} y={0} width={1000} height={2000} color="#03050C" />

        {/* Wide top-left violet ambient light leak */}
        <Rect x={0} y={0} width={1000} height={2000}>
          <RadialGradient
            c={vec(100, -50)}
            r={550}
            colors={['rgba(168, 85, 247, 0.08)', 'rgba(79, 70, 229, 0.03)', 'transparent']}
            positions={[0, 0.5, 1]}
          />
        </Rect>

        {/* Wide top-right sky blue ambient light leak */}
        <Rect x={0} y={0} width={1000} height={2000}>
          <RadialGradient
            c={vec(900, 100)}
            r={650}
            colors={['rgba(6, 182, 212, 0.07)', 'rgba(66, 133, 244, 0.02)', 'transparent']}
            positions={[0, 0.55, 1]}
          />
        </Rect>

        {/* Subtle center-bottom indigo ambient glow */}
        <Rect x={0} y={0} width={1000} height={2000}>
          <RadialGradient
            c={vec(500, 1600)}
            r={700}
            colors={['rgba(79, 70, 229, 0.04)', 'rgba(236, 72, 153, 0.01)', 'transparent']}
            positions={[0, 0.6, 1]}
          />
        </Rect>
      </Canvas>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03050C',
  },
});
