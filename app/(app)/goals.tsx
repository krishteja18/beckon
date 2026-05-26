import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchGoalsWithSchedules, archiveGoal, GoalWithSchedules } from '../../src/services/goals';

const FRAMEWORK_LABEL: Record<string, string> = {
  atomic_habits: 'Atomic Habits',
  ikigai: 'Ikigai',
  deep_work: 'Deep Work',
};

export default function Goals() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalWithSchedules[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchGoalsWithSchedules();
      setGoals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleArchive = (goal: GoalWithSchedules) => {
    Alert.alert(
      'Archive goal?',
      `"${goal.title}" will be removed from your schedule. You can't undo this.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive', style: 'destructive',
          onPress: async () => {
            await archiveGoal(goal.id);
            load();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Text style={{ color: '#EEF0F6', fontSize: 28, fontFamily: 'Inter_300Light', letterSpacing: -1 }}>
          Goals
        </Text>
        <Pressable
          onPress={() => router.push('/(onboarding)/goals')}
          style={{
            paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
            backgroundColor: 'rgba(56,189,248,0.08)',
            borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)',
          }}
        >
          <Text style={{ color: '#38BDF8', fontSize: 13, fontFamily: 'Inter_500Medium' }}>+ Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#38BDF8" style={{ marginTop: 40 }} />
      ) : goals.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ color: 'rgba(150,160,185,0.4)', fontSize: 16, textAlign: 'center', fontFamily: 'Inter_300Light', lineHeight: 24 }}>
            No active goals yet.{'\n'}Tap + Add to get started.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
          {goals.map(goal => (
            <View
              key={goal.id}
              style={{
                borderRadius: 18, borderWidth: 1,
                borderColor: 'rgba(204,218,240,0.06)',
                backgroundColor: 'rgba(255,255,255,0.015)',
                padding: 18,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#EEF0F6', fontSize: 17, fontFamily: 'Inter_500Medium', letterSpacing: -0.3 }}>
                    {goal.title}
                  </Text>
                  <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 12, marginTop: 4, fontFamily: 'Inter_400Regular' }}>
                    {FRAMEWORK_LABEL[goal.framework ?? ''] ?? goal.framework}
                  </Text>
                </View>
                <Pressable onPress={() => handleArchive(goal)} style={{ padding: 4 }}>
                  <Text style={{ color: 'rgba(150,160,185,0.3)', fontSize: 18 }}>×</Text>
                </Pressable>
              </View>

              {/* Schedules */}
              {goal.schedules.length > 0 && (
                <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {goal.schedules.map(s => {
                    const [hh, mm] = (s.scheduled_time as string).split(':').map(Number);
                    const period = hh < 12 ? 'AM' : 'PM';
                    const dH = hh % 12 || 12;
                    return (
                      <View
                        key={s.id}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
                          backgroundColor: 'rgba(56,189,248,0.06)',
                          borderWidth: 1, borderColor: 'rgba(56,189,248,0.15)',
                        }}
                      >
                        <Text style={{ color: 'rgba(103,232,249,0.8)', fontSize: 11, fontFamily: 'JetBrainsMono_500Medium' }}>
                          {`${dH}:${mm.toString().padStart(2, '0')} ${period}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
