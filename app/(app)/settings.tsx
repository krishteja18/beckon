import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, TextInput, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchProfile, updateProfile } from '../../src/services/profile';
import { signOut } from '../../src/services/auth';
import { Database } from '../../src/services/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Intensity = Database['public']['Enums']['intensity_level'];

const INTENSITY_OPTIONS: { value: Intensity; label: string }[] = [
  { value: 'gentle', label: 'Gentle' },
  { value: 'firm',   label: 'Firm' },
  { value: 'drill',  label: 'Drill' },
];

export default function Settings() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const p = await fetchProfile();
      setProfile(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateField = async (patch: Partial<Profile>) => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(patch);
      setProfile({ ...profile, ...patch });
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            localStorage.removeItem('bypass_auth');
          }
          await signOut();
          router.replace('/(onboarding)/welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#6C5DD3" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} className="flex-1 bg-bg">
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Text style={styles.headerText}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 24 }} showsVerticalScrollIndicator={false}>

        {/* Name */}
        <Section label="Coach calls you">
          <NameField
            value={profile?.display_name ?? ''}
            onSave={(v) => updateField({ display_name: v })}
          />
        </Section>

        {/* Intensity */}
        <Section label="Coaching intensity">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {INTENSITY_OPTIONS.map(opt => {
              const active = profile?.intensity === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => updateField({ intensity: opt.value })}
                  style={[
                    styles.intensityCard,
                    active ? styles.intensityCardActive : styles.intensityCardInactive,
                  ]}
                >
                  <Text style={[
                    styles.intensityText,
                    active ? styles.intensityTextActive : styles.intensityTextInactive,
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Retro time */}
        <Section label="Evening retro time">
          <Row label={`${profile?.preferred_check_in_local_time ?? '21:30'}`} hint="Tap to change" onPress={() => {}} />
        </Section>

        {/* Morning sync */}
        <Section label="Morning call time">
          <Row label={`${profile?.morning_sync_time ?? '07:00'}`} hint="Tap to change" onPress={() => {}} />
        </Section>

        {/* Avoidance goals */}
        <Section label="Avoidance habits">
          <Row
            label="Manage avoidance habits"
            hint="Sugar, Instagram, etc."
            onPress={() => router.push('/(app)/avoidance' as any)}
          />
        </Section>


        {/* Account */}
        <Section label="Account">
          <Row label="Sign out" hint="" onPress={handleSignOut} danger />
        </Section>

        {saving && (
          <Text style={styles.savingText}>
            saving changes...
          </Text>
        )}

        <Text style={styles.footerText}>
          Showup v0.1 · beta
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.sectionLabel}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label, hint, onPress, danger = false,
}: { label: string; hint?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.rowCard}
    >
      <Text style={[
        styles.rowLabel,
        danger ? { color: '#EF4444' } : { color: '#1E1B4B' }
      ]}>
        {label}
      </Text>
      {hint && (
        <Text style={styles.rowHint}>
          {hint}
        </Text>
      )}
    </Pressable>
  );
}

function NameField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [name, setName] = useState(value);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={() => name.trim() && name.trim() !== value && onSave(name.trim())}
        placeholder="Your name"
        placeholderTextColor="#9CA3AF"
        style={styles.nameInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F4F6FB',
  },
  headerText: {
    color: '#1E1B4B',
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.6,
  },
  sectionLabel: {
    color: '#6B7280',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  rowHint: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  intensityCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  intensityCardActive: {
    borderColor: '#6C5DD3',
    backgroundColor: '#ECEFFA',
  },
  intensityCardInactive: {
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  intensityText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  intensityTextActive: {
    color: '#6C5DD3',
  },
  intensityTextInactive: {
    color: '#6B7280',
  },
  nameInput: {
    flex: 1,
    color: '#1E1B4B',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  savingText: {
    color: '#6C5DD3',
    fontSize: 11,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Inter_400Regular',
  },
});

