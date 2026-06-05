import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  children?: React.ReactNode;
}

const PARTICLE_COUNT = 12;

export function AmbientBackground({ children }: Props) {
  // Create randomized parameters for our premium soft data dust particles
  const particles = useMemo(() => {
    const list = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const size = 3.0 + Math.random() * 5.0; // slightly larger, softer glowing circles
      const startX = Math.random() * 100; // percentage based
      const duration = 16 + Math.random() * 24; // slower, calmer drift
      const delay = -Math.random() * duration; 
      const opacity = 0.03 + Math.random() * 0.08; // extremely subtle
      const color = i % 2 === 0 ? '#6C5DD3' : '#38BDF8'; // Brand purple or accent cyan

      list.push({ size, startX, duration, delay, opacity, color });
    }
    return list;
  }, []);

  return (
    <View style={styles.container}>
      {/* Dynamic CSS Keyframes for slow, elegant floating auroral particles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatSlow {
          0% {
            transform: translateY(105vh) scale(0.8);
            opacity: 0;
          }
          10%, 90% {
            opacity: var(--opac);
          }
          100% {
            transform: translateY(-10vh) scale(1.2);
            opacity: 0;
          }
        }
        @keyframes pulseAurora {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}} />

      {/* Holographic Glowing Nebulas (Aurora Sweeps) */}
      <View style={styles.nebulaWrapper} pointerEvents="none">
        {/* Top-Right Premium Violet/Lavender Aurora Sweep */}
        <View style={{
          position: 'absolute',
          top: '-15%',
          right: '-15%',
          width: '70%',
          height: '70%',
          // @ts-ignore
          background: 'radial-gradient(circle, rgba(108, 93, 211, 0.08) 0%, rgba(236, 239, 250, 0.01) 60%, transparent 100%)',
          // @ts-ignore
          filter: 'blur(80px)',
          // @ts-ignore
          animation: 'pulseAurora 12s ease-in-out infinite',
        }} />

        {/* Top-Left Deep Indigo/Blue Aurora Sweep */}
        <View style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '65%',
          height: '65%',
          // @ts-ignore
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.05) 0%, rgba(236, 239, 250, 0.01) 50%, transparent 100%)',
          // @ts-ignore
          filter: 'blur(70px)',
          // @ts-ignore
          animation: 'pulseAurora 16s ease-in-out infinite alternate',
        }} />

        {/* Bottom Center Subtle Lavender Glow */}
        <View style={{
          position: 'absolute',
          bottom: '-30%',
          left: '15%',
          width: '70%',
          height: '60%',
          // @ts-ignore
          background: 'radial-gradient(circle, rgba(108, 93, 211, 0.03) 0%, transparent 100%)',
          // @ts-ignore
          filter: 'blur(90px)',
        }} />
      </View>

      {/* Floating Soft Auroral Particles */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {particles.map((p, idx) => (
          <View
            key={`web-p-${idx}`}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${p.startX}%`,
              width: p.size * 2,
              height: p.size * 2,
              borderRadius: '50%',
              // @ts-ignore
              backgroundColor: p.color,
              // @ts-ignore
              boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
              // @ts-ignore
              '--opac': p.opacity,
              // @ts-ignore
              animation: `floatSlow ${p.duration}s ease-in-out infinite`,
              // @ts-ignore
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
    position: 'relative',
  },
  nebulaWrapper: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
