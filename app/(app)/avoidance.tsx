import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  listAvoidanceGoals, addAvoidanceGoal, deactivateAvoidanceGoal,
} from '../../src/services/avoidanceGoals';
import { Database } from '../../src/services/database.types';

type AvoidanceGoal = Database['public']['Tables']['avoidance_goals']['Row'];

export default function Avoidance() {
  const router = useRouter();
  const [items, setItems] = useState<AvoidanceGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setItems(await listAvoidanceGoals());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await addAvoidanceGoal(newTitle);
      setNewTitle('');
      await load();
    } catch (e: any) {
      Alert.alert('Could not add', e.message ?? 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (g: AvoidanceGoal) => {
    Alert.alert(
      `Stop tracking "${g.title}"?`,
      'The coach will no longer ask about this during retros.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop tracking', style: 'destructive',
          onPress: async () => {
            await deactivateAvoidanceGoal(g.id);
            load();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: 'rgba(56,189,248,0.8)', fontSize: 14, marginBottom: 12, fontFamily: 'Inter_400Regular' }}>
            ← Settings
          </Text>
        </Pressable>
        <Text style={{ color: '#EEF0F6', fontSize: 28, fontFamily: 'Inter_300Light', letterSpacing: -1 }}>
          Avoidance habits
        </Text>
        <Text style={{ color: 'rgba(170,178,200,0.42)', fontSize: 13, marginTop: 6, lineHeight: 19, fontFamily: 'Inter_400Regular' }}>
          Things you're trying to cut out. The coach asks about these every evening — no standalone alarms.
        </Text>
      </View>

      {/* Add new */}
      <View style={{ paddingHorizontal: 24, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            onSubmitEditing={handleAdd}
            placeholder="e.g. sugar, Instagram, alcohol..."
            placeholderTextColor="rgba(170,178,200,0.3)"
            style={{
              flex: 1, color: '#EEF0F6', fontSize: 15,
              paddingHorizontal: 16, paddingVertical: 12,
              borderRadius: 12, borderWidth: 1,
              borderColor: 'rgba(204,218,240,0.06)',
              backgroundColor: 'rgba(255,255,255,0.012)',
              fontFamily: 'Inter_400Regular',
            }}
          />
          <Pressable
            onPress={handleAdd}
            disabled={saving || !newTitle.trim()}
            style={{
              paddingHorizontal: 18, justifyContent: 'center',
              borderRadius: 12, borderWidth: 1,
              borderColor: newTitle.trim() ? 'rgba(56,189,248,0.3)' : 'rgba(204,218,240,0.06)',
              backgroundColor: newTitle.trim() ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.012)',
              opacity: saving ? 0.5 : 1,
            }}
          >
            <Text style={{
              color: newTitle.trim() ? '#67E8F9' : 'rgba(170,178,200,0.5)',
              fontSize: 14, fontFamily: 'Inter_500Medium',
            }}>
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color="#38BDF8" />
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ color: 'rgba(150,160,185,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22, fontFamily: 'Inter_300Light' }}>
            No avoidance habits yet.{'\n'}Type one above to start tracking.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 8 }} showsVerticalScrollIndicator={false}>
          {items.map(item => {
            const days = item.added_at
              ? Math.floor((Date.now() - new Date(item.added_at).getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            return (
              <View
                key={item.id}
                style={{
                  borderRadius: 14, borderWidth: 1,
                  borderColor: 'rgba(204,218,240,0.06)',
                  backgroundColor: 'rgba(255,255,255,0.012)',
                  paddingHorizontal: 16, paddingVertical: 14,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#EEF0F6', fontSize: 15, fontFamily: 'Inter_400Regular' }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: 'rgba(150,160,185,0.4)', fontSize: 11, marginTop: 3, fontFamily: 'JetBrainsMono_400Regular' }}>
                    {days === 0 ? 'starting today' : `${days} ${days === 1 ? 'day' : 'days'} clean`}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemove(item)} style={{ padding: 6 }}>
                  <Text style={{ color: 'rgba(150,160,185,0.3)', fontSize: 18 }}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
