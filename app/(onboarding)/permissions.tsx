import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { ShowupAlarm } from '../../modules/showup-alarm/src';

interface PermissionItem {
  icon: string;
  title: string;
  sub: string;
  color: string;
  bg: string;
  action: string;
}

const ITEMS: PermissionItem[] = Platform.OS === 'android' ? [
  { 
    icon: '🎙️', 
    title: 'Microphone', 
    sub: 'Allows you to speak and talk with your coach.', 
    color: '#38BDF8', // Cyan pastels
    bg: 'rgba(56, 189, 248, 0.06)',
    action: 'mic',
  },
  { 
    icon: '⏰', 
    title: 'Exact alarms', 
    sub: 'Ensures your daily calls arrive precisely on time.', 
    color: '#6C5DD3', // Brand purple
    bg: 'rgba(108, 93, 211, 0.06)',
    action: 'alarms',
  },
  { 
    icon: '🔔', 
    title: 'Notifications', 
    sub: 'Lets you know when your coach is calling.', 
    color: '#38BDF8', 
    bg: 'rgba(56, 189, 248, 0.06)',
    action: 'notifications',
  },
  { 
    icon: '🔋', 
    title: 'Battery exempt', 
    sub: 'Keeps the call connected when your screen goes dark.', 
    color: '#6C5DD3', 
    bg: 'rgba(108, 93, 211, 0.06)',
    action: 'battery',
  },
] : [
  { 
    icon: '🎙️', 
    title: 'Microphone', 
    sub: 'Allows you to speak and talk with your coach.', 
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.06)',
    action: 'mic'
  },
  { 
    icon: '📞', 
    title: 'CallKit & PushKit', 
    sub: 'Wakes up your phone for incoming calls even when locked.', 
    color: '#6C5DD3',
    bg: 'rgba(108, 93, 211, 0.06)',
    action: 'callkit'
  },
  { 
    icon: '🔔', 
    title: 'Notifications', 
    sub: 'Lets you know when your coach is calling.', 
    color: '#38BDF8', 
    bg: 'rgba(56, 189, 248, 0.06)',
    action: 'notifications'
  },
  { 
    icon: '🗣️', 
    title: 'Siri Call Announce', 
    sub: 'Siri will read notifications and let you say "Answer" hands-free.', 
    color: '#6C5DD3', 
    bg: 'rgba(108, 93, 211, 0.06)',
    action: 'siri'
  },
];

export default function PermissionsScreen() {
  const router = useRouter();

  const handleGrant = async (action: string) => {
    if (action === 'mic') {
      Alert.alert('Microphone Access', 'Please authorize microphone access in your device settings.');
    } else if (action === 'callkit') {
      try {
        await ShowupAlarm.requestCallKitPermissions();
        Alert.alert('CallKit Registered', 'PushKit VoIP registration triggered successfully!');
      } catch (e: any) {
        console.warn('CallKit registration failed', e);
        Alert.alert('Entitlement Required', 'iOS CallKit & PushKit requires a valid developer provisioning profile.');
      }
    } else if (action === 'notifications') {
      Alert.alert('Notifications Access', 'Please authorize notifications inside your device settings.');
    } else if (action === 'siri') {
      Alert.alert(
        'Siri Voice Answers Checklist',
        'For zero-tap voice answering, configure Siri Settings:\n\n1. Allow Siri When Locked -> ON\n2. Announce Calls -> Always',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    } else {
      Alert.alert('Permission', 'Requested permission setting.');
    }
  };

  return (
    <OnboardingFrame
      step={7}
      totalSteps={8}
      eyebrow="Step 7"
      title="Enable daily calls"
      subtitle="Please enable these permissions so your AI coach can reach you exactly on time."
      primary={{
        label: 'CONTINUE',
        onPress: () => router.push('/(onboarding)/test-call'),
      }}
    >
      <View style={styles.list}>
        {ITEMS.map(it => (
          <View
            key={it.title}
            style={styles.card}
          >
            {/* Access badge icon container */}
            <View 
              style={[
                styles.iconContainer, 
                { borderColor: 'rgba(108, 93, 211, 0.08)', backgroundColor: '#F4F6FB' }
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

            {/* Glowing neon grant button */}
            <Pressable
              onPress={() => handleGrant(it.action)}
              style={({ pressed }) => [
                styles.grantBtn,
                { borderColor: it.color, backgroundColor: it.bg },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Text style={[styles.grantText, { color: it.color }]}>
                GRANT
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
    gap: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF', // Pure White card backing!
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#1E1B4B', // Slate dark text
    fontSize: 14.5,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    color: '#6B7280', // Slate gray subtitle
    fontSize: 11.5,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
    marginTop: 2,
  },
  grantBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20, // capsule shape
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantText: {
    fontSize: 11.5,
    fontFamily: 'Inter_600SemiBold',
  },
});
