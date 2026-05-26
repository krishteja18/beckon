import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
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
          await signOut();
          router.replace('/(onboarding)/welcome');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#38BDF8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Text style={{ color: '#EEF0F6', fontSize: 28, fontFamily: 'Inter_300Light', letterSpacing: -1 }}>
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
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                    borderWidth: 1,
                    borderColor: active ? 'rgba(56,189,248,0.4)' : 'rgba(204,218,240,0.06)',
                    backgroundColor: active ? 'rgba(56,189,248,0.06)' : 'rgba(255,255,255,0.012)',
                  }}
                >
                  <Text style={{
                    color: active ? '#67E8F9' : 'rgba(238,240,246,0.7)',
                    fontSize: 13, fontFamily: 'Inter_500Medium',
                  }}>
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
        <Section label="Morning sync time">
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
          <Text style={{ color: 'rgba(56,189,248,0.6)', fontSize: 11, textAlign: 'center', fontFamily: 'JetBrainsMono_400Regular' }}>
            saving...
          </Text>
        )}

        <Text style={{ color: 'rgba(150,160,185,0.2)', fontSize: 11, textAlign: 'center', marginTop: 8, fontFamily: 'Inter_400Regular' }}>
          Showup v0.1 · beta
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={{
        color: 'rgba(150,160,185,0.5)',
        fontSize: 10, letterSpacing: 1.2,
        textTransform: 'uppercase',
        fontFamily: 'JetBrainsMono_500Medium',
      }}>
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
      style={{
        borderRadius: 14, borderWidth: 1,
        borderColor: 'rgba(204,218,240,0.06)',
        backgroundColor: 'rgba(255,255,255,0.012)',
        paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <Text style={{
        color: danger ? '#FCA5A5' : '#EEF0F6',
        fontSize: 15, fontFamily: 'Inter_400Regular',
      }}>
        {label}
      </Text>
      {hint && (
        <Text style={{ color: 'rgba(150,160,185,0.4)', fontSize: 12, fontFamily: 'Inter_400Regular' }}>
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
        placeholderTextColor="rgba(170,178,200,0.3)"
        style={{
          flex: 1, color: '#EEF0F6', fontSize: 15,
          paddingHorizontal: 16, paddingVertical: 14,
          borderRadius: 14, borderWidth: 1,
          borderColor: 'rgba(204,218,240,0.06)',
          backgroundColor: 'rgba(255,255,255,0.012)',
          fontFamily: 'Inter_400Regular',
        }}
      />
    </View>
  );
}
