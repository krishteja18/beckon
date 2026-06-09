import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle } from 'react-native-svg';
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
    <View style={{ flex: 1, backgroundColor: '#F4F6FB' }}>
    <VoiceOverlayProvider>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          // Opaque flat bg: scenes occlude each other (no overlap) and exactly
          // match the nav bar color (no seam).
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
    </View>
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

  const SIDE = 9;              // margin from screen edges (smaller = wider bar)
  const W = width - SIDE * 2;  // bar width
  const H = 72;                // bar height
  const CORNER = 28;           // rounded end radius
  const NOTCH_HALF = 66;       // half-width of the centre groove opening (wider than the orb)
  const NOTCH_DEPTH = 42;      // how deep the groove dips (deep enough to clear the orb)
  const cx = W / 2;

  // Rounded-rect with a smooth concave scoop centred on the top edge. The control
  // points sit at half-width on horizontal tangents, so the dip eases in/out
  // gently (no sharp corners where it meets the flat edge).
  const d = [
    `M ${CORNER} 0`,
    `L ${cx - NOTCH_HALF} 0`,
    `C ${cx - NOTCH_HALF * 0.5} 0 ${cx - NOTCH_HALF * 0.5} ${NOTCH_DEPTH} ${cx} ${NOTCH_DEPTH}`,
    `C ${cx + NOTCH_HALF * 0.5} ${NOTCH_DEPTH} ${cx + NOTCH_HALF * 0.5} 0 ${cx + NOTCH_HALF} 0`,
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
        <Icon name={t.icon} color={color} active={focused} />
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
            {/* solid brand-purple bar, like the primary buttons (no edge stroke —
                it read as a dark hairline along the top edge against the light bg) */}
            <Path d={d} fill="#6C5DD3" />
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
    <Animated.View style={animatedStyle}>
      {/* VoiceBall renders its own Pressable (web + native) — pass onPress directly
          so the click isn't swallowed by a nested Pressable. */}
      <VoiceBall state="idle" size={82} onPress={() => open()} />
    </Animated.View>
  );
}

/**
 * Tab icons (react-native-svg). Inactive = clean outline; active = filled solid
 * glyph for a premium, iOS-style "current tab" emphasis. Bar bg is #6C5DD3, so
 * the gear's centre hole is punched with that colour when filled.
 */
function Icon({ name, color, active }: { name: IconName; color: string; active: boolean }) {
  const size = 25;
  const fill = active ? color : 'none';
  const stroke = color;
  const sw = active ? 0 : 2.1;
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'today') {
    // House
    return (
      <Svg {...common} fill={fill}>
        <Path d="M3.2 11 12 3.6l8.8 7.4v8.1a1.3 1.3 0 0 1-1.3 1.3h-4.2v-5.7H9.5v5.7H4.5a1.3 1.3 0 0 1-1.3-1.3z" />
      </Svg>
    );
  }
  if (name === 'goals') {
    // Flag (pole always stroked; flag fills when active)
    return (
      <Svg {...common} fill="none">
        <Path d="M6 21.5V3" stroke={stroke} strokeWidth={2.1} />
        <Path d="M6 3.6h11.5l-2.5 3.9 2.5 3.9H6" fill={fill} strokeWidth={2.1} />
      </Svg>
    );
  }
  if (name === 'reflect') {
    // Chat bubble (recap = coach's narrative)
    return (
      <Svg {...common} fill={fill}>
        <Path d="M4 5.6A2.6 2.6 0 0 1 6.6 3h10.8A2.6 2.6 0 0 1 20 5.6v6.6a2.6 2.6 0 0 1-2.6 2.6H9.2L5 19z" />
      </Svg>
    );
  }
  // settings → gear (solid cog when active, punched centre)
  return (
    <Svg {...common} fill={fill}>
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      <Circle cx="12" cy="12" r="3" fill={active ? '#6C5DD3' : 'none'} stroke={stroke} strokeWidth={2.1} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: '#F4F6FB', // matches the scene background exactly (flat, no seam)
    // Keep the bar (and the orb that floats above it) above the scene so the
    // orb stays tappable where it overlaps the screen content (web z-order).
    zIndex: 50,
    elevation: 50,
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
  },
  orbWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -46,
    alignItems: 'center',
  },
});
