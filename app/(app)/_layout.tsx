import { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { VoiceBall } from '../../src/components/VoiceBall';
import { VoiceOverlayProvider, useVoiceOverlay } from '../../src/components/VoiceOverlay';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  return (
    <VoiceOverlayProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: '#F4F6FB' },
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: 'rgba(108, 93, 211, 0.08)',
            borderTopWidth: 1,
            height: 64 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom,
            shadowColor: '#6C5DD3',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 8,
          },
          tabBarActiveTintColor: '#6C5DD3',
          tabBarInactiveTintColor: '#8A94A6',
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Inter_600SemiBold',
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon name="today" color={color} /> }}
        />
        <Tabs.Screen
          name="goals"
          options={{ title: 'Goals', tabBarIcon: ({ color }) => <Icon name="goals" color={color} /> }}
        />
        {/* Center voice orb — opens the talk-to-coach overlay (no navigation) */}
        <Tabs.Screen
          name="coach"
          options={{
            title: '',
            tabBarButton: () => <CenterOrbButton />,
          }}
        />
        <Tabs.Screen
          name="retros"
          options={{ title: 'Recap', tabBarIcon: ({ color }) => <Icon name="reflect" color={color} /> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="settings" color={color} /> }}
        />
        <Tabs.Screen name="avoidance" options={{ href: null }} />
        <Tabs.Screen name="goal-detail" options={{ href: null }} />
        <Tabs.Screen name="add" options={{ href: null }} />
      </Tabs>
    </VoiceOverlayProvider>
  );
}

/** Raised, gently-pulsing orb in the center of the nav. Tap → talk to coach overlay. */
function CenterOrbButton() {
  const { open } = useVoiceOverlay();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.07, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.centerWrap} pointerEvents="box-none">
      <Pressable onPress={() => open()} style={styles.centerBtn} hitSlop={10}>
        <Animated.View style={animatedStyle}>
          <VoiceBall state="idle" size={40} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/**
 * Tab icons rendered with react-native-svg (works on web AND native — raw <svg>
 * elements do not render on iOS/Android).
 */
function Icon({ name, color }: { name: 'today' | 'goals' | 'reflect' | 'settings'; color: string }) {
  const size = 20;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {name === 'today' && (
          <>
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <Polyline points="9 22 9 12 15 12 15 22" />
          </>
        )}
        {name === 'goals' && (
          <>
            <Circle cx="12" cy="12" r="9" />
            <Circle cx="12" cy="12" r="5" />
            <Circle cx="12" cy="12" r="1.6" fill={color} stroke="none" />
          </>
        )}
        {name === 'reflect' && (
          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
        )}
        {name === 'settings' && (
          <>
            <Circle cx="12" cy="12" r="3" />
            <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  centerBtn: {
    marginBottom: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
});
