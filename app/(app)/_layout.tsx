import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path, Polyline, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { VoiceBall } from '../../src/components/VoiceBall';
import { VoiceOverlayProvider, useVoiceOverlay } from '../../src/components/VoiceOverlay';

type IconName = 'today' | 'goals' | 'reflect' | 'settings';

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'home',     label: 'Today',    icon: 'today' },
  { name: 'goals',    label: 'Goals',    icon: 'goals' },
  { name: 'retros',   label: 'Recap',    icon: 'reflect' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
];

export default function AppLayout() {
  return (
    <VoiceOverlayProvider>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: '#F4F6FB' },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="goals" />
        <Tabs.Screen name="coach" options={{ href: null }} />
        <Tabs.Screen name="retros" />
        <Tabs.Screen name="settings" />
        <Tabs.Screen name="avoidance" options={{ href: null }} />
        <Tabs.Screen name="goal-detail" options={{ href: null }} />
        <Tabs.Screen name="add" options={{ href: null }} />
      </Tabs>
    </VoiceOverlayProvider>
  );
}

/**
 * Floating pill nav bar with smoothly-rounded ends and a concave groove in the
 * centre that cradles the raised voice orb. The bar background is an SVG path so
 * the notch is a true cutout, not just an overlapping button.
 */
function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const SIDE = 16;             // margin from screen edges
  const W = width - SIDE * 2;  // bar width
  const H = 66;                // bar height
  const CORNER = 28;           // rounded end radius
  const NOTCH_HALF = 46;       // half-width of the centre groove opening
  const NOTCH_DEPTH = 23;      // how deep the groove dips
  const cx = W / 2;

  // Rounded-rect with a concave dip centred on the top edge (clockwise from top-left).
  const d = [
    `M ${CORNER} 0`,
    `L ${cx - NOTCH_HALF} 0`,
    `C ${cx - NOTCH_HALF + 14} 0 ${cx - 28} ${NOTCH_DEPTH} ${cx} ${NOTCH_DEPTH}`,
    `C ${cx + 28} ${NOTCH_DEPTH} ${cx + NOTCH_HALF - 14} 0 ${cx + NOTCH_HALF} 0`,
    `L ${W - CORNER} 0`,
    `Q ${W} 0 ${W} ${CORNER}`,
    `L ${W} ${H - CORNER}`,
    `Q ${W} ${H} ${W - CORNER} ${H}`,
    `L ${CORNER} ${H}`,
    `Q 0 ${H} 0 ${H - CORNER}`,
    `L 0 ${CORNER}`,
    `Q 0 0 ${CORNER} 0`,
    'Z',
  ].join(' ');

  const resolved = TABS
    .map(t => ({ ...t, index: state.routes.findIndex(r => r.name === t.name) }))
    .filter(t => t.index >= 0);
  const left = resolved.slice(0, 2);
  const right = resolved.slice(2);

  const renderTab = (t: typeof resolved[number]) => {
    const route = state.routes[t.index];
    const focused = state.index === t.index;
    const color = focused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable key={t.name} onPress={onPress} style={styles.tabBtn} hitSlop={8}>
        <Icon name={t.icon} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{t.label}</Text>
      </Pressable>
    );
  };

  const BOTTOM_GAP = 10;

  return (
    <View
      style={[styles.container, { height: H + BOTTOM_GAP + insets.bottom, paddingBottom: insets.bottom + BOTTOM_GAP }]}
      pointerEvents="box-none"
    >
      <View style={{ width: W, height: H }} pointerEvents="box-none">
        {/* Shadow/background shaped by the SVG path */}
        <View style={[styles.barShadow, { width: W, height: H }]}>
          <Svg width={W} height={H}>
            {/* solid brand-purple bar, like the primary buttons */}
            <Path d={d} fill="#6C5DD3" stroke="rgba(76, 63, 173, 0.6)" strokeWidth={1} />
          </Svg>
        </View>

        {/* Tab buttons sit over the bar, split around the centre groove */}
        <View style={[styles.row, { width: W, height: H }]} pointerEvents="box-none">
          <View style={styles.side}>{left.map(renderTab)}</View>
          <View style={{ width: NOTCH_HALF * 2 }} />
          <View style={styles.side}>{right.map(renderTab)}</View>
        </View>

        {/* Raised voice orb cradled in the groove */}
        <View style={styles.orbWrap} pointerEvents="box-none">
          <CenterOrbButton />
        </View>
      </View>
    </View>
  );
}

/** Raised, gently-pulsing orb. Tap → talk-to-coach overlay (no navigation). */
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
    <Pressable onPress={() => open()} style={styles.orbBtn} hitSlop={10}>
      <Animated.View style={animatedStyle}>
        <VoiceBall state="idle" size={44} />
      </Animated.View>
    </Pressable>
  );
}

/** Tab icons via react-native-svg (raw <svg> elements don't render on native). */
function Icon({ name, color }: { name: IconName; color: string }) {
  const size = 22;
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
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F4F6FB', // app bg — kills any dark showing around/below the bar
  },
  barShadow: {
    // No native shadow: a rectangular box-shadow / elevation doesn't follow the
    // rounded + notched SVG shape, so it leaves square corners and a color halo
    // above/below the bar. Depth comes from the path's edge stroke instead.
  },
  row: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  orbWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -20,
    alignItems: 'center',
  },
  orbBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
});
