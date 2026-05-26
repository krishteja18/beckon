import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchRetros, RetroType } from '../../src/services/retros';
import { Database } from '../../src/services/database.types';

type Retro = Database['public']['Tables']['retros']['Row'];

const TABS: { value: RetroType; label: string }[] = [
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function Retros() {
  const [tab, setTab] = useState<RetroType>('daily');
  const [retros, setRetros] = useState<Retro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRetros(tab)
      .then(setRetros)
      .catch(() => setRetros([]))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Text style={{ color: '#EEF0F6', fontSize: 28, fontFamily: 'Inter_300Light', letterSpacing: -1 }}>
          Retros
        </Text>
        <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 13, marginTop: 4, fontFamily: 'Inter_400Regular' }}>
          Patterns the coach noticed.
        </Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 14 }}>
        {TABS.map(t => {
          const active = tab === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setTab(t.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
                borderWidth: 1,
                borderColor: active ? 'rgba(56,189,248,0.4)' : 'rgba(204,218,240,0.06)',
                backgroundColor: active ? 'rgba(56,189,248,0.06)' : 'transparent',
              }}
            >
              <Text style={{
                color: active ? '#67E8F9' : 'rgba(170,178,200,0.6)',
                fontSize: 12, fontFamily: 'Inter_500Medium',
              }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : retros.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ color: 'rgba(150,160,185,0.4)', fontSize: 14, textAlign: 'center', fontFamily: 'Inter_300Light', lineHeight: 22 }}>
            No {tab} retros yet.{'\n'}They'll appear after your first {tab === 'weekly' ? 'week' : tab === 'monthly' ? 'month' : 'evening retro call'}.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {retros.map(r => (
            <RetroCard key={r.id} retro={r} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RetroCard({ retro }: { retro: Retro }) {
  const date = retro.period_end_date
    ? new Date(retro.period_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  return (
    <View style={{
      borderRadius: 16, borderWidth: 1,
      borderColor: 'rgba(204,218,240,0.06)',
      backgroundColor: 'rgba(255,255,255,0.012)',
      padding: 18, gap: 8,
    }}>
      <Text style={{
        color: 'rgba(150,160,185,0.5)',
        fontSize: 10, letterSpacing: 1.2,
        textTransform: 'uppercase',
        fontFamily: 'JetBrainsMono_500Medium',
      }}>
        {date}
      </Text>
      <Text style={{
        color: '#EEF0F6', fontSize: 14, lineHeight: 22, fontFamily: 'Inter_400Regular',
      }}>
        {retro.summary_text ?? 'No summary yet.'}
      </Text>
    </View>
  );
}
