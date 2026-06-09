import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
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
    <SafeAreaView style={styles.safeArea} className="flex-1 bg-bg">
      <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>
            ← Settings
          </Text>
        </Pressable>
        <Text style={styles.headerText}>
          Avoidance habits
        </Text>
        <Text style={styles.headerSub}>
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
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <Pressable
            onPress={handleAdd}
            disabled={saving || !newTitle.trim()}
            style={[
              styles.addButton,
              newTitle.trim() ? styles.addButtonActive : styles.addButtonInactive,
              saving && { opacity: 0.5 }
            ]}
          >
            <Text style={[
              styles.addButtonText,
              newTitle.trim() ? styles.addButtonTextActive : styles.addButtonTextInactive
            ]}>
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color="#6C5DD3" />
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={styles.emptyText}>
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
                style={styles.itemCard}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemSubtitle}>
                    {days === 0 ? 'starting today' : `${days} ${days === 1 ? 'day' : 'days'} clean`}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemove(item)} style={{ padding: 6 }}>
                  <Text style={styles.closeIcon}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
  },
  backLink: {
    color: '#6C5DD3',
    fontSize: 14,
    marginBottom: 12,
    fontFamily: 'Inter_500Medium',
  },
  headerText: {
    color: '#1E1B4B',
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.6,
  },
  headerSub: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
  input: {
    flex: 1,
    color: '#1E1B4B',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
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
  addButton: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  addButtonActive: {
    borderColor: '#6C5DD3',
    backgroundColor: '#ECEFFA',
  },
  addButtonInactive: {
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  addButtonTextActive: {
    color: '#6C5DD3',
  },
  addButtonTextInactive: {
    color: '#9CA3AF',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  itemCard: {
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
  itemTitle: {
    color: '#1E1B4B',
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  itemSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Inter_400Regular',
  },
  closeIcon: {
    color: '#9CA3AF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

