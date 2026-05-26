import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';

const ITEMS = [
  { icon: '🎙', title: 'Microphone',     sub: 'So the coach can hear you.' },
  { icon: '⏰', title: 'Exact alarms',    sub: 'So we can call you at scheduled times — even when the app is closed.' },
  { icon: '🔔', title: 'Notifications',  sub: 'For the call to break through Do Not Disturb.' },
  { icon: '🔋', title: 'Battery exempt', sub: 'So the OS doesn\'t kill us mid-call.' },
];

export default function PermissionsScreen() {
  const router = useRouter();

  return (
    <OnboardingFrame
      step={8}
      totalSteps={9}
      eyebrow="Step 8"
      title="One last setup."
      subtitle="Showup needs these to ring you on time. Tap each one — your phone will ask."
      primary={{
        label: 'Continue',
        onPress: () => router.push('/(onboarding)/test-call'),
      }}
    >
      <View className="gap-3">
        {ITEMS.map(it => (
          <View
            key={it.title}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(204,218,240,0.06)',
              backgroundColor: 'rgba(255,255,255,0.012)',
              padding: 16,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <Text style={{ fontSize: 22 }}>{it.icon}</Text>
            <View className="flex-1">
              <Text style={{ color: '#EEF0F6', fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                {it.title}
              </Text>
              <Text className="text-text-2 mt-1" style={{ fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 }}>
                {it.sub}
              </Text>
            </View>
            <Pressable
              onPress={() => {/* TODO: trigger actual permission request */}}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 99,
                borderWidth: 1,
                borderColor: 'rgba(56,189,248,0.3)',
              }}
            >
              <Text style={{ color: '#67E8F9', fontSize: 12, fontFamily: 'Inter_500Medium' }}>
                Grant
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </OnboardingFrame>
  );
}
