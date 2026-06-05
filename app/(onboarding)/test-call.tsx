import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Pressable, TextInput, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { OnboardingFrame } from '../../src/components/OnboardingFrame';
import { VoiceBall } from '../../src/components/VoiceBall';
import { onboarding } from '../../src/store/onboarding';
import { commitOnboarding } from '../../src/services/onboardingComplete';

function format24hTo12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  let hour = parseInt(hStr, 10);
  if (isNaN(hour)) return time24;
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${mStr} ${period}`;
}

function getFrameworkLabel(key: string): string {
  if (key === 'atomic_habits') return 'Atomic Habits ðŸ“š';
  if (key === 'ikigai') return 'Ikigai ðŸƒ';
  if (key === 'deep_work') return 'Deep Work ðŸ§ ';
  return key;
}

function getIntensityLabel(key: string): string {
  if (key === 'gentle') return 'Gentle â˜•';
  if (key === 'firm') return 'Firm ðŸ”¥';
  if (key === 'drill') return 'Drill âš¡';
  return key;
}

function getGoalEmoji(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('deep work') || t.includes('work') || t.includes('focus')) return 'ðŸ§ ';
  if (t.includes('morning') || t.includes('routine')) return 'ðŸŒ…';
  if (t.includes('screen') || t.includes('detox') || t.includes('phone')) return 'ðŸ“µ';
  if (t.includes('consistency') || t.includes('streak')) return 'ðŸ”¥';
  if (t.includes('sleep') || t.includes('bed')) return 'ðŸŒ™';
  if (t.includes('mindfulness') || t.includes('meditation') || t.includes('yoga') || t.includes('zen')) return 'ðŸ§˜';
  if (t.includes('fitness') || t.includes('gym') || t.includes('workout') || t.includes('sport') || t.includes('run')) return 'ðŸ‹ï¸';
  if (t.includes('beauty') || t.includes('skin') || t.includes('glow')) return 'âœ¨';
  if (t.includes('nutrition') || t.includes('diet') || t.includes('eat') || t.includes('food') || t.includes('vegan') || t.includes('water')) return 'ðŸ¥‘';
  return 'ðŸŽ¯';
}

// Time Picker Widget Helpers
interface ParsedTime {
  hour: number;
  minute: number;
  period: 'AM' | 'PM';
}

function parseTimeTo12h(time24: string): ParsedTime {
  if (!time24 || !time24.includes(':')) {
    return { hour: 8, minute: 0, period: 'AM' };
  }
  const [hStr, mStr] = time24.split(':');
  let hour24 = parseInt(hStr, 10);
  if (isNaN(hour24)) hour24 = 8;
  let minute = parseInt(mStr, 10);
  if (isNaN(minute)) minute = 0;

  const period = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour: hour12, minute, period };
}

function formatTimeTo24h(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let hour24 = hour12 % 12;
  if (period === 'PM') {
    hour24 += 12;
  }
  const hStr = hour24.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

// Voice parser helpers
function extractTimeFromString(input: string): string | null {
  const clean = input.toLowerCase();
  // Match patterns like "6:30 am", "06:30pm", "8:00", "8 pm", "8pm"
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g;
  let match;
  while ((match = timeRegex.exec(clean)) !== null) {
    let hour = parseInt(match[1], 10);
    let minute = match[2] ? parseInt(match[2], 10) : 0;
    const ampm = match[3];
    
    if (hour < 0 || hour > 23) continue;
    if (minute < 0 || minute > 59) continue;
    
    if (ampm) {
      if (ampm === 'pm' && hour < 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
    }
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
  return null;
}

interface TimePickerWidgetProps {
  value: string;
  onChange: (newValue: string) => void;
  accentColor?: string;
  bgPastel?: string;
}

function TimePickerWidget({
  value,
  onChange,
  accentColor = '#6C5DD3',
  bgPastel = 'rgba(108, 93, 211, 0.02)',
}: TimePickerWidgetProps) {
  const { hour, minute, period } = parseTimeTo12h(value);

  const incrementHour = () => {
    let nextHour = hour + 1;
    if (nextHour > 12) nextHour = 1;
    onChange(formatTimeTo24h(nextHour, minute, period));
  };

  const decrementHour = () => {
    let nextHour = hour - 1;
    if (nextHour < 1) nextHour = 12;
    onChange(formatTimeTo24h(nextHour, minute, period));
  };

  const incrementMinute = () => {
    let nextMin = minute + 5;
    if (nextMin >= 60) nextMin = 0;
    onChange(formatTimeTo24h(hour, nextMin, period));
  };

  const decrementMinute = () => {
    let nextMin = minute - 5;
    if (nextMin < 0) nextMin = 55;
    onChange(formatTimeTo24h(hour, nextMin, period));
  };

  const togglePeriod = (newPeriod: 'AM' | 'PM') => {
    onChange(formatTimeTo24h(hour, minute, newPeriod));
  };

  return (
    <View style={[styles.pickerContainer, { backgroundColor: bgPastel }]}>
      <View style={styles.pickerRow}>
        
        {/* Hour Card Container */}
        <View style={styles.digitCardContainer}>
          <Pressable
            onPress={incrementHour}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–²</Text>
          </Pressable>
          <View style={styles.digitCard}>
            <Text style={styles.digitText}>{hour.toString().padStart(2, '0')}</Text>
          </View>
          <Pressable
            onPress={decrementHour}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–¼</Text>
          </Pressable>
          <Text style={styles.digitLabel}>HOURS</Text>
        </View>

        {/* Pulsing colon separator */}
        <View style={styles.colonContainer}>
          <Text style={[styles.colonText, { color: accentColor }]}>:</Text>
        </View>

        {/* Minute Card Container */}
        <View style={styles.digitCardContainer}>
          <Pressable
            onPress={incrementMinute}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–²</Text>
          </Pressable>
          <View style={styles.digitCard}>
            <Text style={styles.digitText}>{minute.toString().padStart(2, '0')}</Text>
          </View>
          <Pressable
            onPress={decrementMinute}
            style={({ pressed }) => [styles.chevronBtn, pressed && { opacity: 0.5 }]}
            hitSlop={10}
          >
            <Text style={[styles.chevronText, { color: accentColor }]}>â–¼</Text>
          </Pressable>
          <Text style={styles.digitLabel}>MINUTES</Text>
        </View>

        {/* Padding Spacer */}
        <View style={{ width: 16 }} />

        {/* AM/PM Switch Capsule */}
        <View style={styles.ampmVerticalContainer}>
          <View style={styles.ampmToggleBg}>
            <Pressable
              onPress={() => togglePeriod('AM')}
              style={({ pressed }) => [
                styles.ampmOption,
                period === 'AM' && [styles.ampmOptionActive, { backgroundColor: accentColor }],
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.ampmOptionText, period === 'AM' && styles.ampmOptionTextActive]}>
                AM
              </Text>
            </Pressable>
            <Pressable
              onPress={() => togglePeriod('PM')}
              style={({ pressed }) => [
                styles.ampmOption,
                period === 'PM' && [styles.ampmOptionActive, { backgroundColor: accentColor }],
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.ampmOptionText, period === 'PM' && styles.ampmOptionTextActive]}>
                PM
              </Text>
            </Pressable>
          </View>
          <Text style={styles.digitLabel}>PERIOD</Text>
        </View>

      </View>
    </View>
  );
}

function SimulatedWaveform() {
  const pulse1 = useSharedValue(1);
  const pulse2 = useSharedValue(1);
  const pulse3 = useSharedValue(1);
  const pulse4 = useSharedValue(1);
  const pulse5 = useSharedValue(1);

  useEffect(() => {
    pulse1.value = withRepeat(withTiming(2.2, { duration: 650 }), -1, true);
    pulse2.value = withRepeat(withTiming(1.4, { duration: 800 }), -1, true);
    pulse3.value = withRepeat(withTiming(2.8, { duration: 550 }), -1, true);
    pulse4.value = withRepeat(withTiming(1.6, { duration: 700 }), -1, true);
    pulse5.value = withRepeat(withTiming(2.4, { duration: 900 }), -1, true);
  }, []);

  const style1 = useAnimatedStyle(() => ({ transform: [{ scaleY: pulse1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ scaleY: pulse2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ scaleY: pulse3.value }] }));
  const style4 = useAnimatedStyle(() => ({ transform: [{ scaleY: pulse4.value }] }));
  const style5 = useAnimatedStyle(() => ({ transform: [{ scaleY: pulse5.value }] }));

  return (
    <View style={styles.waveformContainer}>
      <Animated.View style={[styles.waveBar, style1]} />
      <Animated.View style={[styles.waveBar, style2, { marginHorizontal: 4 }]} />
      <Animated.View style={[styles.waveBar, style3]} />
      <Animated.View style={[styles.waveBar, style4, { marginHorizontal: 4 }]} />
      <Animated.View style={[styles.waveBar, style5]} />
    </View>
  );
}

interface TimelineEvent {
  id: string; // 'morning' | 'evening' | 'goal-[index]'
  title: string;
  time: string; // 'HH:MM'
  desc: string;
  emoji: string;
  color: string;
  type: 'morning' | 'evening' | 'goal';
  goalIndex?: number;
}

export default function TestCallScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retrieve user custom parameters dynamically from onboarding store
  const setup = onboarding.get();
  const name = setup.name || 'Samantha';
  const intensity = setup.intensity || 'firm';
  const framework = setup.framework || 'atomic_habits';

  // Local overrides state
  const [goals, setGoals] = useState(setup.goals || []);
  const [morningSyncTime, setMorningSyncTime] = useState(setup.morningSyncTime || '07:00');
  const [retroTime, setRetroTime] = useState(setup.retroTime || '21:30');

  // Interactive controls state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  // Collapsible diagnostics state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);

  // Float animation for the infographic voice orb
  const floatOrbY = useSharedValue(0);

  useEffect(() => {
    floatOrbY.value = withRepeat(
      withTiming(5, { duration: 2200 }),
      -1,
      true
    );
  }, []);

  const animatedOrbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatOrbY.value }]
    };
  });

  const handleTest = () => {
    if (Platform.OS === 'ios') {
      let ShowupAlarmMod: any = null;
      try {
        ShowupAlarmMod = require('../../modules/showup-alarm/src').ShowupAlarm;
      } catch (e) {
        ShowupAlarmMod = null;
      }
      
      if (ShowupAlarmMod && typeof ShowupAlarmMod.simulateIncomingCall === 'function') {
        Alert.alert(
          'CallKit Simulation',
          'Incoming test call starting in 3 seconds. Siri will announce the call if configured, or you can tap Answer.',
          [{ text: 'OK', onPress: () => {
            setTimeout(() => {
              ShowupAlarmMod.simulateIncomingCall(goals[0]?.title || 'Daily Vitality Check-in');
            }, 3000);
          }}]
        );
      } else {
        router.push('/call?type=morning');
      }
    } else {
      router.push('/call?type=morning');
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      // Construct final state overrides
      const finalState = {
        ...onboarding.get(),
        goals,
        morningSyncTime,
        retroTime,
        scheduleTimes: [morningSyncTime],
      };
      await commitOnboarding(finalState);
      onboarding.reset();
      router.replace('/(app)/home');
    } catch (e: any) {
      setError(e.message ?? 'Could not save your setup. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // Adjust time handler
  const handleTimeChange = (ev: TimelineEvent, newVal: string) => {
    if (ev.type === 'morning') {
      setMorningSyncTime(newVal);
      onboarding.set({ morningSyncTime: newVal, scheduleTimes: [newVal] });
    } else if (ev.type === 'evening') {
      setRetroTime(newVal);
      onboarding.set({ retroTime: newVal });
    } else if (ev.type === 'goal' && ev.goalIndex !== undefined) {
      const updatedGoals = [...goals];
      updatedGoals[ev.goalIndex] = {
        ...updatedGoals[ev.goalIndex],
        scheduledTime: newVal,
      };
      setGoals(updatedGoals);
      onboarding.set({ goals: updatedGoals });
    }
  };

  // Process voice/text direct overrides
  const processVoiceCommand = (input: string) => {
    if (!input.trim()) return;
    const clean = input.toLowerCase().trim();
    
    // Extract time
    const time = extractTimeFromString(clean);
    if (!time) {
      setVoiceFeedback(`âŒ Could not understand the time in: "${input}". Try "6:30 AM" or "9:00 PM".`);
      return;
    }
    
    // Match target
    if (clean.includes('morning') || clean.includes('ignition') || clean.includes('wakeup') || clean.includes('wake up') || clean.includes('am check-in')) {
      setMorningSyncTime(time);
      onboarding.set({ morningSyncTime: time, scheduleTimes: [time] });
      setVoiceFeedback(`âœ… Moved Morning Ignition to ${format24hTo12h(time)}`);
      setVoiceText('');
      return;
    }
    
    if (clean.includes('evening') || clean.includes('retro') || clean.includes('reflection') || clean.includes('bedtime') || clean.includes('bed time') || clean.includes('pm check-in')) {
      setRetroTime(time);
      onboarding.set({ retroTime: time });
      setVoiceFeedback(`âœ… Moved Evening Retrospective to ${format24hTo12h(time)}`);
      setVoiceText('');
      return;
    }
    
    // Target goals
    let matchedGoalIndex = -1;
    let maxMatchLen = 0;
    
    for (let i = 0; i < goals.length; i++) {
      const title = goals[i].title.toLowerCase();
      if (clean.includes(title) && title.length > maxMatchLen) {
        matchedGoalIndex = i;
        maxMatchLen = title.length;
      }
    }
    
    // Try simple word overlap matching
    if (matchedGoalIndex === -1) {
      for (let i = 0; i < goals.length; i++) {
        const words = goals[i].title.toLowerCase().split(/\s+/);
        for (const word of words) {
          if (word.length > 2 && clean.includes(word)) {
            matchedGoalIndex = i;
            break;
          }
        }
      }
    }
    
    if (matchedGoalIndex !== -1) {
      const updatedGoals = [...goals];
      updatedGoals[matchedGoalIndex] = {
        ...updatedGoals[matchedGoalIndex],
        scheduledTime: time,
      };
      setGoals(updatedGoals);
      onboarding.set({ goals: updatedGoals });
      setVoiceFeedback(`âœ… Scheduled "${goals[matchedGoalIndex].title}" for ${format24hTo12h(time)}`);
      setVoiceText('');
    } else {
      setVoiceFeedback(`âŒ Found time ${format24hTo12h(time)}, but couldn't identify the goal. Try "Move ${goals[0]?.title || 'Gym'} to 7:00 AM".`);
    }
  };

  // Run Androidexact alarms diagnostics
  const runDiagnostics = async () => {
    setDiagnosticLogs([]);
    const addLog = (msg: string) => {
      setDiagnosticLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };
    
    addLog('Initiating Native ShowupAlarm Diagnostics...');
    try {
      let ShowupAlarmMod: any = null;
      if (Platform.OS === 'android') {
        ShowupAlarmMod = require('../../modules/showup-alarm/src').ShowupAlarm;
      }
      
      if (!ShowupAlarmMod) {
        addLog('âš ï¸ ShowupAlarm native module is not active/available on this platform (Simulating for debug).');
        // Simulated success run
        addLog('Mock: Checking exact alarm permission...');
        await new Promise(r => setTimeout(r, 400));
        addLog('Mock: Exact alarm permission is supported & granted.');
        addLog('Mock: Manufacturer: Google Android Emulator');
        addLog('Mock: Scheduling mock exact alarm for fireTime (in 3s)...');
        await new Promise(r => setTimeout(r, 600));
        addLog('Mock: Alarm registered inside OS scheduling list.');
        addLog('Mock: Listening to alarm-fired events...');
        await new Promise(r => setTimeout(r, 2000));
        addLog('ðŸ”” Mock Event Fired: goal "Morning Workout" triggered call voice intent!');
        addLog('Mock: Clean-up: cancelling mock alarm.');
        return;
      }
      
      addLog('Checking exact alarm scheduling support...');
      const isSupported = await ShowupAlarmMod.canScheduleExactAlarms();
      addLog(`Exact alarms permission granted: ${isSupported}`);

      const manufacturer = ShowupAlarmMod.manufacturer;
      addLog(`Device manufacturer: ${manufacturer}`);

      const alarmId = 'diag-alarm-' + Date.now();
      const fireTime = Date.now() + 3000;
      
      addLog(`Scheduling exact alarm ID "${alarmId}" to fire in 3s...`);
      await ShowupAlarmMod.scheduleAlarm({
        alarmId,
        fireAtMs: fireTime,
        goalId: 'diag-goal-id',
        goalTitle: 'Daily Jogging Practice',
        callType: 'morning',
        promptBlueprint: 'DIAGNOSTICS_PROMPT',
      });
      addLog('Alarm scheduled successfully!');

      addLog('Listing OS pending alarms...');
      const pending = await ShowupAlarmMod.listPendingAlarms();
      addLog(`Pending alarm IDs: ${JSON.stringify(pending)}`);

      addLog('Subscribing to ShowupAlarm onAlarmFired event emitter...');
      const subscription = ShowupAlarmMod.onAlarmFired((event: any) => {
        addLog(`ðŸ”” NATIVE EVENT CAPTURED: Alarm "${event.alarmId}" fired for goal "${event.goalTitle}"!`);
        subscription.remove();
      });

      addLog('Awaiting alarm execution (5 seconds timeout)...');
      setTimeout(async () => {
        addLog('Teardown: Cancelling remaining test alarms...');
        await ShowupAlarmMod.cancelAlarm(alarmId);
        addLog('Teardown: Done.');
        subscription.remove();
      }, 5000);

    } catch (e: any) {
      addLog(`âŒ Diagnostics failed: ${e.message ?? e}`);
    }
  };

  // Compile sorted timeline events list
  const timelineEvents: TimelineEvent[] = [
    {
      id: 'morning',
      title: 'Morning Ignition',
      time: morningSyncTime,
      desc: 'Plan priorities & awaken mental energy',
      emoji: 'ðŸŒ…',
      color: '#FB923C',
      type: 'morning'
    },
    ...goals.map((g, idx) => ({
      id: `goal-${idx}`,
      title: g.title,
      time: g.scheduledTime || '09:00',
      desc: 'Focus block & scheduled check-in call',
      emoji: getGoalEmoji(g.title),
      color: '#6C5DD3',
      type: 'goal' as const,
      goalIndex: idx
    })),
    {
      id: 'evening',
      title: 'Evening Retrospective',
      time: retroTime,
      desc: 'Reflect on wins, log stats & lock in sleep',
      emoji: 'ðŸŒ™',
      color: '#6C5DD3',
      type: 'evening'
    }
  ];

  const toMinutes = (t: string) => {
    if (!t || !t.includes(':')) return 0;
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    return h * 60 + m;
  };

  timelineEvents.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  return (
    <OnboardingFrame
      step={8}
      totalSteps={8}
      eyebrow="Step 8 Â· All set!"
      title="Ready to show up?"
      subtitle="Your daily coach is ready. Try a quick test call to see how it works, or finish setting up."
      primary={{
        label: saving ? 'Saving your setup...' : 'FINISH & GO TO DASHBOARD',
        onPress: handleFinish,
        disabled: saving,
      }}
      secondary={{ label: 'TRY A TEST CALL', onPress: handleTest }}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          
          {/* Top Status Center: Voice Orb + Pulse Visualizer + Status Badge */}
          <View style={styles.statusCenter}>
            <Animated.View style={[styles.orbWrapper, animatedOrbStyle]}>
              <VoiceBall state="speaking" size={135} />
            </Animated.View>
            <SimulatedWaveform />
            <View style={styles.statusIndicator}>
              <Text style={styles.statusIndicatorText}>â— COACH VOICE ACTIVE</Text>
            </View>
          </View>

          {/* Bottom Card: The Blueprint Dashboard Card */}
          <View style={styles.blueprintCard}>
            
            {/* Header row: Title + Intensity Badge */}
            <View style={styles.plannerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.blueprintHeaderTitle}>ðŸ“… YOUR SETUP BLUEPRINT</Text>
                <Text style={styles.blueprintHeaderSub}>Coached plan for {name}</Text>
              </View>
              <View style={[
                styles.intensityBadge,
                { backgroundColor: intensity === 'gentle' ? 'rgba(56, 189, 248, 0.08)' : intensity === 'firm' ? 'rgba(108, 93, 211, 0.08)' : 'rgba(251, 146, 60, 0.08)' }
              ]}>
                <Text style={[
                  styles.intensityBadgeText,
                  { color: intensity === 'gentle' ? '#38BDF8' : intensity === 'firm' ? '#6C5DD3' : '#FB923C' }
                ]}>
                  {getIntensityLabel(intensity).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Coaching Style Details */}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Productivity Framework</Text>
              <Text style={styles.metaVal}>{getFrameworkLabel(framework)}</Text>
            </View>

            {/* Goals wrap tags */}
            {goals.length > 0 && (
              <View style={styles.goalsSection}>
                <Text style={styles.goalsSectionTitle}>Core Focus Areas</Text>
                <View style={styles.goalsWrap}>
                  {goals.map((g, idx) => (
                    <View key={idx} style={styles.goalTag}>
                      <Text style={styles.goalTagEmoji}>{getGoalEmoji(g.title)}</Text>
                      <Text style={styles.goalTagText}>{g.title}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* Voice Command Simulated Input Section */}
            <View style={styles.voiceSection}>
              <View style={styles.voiceHeader}>
                <Text style={styles.voiceTitle}>ðŸŽ™ï¸ ADJUST WITH VOICE OR TEXT</Text>
                <Pressable
                  onPress={() => setShowVoiceInput(!showVoiceInput)}
                  style={({ pressed }) => [
                    styles.micToggleBtn,
                    showVoiceInput && styles.micToggleBtnActive,
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <Text style={styles.micIconText}>ðŸŽ¤</Text>
                </Pressable>
              </View>
              
              {showVoiceInput && (
                <View style={styles.voiceInputContainer}>
                  <Text style={styles.voiceInstruction}>
                    Simulate a spoken scheduling directive or type it below:
                  </Text>
                  <View style={styles.voiceInputRow}>
                    <TextInput
                      style={styles.voiceTextInput}
                      placeholder="e.g. Move gym to 6:30 AM"
                      placeholderTextColor="#8A94A6"
                      value={voiceText}
                      onChangeText={setVoiceText}
                      onSubmitEditing={() => processVoiceCommand(voiceText)}
                    />
                    <Pressable
                      onPress={() => processVoiceCommand(voiceText)}
                      style={({ pressed }) => [styles.voiceSendBtn, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.voiceSendText}>Apply</Text>
                    </Pressable>
                  </View>

                  {/* Canned suggestions list */}
                  <View style={styles.suggestionsContainer}>
                    <Text style={styles.suggestionsTitle}>ðŸ’¡ Quick Actions:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                      <Pressable
                        onPress={() => processVoiceCommand(`Move ${goals[0]?.title || 'Gym'} to 6:30 AM`)}
                        style={({ pressed }) => [styles.suggestionTag, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.suggestionTagText}>"Move {goals[0]?.title || 'Gym'} to 6:30 AM"</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => processVoiceCommand('Change morning sync to 8:00 AM')}
                        style={({ pressed }) => [styles.suggestionTag, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.suggestionTagText}>"Change morning to 8:00 AM"</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => processVoiceCommand('Move evening retro to 10:00 PM')}
                        style={({ pressed }) => [styles.suggestionTag, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.suggestionTagText}>"Move retro to 10:00 PM"</Text>
                      </Pressable>
                    </ScrollView>
                  </View>
                  
                  {voiceFeedback && (
                    <View style={styles.feedbackContainer}>
                      <Text style={styles.feedbackText}>{voiceFeedback}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Timeline */}
            <Text style={[styles.goalsSectionTitle, { marginBottom: 12 }]}>Interactive Timeline Planner</Text>
            <Text style={{ fontSize: 10.5, fontFamily: 'Inter_400Regular', color: '#8A94A6', marginBottom: 8 }}>
              ðŸ’¡ Tap slots in the summary timeline to adjust times manually.
            </Text>
            <View style={styles.timelineContainer}>
              {timelineEvents.map((ev, index) => {
                const isSelected = editingEventId === ev.id;
                const pastelBg = ev.color === '#FB923C'
                  ? 'rgba(251, 146, 60, 0.03)'
                  : ev.color === '#6C5DD3'
                  ? 'rgba(108, 93, 211, 0.03)'
                  : 'rgba(56, 189, 248, 0.03)';

                return (
                  <View key={ev.id} style={{ marginBottom: 4 }}>
                    <Pressable
                      onPress={() => setEditingEventId(isSelected ? null : ev.id)}
                      style={({ pressed }) => [
                        styles.timelineNodeRow,
                        isSelected && { backgroundColor: '#F8FAFC', borderRadius: 16 },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <View style={styles.leftColumn}>
                        <View style={[styles.timelineLine, { top: index === 0 ? '50%' : 0, bottom: index === timelineEvents.length - 1 ? '50%' : 0 }]} />
                        <View style={[styles.timelineBadge, { borderColor: ev.color }]}>
                          <Text style={{ fontSize: 12 }}>{ev.emoji}</Text>
                        </View>
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={styles.timelineMeta}>
                          <Text style={styles.timelineNodeTitle}>{ev.title}</Text>
                          <Text style={[styles.timelineNodeTime, { color: ev.color }]}>
                            {format24hTo12h(ev.time)}
                          </Text>
                        </View>
                        <Text style={styles.timelineNodeDesc}>{ev.desc}</Text>
                      </View>
                    </Pressable>

                    {/* Inline custom time picker widget */}
                    {isSelected && (
                      <View style={{ marginTop: 4, marginBottom: 12, paddingHorizontal: 12 }}>
                        <TimePickerWidget
                          value={ev.time}
                          onChange={(newVal) => handleTimeChange(ev, newVal)}
                          accentColor={ev.color}
                          bgPastel={pastelBg}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

          </View>

          {/* Androidexact alarms developer diagnostics */}
          <View style={styles.diagnosticsCard}>
            <Pressable
              onPress={() => setShowDiagnostics(!showDiagnostics)}
              style={styles.diagnosticsHeader}
            >
              <Text style={styles.diagnosticsTitle}>âš™ï¸ NATIVE ALARM DIAGNOSTICS</Text>
              <Text style={styles.diagnosticsChevron}>{showDiagnostics ? 'â–²' : 'â–¼'}</Text>
            </Pressable>
            
            {showDiagnostics && (
              <View style={styles.diagnosticsBody}>
                <Text style={styles.diagnosticsDesc}>
                  Validate Android Exact Alarm scheduling logs, reboot persistence hooks, and background worker loops directly.
                </Text>
                <Pressable
                  onPress={runDiagnostics}
                  style={({ pressed }) => [styles.diagnosticsBtn, pressed && { opacity: 0.8 }]}
                >
                  <Text style={styles.diagnosticsBtnText}>RUN NATIVE ALARM DIAGNOSTICS</Text>
                </Pressable>
                
                {diagnosticLogs.length > 0 && (
                  <ScrollView style={styles.logScrollView} nestedScrollEnabled={true}>
                    {diagnosticLogs.map((log, idx) => (
                      <Text key={idx} style={styles.logText}>{log}</Text>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {saving && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6C5DD3" />
              <Text style={styles.savingText}>Creating your schedule...</Text>
            </View>
          )}

          {error && (
            <Text style={styles.errorText}>
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  statusCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  orbWrapper: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    marginTop: 12,
  },
  waveBar: {
    width: 3.5,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#6C5DD3',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  statusIndicatorText: {
    fontSize: 9.5,
    fontFamily: 'Inter_700Bold',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  blueprintCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    padding: 20,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 4,
    marginTop: 16,
  },
  plannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blueprintHeaderTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    letterSpacing: 0.8,
  },
  blueprintHeaderSub: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
    marginTop: 2,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intensityBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Inter_700Bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(108, 93, 211, 0.06)',
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  metaLabel: {
    fontSize: 12.5,
    fontFamily: 'Inter_500Medium',
    color: '#8A94A6',
  },
  metaVal: {
    fontSize: 12.5,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  goalsSection: {
    marginTop: 12,
  },
  goalsSectionTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  goalsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.05)',
  },
  goalTagEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  goalTagText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
  },
  timelineNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leftColumn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 50,
  },
  timelineBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
  },
  timelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineNodeTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#1E1B4B',
  },
  timelineNodeTime: {
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
  },
  timelineNodeDesc: {
    fontSize: 11.5,
    fontFamily: 'Inter_400Regular',
    color: '#8A94A6',
    lineHeight: 16,
    marginTop: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
  },
  savingText: {
    color: '#6C5DD3',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  errorText: {
    color: '#FB923C',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
  },

  // Picker Widget inside nodes
  pickerContainer: {
    marginTop: 6,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.05)',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitCardContainer: {
    alignItems: 'center',
    gap: 4,
  },
  digitCard: {
    backgroundColor: '#FFFFFF',
    width: 52,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  digitText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#1E1B4B',
  },
  chevronBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 10,
  },
  colonContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  colonText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  ampmVerticalContainer: {
    alignItems: 'center',
    gap: 4,
  },
  ampmToggleBg: {
    width: 44,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#F4F6FB',
    padding: 2,
    justifyContent: 'space-between',
  },
  ampmOption: {
    height: 34,
    width: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmOptionActive: {
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  ampmOptionText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#6B7280',
  },
  ampmOptionTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  digitLabel: {
    marginTop: 4,
    fontSize: 8,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    letterSpacing: 0.5,
  },

  // Voice adjusting section styles
  voiceSection: {
    marginTop: 4,
    backgroundColor: '#F4F6FB',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.04)',
  },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceTitle: {
    fontSize: 9.5,
    fontFamily: 'Inter_700Bold',
    color: '#8A94A6',
    letterSpacing: 0.8,
  },
  micToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  micToggleBtnActive: {
    backgroundColor: '#6C5DD3',
  },
  micIconText: {
    fontSize: 14,
  },
  voiceInputContainer: {
    marginTop: 10,
  },
  voiceInstruction: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  voiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceTextInput: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    paddingHorizontal: 12,
    fontSize: 12.5,
    fontFamily: 'Inter_500Medium',
    color: '#1E1B4B',
  },
  voiceSendBtn: {
    backgroundColor: '#6C5DD3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSendText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  suggestionsContainer: {
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 9.5,
    fontFamily: 'Inter_600SemiBold',
    color: '#8A94A6',
    marginBottom: 6,
  },
  suggestionsScroll: {
    gap: 6,
    paddingRight: 10,
  },
  suggestionTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionTagText: {
    fontSize: 10.5,
    fontFamily: 'Inter_500Medium',
    color: '#6C5DD3',
  },
  feedbackContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  feedbackText: {
    fontSize: 11.5,
    fontFamily: 'Inter_500Medium',
    color: '#10B981',
  },

  // Diagnostics panel styles
  diagnosticsCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    marginTop: 14,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 1,
  },
  diagnosticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagnosticsTitle: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#EF4444',
    letterSpacing: 0.8,
  },
  diagnosticsChevron: {
    fontSize: 12,
    color: '#EF4444',
  },
  diagnosticsBody: {
    marginTop: 10,
  },
  diagnosticsDesc: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    lineHeight: 15,
  },
  diagnosticsBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  diagnosticsBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  logScrollView: {
    maxHeight: 120,
    backgroundColor: '#1E1B4B',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
  },
  logText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    color: '#A7F3D0',
    marginBottom: 4,
  },
});
