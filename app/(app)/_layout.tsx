import { View, Text, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AppLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#020409' },
        tabBarStyle: {
          backgroundColor: '#020409',
          borderTopColor: 'rgba(204,218,240,0.05)',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: 'rgba(170,178,200,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'JetBrainsMono_500Medium',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <Icon name="circle" color={color} /> }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: 'Goals', tabBarIcon: ({ color }) => <Icon name="square" color={color} /> }}
      />
      <Tabs.Screen
        name="retros"
        options={{ title: 'Retros', tabBarIcon: ({ color }) => <Icon name="lines" color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="gear" color={color} /> }}
      />
    </Tabs>
  );
}

function Icon({ name, color }: { name: 'circle' | 'square' | 'lines' | 'gear'; color: string }) {
  // Lightweight inline glyphs to avoid an icon dependency for MVP
  const size = 18;
  if (name === 'circle') {
    return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color }} />;
  }
  if (name === 'square') {
    return <View style={{ width: size, height: size, borderRadius: 3, borderWidth: 1.5, borderColor: color }} />;
  }
  if (name === 'lines') {
    return (
      <View style={{ width: size, gap: 3 }}>
        <View style={{ height: 1.5, backgroundColor: color, borderRadius: 1, width: '100%' }} />
        <View style={{ height: 1.5, backgroundColor: color, borderRadius: 1, width: '70%' }} />
        <View style={{ height: 1.5, backgroundColor: color, borderRadius: 1, width: '85%' }} />
      </View>
    );
  }
  // gear: simple "•" for now
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}
