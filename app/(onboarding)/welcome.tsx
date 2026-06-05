import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { VoiceBall } from '../../src/components/VoiceBall';
import { AmbientBackground } from '../../src/components/AmbientBackground';

// Simple Vector Icons inside pure React Native Views for cross-platform compatibility
function FlameIcon({ size = 16, color = '#FB923C' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
      </svg>
    </View>
  );
}

function DropIcon({ size = 16, color = '#38BDF8' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"></path>
      </svg>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();

  // Floating animations for components in the "Welcome Kit"
  const floatY1 = useSharedValue(0);
  const floatY2 = useSharedValue(0);
  const floatY3 = useSharedValue(0);

  useEffect(() => {
    floatY1.value = withRepeat(
      withTiming(8, { duration: 2600 }),
      -1,
      true
    );
    floatY2.value = withRepeat(
      withTiming(-8, { duration: 3200 }),
      -1,
      true
    );
    floatY3.value = withRepeat(
      withTiming(6, { duration: 2200 }),
      -1,
      true
    );
  }, []);

  const leftCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatY1.value },
        { rotate: '-10deg' }
      ]
    };
  });

  const rightCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatY2.value },
        { rotate: '10deg' }
      ]
    };
  });

  const centerOrbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatY3.value }
      ]
    };
  });

  return (
    <AmbientBackground>
      <SafeAreaView style={styles.container}>
        
        {/* Sleek Header Spacer */}
        <View style={styles.headerSpacer} />

        {/* Floating Welcome Kit Showcase Graphic */}
        <View style={styles.centerSection}>
          <View style={styles.kitContainer}>
            
            {/* Background Layer 1: Left Calorie Float Card */}
            <Animated.View style={[styles.miniCard, styles.leftCard, leftCardStyle]}>
              <View style={styles.iconCircleOrange}>
                <FlameIcon size={16} color="#FB923C" />
              </View>
              <Text style={styles.miniCardTitle}>Energy</Text>
              <Text style={styles.miniCardVal}>450 cal</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: '#FB923C', width: '40%' }]} />
              </View>
            </Animated.View>

            {/* Background Layer 2: Right Hydration Float Card */}
            <Animated.View style={[styles.miniCard, styles.rightCard, rightCardStyle]}>
              <View style={styles.iconCircleBlue}>
                <DropIcon size={16} color="#38BDF8" />
              </View>
              <Text style={styles.miniCardTitle}>Hydration</Text>
              <Text style={styles.miniCardVal}>680 ml</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: '#38BDF8', width: '60%' }]} />
              </View>
            </Animated.View>

            {/* Foreground Layer 3: Spectacular Reactor Orb in center */}
            <Animated.View style={[styles.orbWrapper, centerOrbStyle]}>
              <VoiceBall state="speaking" size={200} />
            </Animated.View>

          </View>

          {/* Typography Presentation */}
          <View className="items-center gap-2 px-6 mt-12">
            <Text style={styles.eyebrow}>YOUR DAILY AI COACH</Text>
            <Text style={styles.title}>
              Welcome to {'\n'}
              <Text style={styles.highlightText}>Showup</Text>
            </Text>
            <Text style={styles.subtitle}>
              Voice-first accountability that calls you on your exact schedule.
              No judgment. Only support and execution.
            </Text>
          </View>
        </View>

        {/* Buttons / CTAs */}
        <View className="px-6 pb-12 gap-3">
          <Pressable
            onPress={() => router.push('/(onboarding)/auth')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              GET STARTED
            </Text>
          </Pressable>
          
          <Pressable
            onPress={() => router.push('/(onboarding)/auth')}
            className="items-center py-3"
          >
            <Text style={styles.secondaryButtonText}>
              ALREADY HAVE AN ACCOUNT? SIGN IN
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerSpacer: {
    height: 30,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
    width: '100%',
  },
  kitContainer: {
    position: 'relative',
    width: 280,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCard: {
    position: 'absolute',
    width: 105,
    height: 105,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
  },
  leftCard: {
    left: 0,
    top: 50,
    zIndex: 2,
  },
  rightCard: {
    right: 0,
    top: 50,
    zIndex: 2,
  },
  iconCircleOrange: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBlue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCardTitle: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'Inter_600SemiBold',
  },
  miniCardVal: {
    fontSize: 13,
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
    marginTop: -2,
  },
  progressBarBg: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  orbWrapper: {
    zIndex: 10,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 36,
    elevation: 12,
  },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#6C5DD3',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#1E1B4B',
    fontSize: 34,
    letterSpacing: -1.2,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 40,
  },
  highlightText: {
    color: '#6C5DD3',
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    paddingHorizontal: 24,
    textAlign: 'center',
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: '#6C5DD3',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#6C5DD3',
    letterSpacing: 0.6,
  },
});

