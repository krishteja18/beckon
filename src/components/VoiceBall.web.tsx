import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Props {
  state: VoiceState;
  size?: number;
  onPress?: () => void;
}

export function VoiceBall({ state, size = 120, onPress }: Props) {
  const R = size * 0.38; // Core sphere radius

  // CSS Keyframe styles for various glowing organic liquid-glass reactor animations
  return (
    <Pressable onPress={onPress} style={{ width: size, height: size }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rotateLiquid {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.96); }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.04); }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(0.96); }
        }
        @keyframes breatheEyes {
          0%, 100% { transform: scaleY(1); opacity: 0.9; }
          50% { transform: scaleY(1.2) scaleX(0.95); opacity: 1; }
        }
        @keyframes stretchEyes-speaking {
          0%, 100% { transform: scaleY(1.05) scaleX(0.95); }
          33% { transform: scaleY(1.3) scaleX(0.9); }
          66% { transform: scaleY(0.85) scaleX(1.1); }
        }
        @keyframes blinkEyes {
          0%, 96%, 100% { transform: scaleY(1); }
          98% { transform: scaleY(0.05); }
        }
        @keyframes thinkEyes {
          0%, 100% { transform: scaleY(0.42); }
          50% { transform: scaleY(0.92) scaleX(0.88); }
        }
        @keyframes glowPulse {
          0%, 100% { filter: blur(12px) opacity(0.8); }
          50% { filter: blur(18px) opacity(1); }
        }
        @keyframes wobbleRings {
          0%, 100% { border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%; }
          50% { border-radius: 70% 30% 52% 48% / 60% 40% 60% 40%; }
        }
      `}} />

      <View style={[styles.container, { width: size, height: size }]}>
        
        {/* Soft, beautiful volumetric backing glow (blending lavender/sky-blue aura) */}
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: R * 3.2,
          height: R * 3.2,
          transform: 'translate(-50%, -50%)',
          // @ts-ignore
          background: 'radial-gradient(circle, rgba(108, 93, 211, 0.18) 0%, rgba(56, 189, 248, 0.1) 50%, transparent 100%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          // @ts-ignore
          animation: 'glowPulse 6s ease-in-out infinite',
        }} />

        {/* Liquid Gradient Ring Wrapper (Brand Purple Top, Sky Blue Center, Coral Orange Bottom) */}
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: R * 2.12,
          height: R * 2.12,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          // @ts-ignore
          background: 'linear-gradient(135deg, #6C5DD3 0%, #38BDF8 55%, #FB923C 100%)',
          overflow: 'hidden',
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.25), inset 0 0 12px rgba(255, 255, 255, 0.15)',
          // @ts-ignore
          animation: 'rotateLiquid 14s linear infinite',
          zIndex: 4,
        }}>
          {/* Inner dark core blob to create the "hollow ring" visual look */}
          <View style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '84%',
            height: '84%',
            borderRadius: '50%',
            // @ts-ignore
            background: 'radial-gradient(circle, #1E1B4B 35%, #110E3B 100%)',
          }} />
        </View>

        {/* Organic Morphing Plasma Energy center (inside the main glass sphere) */}
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: R * 1.76,
          height: R * 1.76,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          // @ts-ignore
          background: 'radial-gradient(circle at 50% 45%, #1E1B4B 0%, #110E3B 100%)',
          boxShadow: 'inset 0 0 20px rgba(56, 189, 248, 0.35)',
          overflow: 'hidden',
          zIndex: 5,
        }}>
          {/* Internal blurred plasma colors (Sky-Blue & Brand-Purple morphs) */}
          <View style={{
            position: 'absolute',
            top: '-20%',
            left: '-20%',
            width: '140%',
            height: '140%',
            // @ts-ignore
            filter: 'blur(12px)',
            opacity: 0.8,
            // @ts-ignore
            animation: 'wobbleRings 9s ease-in-out infinite',
            mixBlendMode: 'screen',
          }}>
            {/* Sky-Blue Blob */}
            <View style={{
              position: 'absolute',
              bottom: '10%',
              left: '10%',
              width: '65%',
              height: '65%',
              // @ts-ignore
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.8) 0%, transparent 70%)',
            }} />
            
            {/* Brand-Purple Blob */}
            <View style={{
              position: 'absolute',
              top: '10%',
              right: '10%',
              width: '60%',
              height: '60%',
              // @ts-ignore
              background: 'radial-gradient(circle, rgba(108, 93, 211, 0.6) 0%, transparent 70%)',
            }} />
          </View>

          {/* TWO NEON GLOWING WHITE EYES (||) */}
          <View style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            flexDirection: 'row',
            gap: R * 0.28,
            zIndex: 10,
          }}>
            {/* Left Eye */}
            <View style={{
              width: R * 0.14,
              height: R * 0.36,
              borderRadius: R * 0.08,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.85), 0 0 20px rgba(255, 255, 255, 0.4)',
              transformOrigin: 'center center',
              // @ts-ignore
              animation: state === 'speaking'
                ? 'stretchEyes-speaking 1.2s ease-in-out infinite'
                : state === 'processing'
                ? 'thinkEyes 0.7s ease-in-out infinite'
                : state === 'listening'
                ? 'breatheEyes 2s ease-in-out infinite'
                : 'blinkEyes 6s ease-in-out infinite',
            }} />

            {/* Right Eye */}
            <View style={{
              width: R * 0.14,
              height: R * 0.36,
              borderRadius: R * 0.08,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 0 10px rgba(255, 255, 255, 0.85), 0 0 20px rgba(255, 255, 255, 0.4)',
              transformOrigin: 'center center',
              // @ts-ignore
              animation: state === 'speaking'
                ? 'stretchEyes-speaking 1.2s ease-in-out infinite 0.1s' // slight phase offset for organic look
                : state === 'processing'
                ? 'thinkEyes 0.7s ease-in-out infinite 0.12s'
                : state === 'listening'
                ? 'breatheEyes 2s ease-in-out infinite 0.1s'
                : 'blinkEyes 6s ease-in-out infinite',
            }} />
          </View>

          {/* Volumetric spherical glass gloss layer */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            // @ts-ignore
            background: 'radial-gradient(circle, rgba(0,0,0,0) 50%, rgba(1,2,5,0.75) 85%, rgba(0,0,0,0.95) 100%)',
            pointerEvents: 'none',
            zIndex: 11,
          }} />

          {/* Specular glass reflection caustics */}
          <View style={{
            position: 'absolute',
            top: '8%',
            left: '8%',
            width: '38%',
            height: '38%',
            // @ts-ignore
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.06) 50%, transparent 100%)',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 12,
          }} />
        </View>

        {/* Clean Rim Light Overlay */}
        <View style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: R * 1.76,
          height: R * 1.76,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          borderWidth: 1.2,
          borderColor: 'rgba(108, 93, 211, 0.2)',
          pointerEvents: 'none',
          zIndex: 14,
        }} />

      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
