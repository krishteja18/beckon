import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';

const ITEMS = [
  { 
    icon: '🎙', 
    title: 'Microphone', 
    sub: 'So the coach can hear you.', 
    color: '#38BDF8', 
    bg: 'rgba(56, 189, 248, 0.06)' 
  },
  { 
    icon: '⏰', 
    title: 'Exact alarms', 
    sub: 'So we can call you at scheduled times.', 
    color: '#A855F7', 
    bg: 'rgba(168, 85, 247, 0.06)' 
  },
  { 
    icon: '🔔', 
    title: 'Notifications', 
    sub: 'For the call to break through DND.', 
    color: '#EC4899', 
    bg: 'rgba(236, 72, 153, 0.06)' 
  },
  { 
    icon: '🔋', 
    title: 'Battery exempt', 
    sub: 'So the OS doesn\'t kill us mid-call.', 
    color: '#F59E0B', 
    bg: 'rgba(245, 158, 11, 0.06)' 
  },
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
      <View style={styles.list}>
        {ITEMS.map(it => (
          <View
            key={it.title}
            style={styles.card}
          >
            {/* Custom glowing circular icon container */}
            <View 
              style={[
                styles.iconContainer, 
                { borderColor: 'rgba(255, 255, 255, 0.06)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }
              ]}
            >
              <Text style={styles.icon}>{it.icon}</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {it.title}
              </Text>
              <Text style={styles.subtitle}>
                {it.sub}
              </Text>
            </View>

            {/* Glowing neon chip action */}
            <Pressable
              onPress={() => {/* TODO: trigger actual permission request */}}
              style={({ pressed }) => [
                styles.grantBtn,
                { borderColor: it.color, backgroundColor: it.bg },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Text style={[styles.grantText, { color: it.color }]}>
                Grant
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#EEF0F6',
    fontSize: 14.5,
    fontFamily: 'Inter_500Medium',
  },
  subtitle: {
    color: 'rgba(170, 178, 200, 0.55)',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
    marginTop: 2,
  },
  grantBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.1,
  },
});
