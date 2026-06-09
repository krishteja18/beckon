import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, Pressable, ActivityIndicator, AppState, StyleSheet, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { fetchTodayTimeline, TimelineSlot, fetchGoalsWithSchedules, GoalWithSchedules, slotDisplayName } from '../../src/services/goals';
import { fetchRoutines, Routine } from '../../src/services/routines';
import { fetchTodayOutcomes, recordOutcome, clearTodayOutcome, outcomeKey, OutcomeKind, OutcomeTarget } from '../../src/services/outcomes';
import { computeVelocity } from '../../src/services/velocity';
import { fetchProfile, updateProfile } from '../../src/services/profile';
import { TimePickerSheet } from '../../src/components/TimePickerSheet';
import { listAvoidanceGoals } from '../../src/services/avoidanceGoals';
import { VoiceBall, VoiceState } from '../../src/components/VoiceBall';
import { useVoiceOverlay } from '../../src/components/VoiceOverlay';

const FRAMEWORK_LABEL: Record<string, string> = {
  atomic_habits: 'Atomic Habits',
  ikigai: 'Ikigai',
  deep_work: 'Deep Work',
};

// Helper to calculate the 7 dates of the current week starting from Sunday
const getWeekDays = (referenceDate: Date): Date[] => {
  const currentDayOfWeek = referenceDate.getDay();
  const startOfWeek = new Date(referenceDate);
  startOfWeek.setDate(referenceDate.getDate() - currentDayOfWeek);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }
  return days;
};

export default function Home() {
  const router = useRouter();
  const { open: openCoach } = useVoiceOverlay();
  const [timeline, setTimeline] = useState<TimelineSlot[]>([]);
  const [velocity, setVelocity] = useState<number | null>(null);
  const [velocityTrend, setVelocityTrend] = useState<number | null>(null);
  const [expectedEvents, setExpectedEvents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Profile and goals info
  const [profileName, setProfileName] = useState('there');
  const [avoidanceCount, setAvoidanceCount] = useState(0);
  const [goals, setGoals] = useState<GoalWithSchedules[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [defaultFramework, setDefaultFramework] = useState<string>('atomic_habits');
  const [kickoffTime, setKickoffTime] = useState<string | null>(null);   // morning_sync_time
  const [cooldownTime, setCooldownTime] = useState<string | null>(null); // preferred_check_in_local_time
  const [editingAnchor, setEditingAnchor] = useState<null | 'kickoff' | 'cooldown'>(null);

  // Revamped dashboard states
  const [roughDayMode, setRoughDayMode] = useState(false);
  const [showRoughDayModal, setShowRoughDayModal] = useState(false);
  const [isLiveCallBackground, setIsLiveCallBackground] = useState(false);
  const [orbState, setOrbState] = useState<VoiceState>('idle');
  const [isHittingWall, setIsHittingWall] = useState(false);
  const [isRoughDayTapped, setIsRoughDayTapped] = useState(false);
  const [headerTapCount, setHeaderTapCount] = useState(0);

  // Custom live updating and navigation states
  const [now, setNow] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [selectedSlot, setSelectedSlot] = useState<TimelineSlot | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  // outcomeKey → recorded outcome for today (manual marks + voice marks)
  const [outcomes, setOutcomes] = useState<Map<string, OutcomeKind>>(new Map());

  // Shared Animation Values
  const screenOpacity = useSharedValue(0);
  const timelineOpacity = useSharedValue(1);
  const activeDotScale = useSharedValue(1);
  const liveCallPulse = useSharedValue(1);
  const orbScale = useSharedValue(1);

  // Initialize animations and live countdown interval
  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 200 });

    activeDotScale.value = withRepeat(
      withTiming(1.35, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    liveCallPulse.value = withRepeat(
      withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    const interval = setInterval(() => {
      setNow(new Date());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Update timeline container opacity based on rough day mode
  useEffect(() => {
    timelineOpacity.value = withTiming(roughDayMode ? 0.4 : 1, { duration: 300 });
  }, [roughDayMode]);

  const getTimelineForDay = useCallback((
    dayIndex: number,
    allGoals: GoalWithSchedules[],
    allRoutines: Routine[],
    fallbackFramework: string,
    kickoffT: string | null,
    cooldownT: string | null,
  ) => {
    const todayDow = new Date().getDay();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    // Actual calendar date of the viewed day in the current week (Sunday-start),
    // used to place one-off reminders (routines with a remind_date) on their date.
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const viewedDate = new Date(startOfWeek);
    viewedDate.setDate(startOfWeek.getDate() + dayIndex);
    const viewedDateStr = `${viewedDate.getFullYear()}-${String(viewedDate.getMonth() + 1).padStart(2, '0')}-${String(viewedDate.getDate()).padStart(2, '0')}`;
    const slots: TimelineSlot[] = [];

    const computeStatus = (schedMinutes: number): TimelineSlot['status'] => {
      if (dayIndex !== todayDow) return 'upcoming';
      const diff = schedMinutes - nowMinutes;
      if (diff < -30) return 'done';
      if (diff <= 30) return 'active';
      return 'upcoming';
    };

    const formatTime = (hh: number, mm: number) => {
      const period = hh < 12 ? 'AM' : 'PM';
      const displayH = hh % 12 || 12;
      const displayM = mm.toString().padStart(2, '0');
      return {
        time: `${hh.toString().padStart(2, '0')}:${displayM}`,
        timeLabel: `${displayH}:${displayM} ${period}`,
      };
    };

    for (const goal of allGoals) {
      for (const sched of goal.schedules) {
        if (!sched.active) continue;
        if (!sched.scheduled_days.includes(dayIndex)) continue;
        const [hh, mm] = (sched.scheduled_time as string).split(':').map(Number);
        const { time, timeLabel } = formatTime(hh, mm);
        slots.push({
          kind: 'goal',
          goalId: goal.id,
          goalTitle: goal.title,
          label: sched.label,
          framework: goal.framework || 'atomic_habits',
          scheduleId: sched.id,
          time,
          timeLabel,
          status: computeStatus(hh * 60 + mm),
        });
      }
    }

    for (const routine of allRoutines) {
      if (!routine.active) continue;
      if (routine.remind_date) {
        // One-off reminder: only on its exact date.
        if (routine.remind_date.slice(0, 10) !== viewedDateStr) continue;
      } else {
        // Recurring reminder: by day-of-week.
        if (!routine.scheduled_days.includes(dayIndex)) continue;
      }
      const [hh, mm] = routine.scheduled_time.split(':').map(Number);
      const { time, timeLabel } = formatTime(hh, mm);
      slots.push({
        kind: 'routine',
        goalId: routine.id,
        goalTitle: routine.title,
        framework: fallbackFramework as TimelineSlot['framework'],
        scheduleId: routine.id,
        time,
        timeLabel,
        status: computeStatus(hh * 60 + mm),
      });
    }

    // ── Daily anchor calls ──────────────────────────────────────────────
    const anchorFramework = fallbackFramework as TimelineSlot['framework'];

    // Evening Cooldown — every day at the retro time.
    if (cooldownT) {
      const [hh, mm] = cooldownT.split(':').map(Number);
      const { time, timeLabel } = formatTime(hh, mm);
      slots.push({
        kind: 'cooldown',
        goalId: 'cooldown',
        goalTitle: 'Evening Cooldown',
        framework: anchorFramework,
        scheduleId: 'cooldown',
        time,
        timeLabel,
        status: computeStatus(hh * 60 + mm),
      });
    }

    // Morning Kickoff — always shown at its set time (like any scheduled call).
    if (kickoffT) {
      const [hh, mm] = kickoffT.split(':').map(Number);
      const { time, timeLabel } = formatTime(hh, mm);
      slots.push({
        kind: 'kickoff',
        goalId: 'kickoff',
        goalTitle: 'Morning Kickoff',
        framework: anchorFramework,
        scheduleId: 'kickoff',
        time,
        timeLabel,
        status: computeStatus(hh * 60 + mm),
      });
    }

    return slots.sort((a, b) => a.time.localeCompare(b.time));
  }, []);

  const loadTimeline = useCallback(async () => {
    try {
      const [allGoals, allRoutines, vel, profile, avoidances, todayOutcomes] = await Promise.all([
        fetchGoalsWithSchedules(),
        fetchRoutines(),
        computeVelocity(),
        fetchProfile(),
        listAvoidanceGoals(),
        fetchTodayOutcomes(),
      ]);
      setGoals(allGoals);
      setRoutines(allRoutines);
      setOutcomes(todayOutcomes);

      setExpectedEvents(vel.expected);
      if (vel.expected > 0) {
        setVelocity(vel.percent);
        setVelocityTrend(vel.trend);
      } else {
        setVelocity(null);
        setVelocityTrend(null);
      }

      if (profile) {
        if (profile.display_name) setProfileName(profile.display_name);
        if (profile.default_framework) setDefaultFramework(profile.default_framework);
        setKickoffTime(profile.morning_sync_time ?? null);
        setCooldownTime(profile.preferred_check_in_local_time ?? null);
      }

      if (avoidances) {
        setAvoidanceCount(avoidances.length);
      }
    } catch (e) {
      // Fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  // Recalculate timeline slots when day selection / goals / routines change
  useEffect(() => {
    setTimeline(getTimelineForDay(selectedDay, goals, routines, defaultFramework, kickoffTime, cooldownTime));
  }, [selectedDay, goals, routines, defaultFramework, kickoffTime, cooldownTime, getTimelineForDay]);

  useEffect(() => {
    loadTimeline();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') loadTimeline();
    });
    return () => sub.remove();
  }, [loadTimeline]);

  // Refresh when returning to this tab (e.g. after adding from the Add screen)
  useFocusEffect(
    useCallback(() => {
      loadTimeline();
    }, [loadTimeline]),
  );

  const targetForSlot = (slot: TimelineSlot): OutcomeTarget => ({
    slotKind: slot.kind,
    goalId: slot.goalId,
    scheduleId: slot.scheduleId,
  });
  // Recorded outcomes are stored against the actual calendar date, so they only
  // apply when viewing today's column — other weekdays stay fresh.
  const viewingToday = selectedDay === now.getDay();
  const slotOutcome = (slot: TimelineSlot): OutcomeKind | undefined =>
    viewingToday ? outcomes.get(outcomeKey(targetForSlot(slot))) : undefined;

  const markSelected = async (status: 'done' | 'skipped') => {
    if (!selectedSlot) return;
    try { await recordOutcome(targetForSlot(selectedSlot), status); }
    catch (e) { console.warn('[home] recordOutcome', e); }
    setShowDetailSheet(false);
    loadTimeline();
  };
  const undoSelected = async () => {
    if (!selectedSlot) return;
    try { await clearTodayOutcome(targetForSlot(selectedSlot)); }
    catch (e) { console.warn('[home] clearTodayOutcome', e); }
    setShowDetailSheet(false);
    loadTimeline();
  };

  // Today's Date: e.g. "Wed, Jun 4"
  const todayDateStr = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  // Calculate Waking Day Percentage using dynamic now state
  // Standard 16-hour waking day window: 7:00 AM (420 mins) to 11:00 PM (1380 mins)
  const getWakingDayPercent = () => {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = 7 * 60;
    const endMinutes = 23 * 60;
    if (currentMinutes < startMinutes) return 0;
    if (currentMinutes > endMinutes) return 100;
    const elapsed = currentMinutes - startMinutes;
    const total = endMinutes - startMinutes;
    return Math.round((elapsed / total) * 100);
  };

  const dayArcPercent = getWakingDayPercent();

  // Find next call (active or upcoming)
  const nextCall = timeline.find(s => s.status === 'active') ?? timeline.find(s => s.status === 'upcoming');
  const allCallsCompleted = timeline.length > 0 && timeline.every(s => s.status === 'done');

  // Format next call details
  let nextCallHour = "6:00";
  let nextCallPeriod = "PM";
  if (nextCall && nextCall.timeLabel) {
    const timeParts = nextCall.timeLabel.split(' ');
    nextCallHour = timeParts[0] || "6:00";
    nextCallPeriod = timeParts[1] || "PM";
  }

  // Calculate countdown relative to dynamic now state
  const getCountdownMinutes = (slot: TimelineSlot, currentDate: Date) => {
    if (!slot || !slot.time) return 0;
    const [hh, mm] = slot.time.split(':').map(Number);
    const target = new Date(currentDate);
    target.setHours(hh, mm, 0, 0);
    const diffMs = target.getTime() - currentDate.getTime();
    return Math.round(diffMs / 60000);
  };

  const formatCountdownText = (minutes: number) => {
    if (minutes <= 0) return 'Active now';
    if (minutes < 60) return `${minutes} min away`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `in ${hrs}h`;
    return `in ${hrs}h ${mins}m`;
  };

  const countdownMin = nextCall ? getCountdownMinutes(nextCall, now) : 0;
  const isCountdownValid = countdownMin > 0;

  // Interactions and navigation
  const handleHitWall = () => {
    setIsHittingWall(true);
    setTimeout(() => {
      setIsHittingWall(false);
      router.push('/call?type=wall');
    }, 200);
  };

  const handleRoughDayTap = () => {
    setIsRoughDayTapped(true);
    setTimeout(() => {
      setIsRoughDayTapped(false);
      setShowRoughDayModal(true);
    }, 200);
  };

  const handleVoiceOrbTap = () => {
    // Quick press feedback, then open the in-place coach overlay (no navigation).
    orbScale.value = withTiming(1.05, { duration: 100 }, () => {
      orbScale.value = withTiming(1, { duration: 100 });
    });
    const callType = nextCall ? (nextCall.status === 'active' ? 'morning' : 'midday') : 'midday';
    openCoach({ callType });
  };

  // Secret developer toggle to view the live call overlay (triple-tap the date header)
  const handleHeaderTap = () => {
    setHeaderTapCount(prev => {
      const next = prev + 1;
      if (next >= 3) {
        setIsLiveCallBackground(curr => !curr);
        return 0;
      }
      // Reset tap count after 1s of inactivity
      setTimeout(() => setHeaderTapCount(0), 1000);
      return next;
    });
  };

  const renderDaySelector = () => {
    const todayDow = now.getDay();
    const weekDays = getWeekDays(now);
    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return (
      <View style={styles.daySelectorContainer}>
        {weekDays.map((dayDate, idx) => {
          const isSelected = selectedDay === idx;
          const isToday = todayDow === idx;
          const dayLabel = dayLabels[idx];
          const dateNum = dayDate.getDate().toString();

          return (
            <Pressable
              key={idx}
              onPress={() => setSelectedDay(idx)}
              style={[
                styles.daySelectorCol,
                isSelected && styles.daySelectorColSelected,
              ]}
              hitSlop={8}
            >
              <Text style={[
                styles.daySelectorLabel,
                isSelected && styles.daySelectorLabelSelected,
              ]}>
                {dayLabel}
              </Text>
              
              <View style={[
                styles.dateContainer,
                isSelected && styles.dateContainerSelected,
              ]}>
                <Text style={[
                  styles.dateText,
                  isSelected && styles.dateTextSelected,
                ]}>
                  {dateNum}
                </Text>
              </View>

              {isToday && (
                <View style={[
                  styles.daySelectorTodayDot,
                  isSelected && styles.daySelectorTodayDotSelected,
                ]} />
              )}
            </Pressable>
          );
        })}
      </View>
    );
  };

  // Animated Styles
  const animatedScreenStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: screenOpacity.value,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  }));

  const animatedTimelineStyle = useAnimatedStyle(() => ({
    opacity: timelineOpacity.value,
  }));

  const animatedActiveDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: activeDotScale.value }],
  }));

  const animatedLiveCallPillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: liveCallPulse.value }],
  }));

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  return (
    <>
      <Animated.View style={animatedScreenStyle}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          
          {/* Header Row */}
          <View style={styles.headerRow}>
            {/* Left: Today's date */}
            <Pressable onPress={handleHeaderTap} hitSlop={15} style={styles.headerLeftBtn}>
              <Text style={styles.headerDate}>{todayDateStr}</Text>
            </Pressable>

            {/* Right: Rolling 7-day velocity % with Trend arrow */}
            <View style={styles.headerVelocityCol}>
              <View style={styles.velocityRow}>
                {velocityTrend != null && velocityTrend !== 0 && (
                  <Text style={[
                    styles.velocityTrendText,
                    velocityTrend > 0 ? styles.velocityTrendUp : styles.velocityTrendDown
                  ]}>
                    {velocityTrend > 0 ? '▲' : '▼'} {Math.abs(velocityTrend)}%
                  </Text>
                )}
                <Text style={styles.velocityValue}>
                  {velocity == null ? '—' : `${velocity}%`}
                </Text>
              </View>
              <Text style={styles.velocityLabel}>7-DAY VELOCITY</Text>
            </View>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            {loading ? (
              <View style={styles.centeredContent}>
                <ActivityIndicator color="#6C5DD3" size="large" />
              </View>
            ) : allCallsCompleted ? (
              // All done for today state
              <View style={styles.heroCompletedContent}>
                <Text style={styles.heroCompletedTitle}>All done for today</Text>
                <Text style={styles.heroCompletedSub}>Nice work — see you at tomorrow's kickoff.</Text>
              </View>
            ) : nextCall ? (
              // Active / Upcoming call hero content
              <View style={styles.heroCallContent}>
                {/* Eyebrow label */}
                <View style={styles.heroEyebrowRow}>
                  <View style={styles.heroEyebrowLine} />
                  <Text style={styles.heroEyebrow}>NEXT CALL</Text>
                </View>

                {/* Time numeral */}
                <View style={styles.heroTimeContainer}>
                  <Text style={styles.heroTimeNumeral}>{nextCallHour}</Text>
                  <Text style={styles.heroTimePeriod}>{nextCallPeriod}</Text>
                </View>

                {/* Goal title */}
                <Text style={styles.heroGoalTitle}>{nextCall.goalTitle}</Text>

                {/* Meta row: framework + countdown */}
                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroMetaFramework}>
                    {FRAMEWORK_LABEL[nextCall.framework] || 'Atomic Habits'}
                  </Text>
                  <Text style={styles.heroMetaBullet}>·</Text>
                  <Text style={styles.heroMetaCountdown}>
                    {countdownMin <= 0 ? 'Active now' : formatCountdownText(countdownMin)}
                  </Text>
                </View>

                {/* Waking Day Arc — only meaningful for today */}
                {selectedDay === now.getDay() && (
                  <View style={styles.wakingArcContainer}>
                    <View style={styles.wakingArcTrack}>
                      <View
                        style={[
                          styles.wakingArcFill,
                          {
                            width: `${dayArcPercent}%`,
                            // @ts-ignore
                            backgroundImage: 'linear-gradient(to right, rgba(108, 93, 211, 0.4), #6C5DD3)'
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.wakingArcValue}>{dayArcPercent}%</Text>
                  </View>
                )}
              </View>
            ) : (
              // 0 goals scheduled for today state
              <View style={styles.heroCompletedContent}>
                <Text style={styles.heroCompletedTitle}>Hello, {profileName}</Text>
                <Text style={styles.heroCompletedSub}>Set up schedules in the Goals tab.</Text>
                
                {/* Onboarding Guide Card */}
                <View style={styles.guideCard}>
                  <Text style={styles.guideCardTitle}>How to get started</Text>
                  
                  <View style={styles.guideStep}>
                    <View style={styles.guideStepDot}>
                      <Text style={styles.guideStepDotText}>1</Text>
                    </View>
                    <Text style={styles.guideStepText}>Tap the Goals tab to create your first goal.</Text>
                  </View>
                  
                  <View style={styles.guideStep}>
                    <View style={styles.guideStepDot}>
                      <Text style={styles.guideStepDotText}>2</Text>
                    </View>
                    <Text style={styles.guideStepText}>Configure schedule days and time slots.</Text>
                  </View>
                  
                  <View style={styles.guideStep}>
                    <View style={styles.guideStepDot}>
                      <Text style={styles.guideStepDotText}>3</Text>
                    </View>
                    <Text style={styles.guideStepText}>Tap the Voice Orb at the bottom to talk to your coach.</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Calendar Week Selector */}
          {renderDaySelector()}

          {/* Timeline header + Add */}
          <View style={styles.timelineHeaderRow}>
            <Text style={styles.timelineHeaderLabel}>Schedule</Text>
            <Pressable onPress={() => router.push('/(app)/add' as any)} style={styles.addBtnPill}>
              <Text style={styles.addBtnPillText}>+ Add</Text>
            </Pressable>
          </View>

          {/* Timeline Strip */}
          <Animated.View style={animatedTimelineStyle}>
            {timeline.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timelineScroll}
              >
                {timeline.map((slot, i) => {
                  const oc = slotOutcome(slot);
                  const isCompleted = oc === 'completed';
                  const isSkipped = oc === 'skipped';
                  const isNext = nextCall && slot.scheduleId === nextCall.scheduleId && !isCompleted && !isSkipped;
                  const isDone = slot.status === 'done';
                  const isActive = slot.status === 'active' && !isCompleted && !isSkipped;
                  const isUpcoming = slot.status === 'upcoming';

                  return (
                    <Pressable
                      key={`${slot.scheduleId}-${i}`}
                      onPress={() => {
                        setSelectedSlot(slot);
                        setShowDetailSheet(true);
                      }}
                      style={[
                        styles.timelinePill,
                        isDone && styles.pillDone,
                        isUpcoming && styles.pillUpcoming,
                        isActive && styles.pillActive,
                        isNext && styles.pillNext,
                        isCompleted && styles.pillCompleted,
                        isSkipped && styles.pillSkipped,
                      ]}
                    >
                      <View style={styles.pillTimeRow}>
                        <Text style={[
                          styles.pillTimeText,
                          isDone && styles.pillTimeDone,
                          isActive && styles.pillTimeActive,
                          isUpcoming && styles.pillTimeUpcoming,
                          isNext && styles.pillTimeNext,
                        ]}>
                          {slot.timeLabel.split(' ')[0]}
                        </Text>
                        <Text style={[
                          styles.pillPeriodText,
                          isDone && styles.pillTimeDone,
                          isActive && styles.pillTimeActive,
                          isUpcoming && styles.pillTimeUpcoming,
                          isNext && styles.pillTimeNext,
                        ]}>
                          {slot.timeLabel.split(' ')[1]}
                        </Text>
                      </View>

                      {/* Status indicator — ✓ / — for recorded outcomes, else a dot */}
                      <View style={styles.pillDotContainer}>
                        {isCompleted ? (
                          <Text style={styles.pillCheck}>✓</Text>
                        ) : isSkipped ? (
                          <Text style={styles.pillSkip}>—</Text>
                        ) : isActive || isNext ? (
                          <Animated.View style={[
                            styles.pillDotActive,
                            isActive ? styles.pillDotActiveLive : styles.pillDotActiveNext,
                            animatedActiveDotStyle
                          ]} />
                        ) : (
                          <View style={[
                            styles.pillDot,
                            isDone && styles.pillDotDone,
                            isUpcoming && styles.pillDotUpcoming,
                          ]} />
                        )}
                      </View>

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.pillGoalText,
                          isDone && styles.pillGoalDone,
                          isActive && styles.pillGoalActive,
                          isUpcoming && styles.pillGoalUpcoming,
                          isNext && styles.pillGoalNext,
                        ]}
                      >
                        {slotDisplayName(slot)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              // 0 Goals Timeline strip replacement
              <Pressable
                onPress={() => router.push('/(app)/goals' as any)}
                style={styles.timelineEmptyCard}
              >
                <Text style={styles.timelineEmptyText}>+ Add your first goal</Text>
              </Pressable>
            )}
          </Animated.View>

          {/* Hairline Divider */}
          <View style={styles.hairlineDivider} />

          {/* Bottom Action Zone */}
          <View style={styles.bottomActionZone}>
            {/* Escape Buttons row */}
            <View style={styles.escapeBtnRow}>
              <View style={styles.escapeBtnCol}>
                <Pressable
                  onPress={handleRoughDayTap}
                  style={[
                    styles.escapeBtn,
                    isRoughDayTapped && styles.escapeBtnTapped,
                  ]}
                >
                  <Text style={styles.escapeBtnText}>Rough Day</Text>
                </Pressable>
                <Text style={styles.escapeBtnCaption}>+ Skip today's calls, no streak loss</Text>
              </View>
              
              <View style={styles.escapeBtnCol}>
                <Pressable
                  onPress={handleHitWall}
                  style={[
                    styles.escapeBtn,
                    isHittingWall && styles.escapeBtnTapped,
                  ]}
                >
                  <Text style={styles.escapeBtnText}>Hit a Wall</Text>
                </Pressable>
                <Text style={styles.escapeBtnCaption}>🎙 Emergency coach session</Text>
              </View>
            </View>

            {/* Reserved space where the quick-add button was — kept so the content
                above doesn't shift down; the nav-bar orb floats up into this area. */}
            <View style={{ height: 84 }} />
          </View>

          {/* Safe Space tabbar inset */}
          <View style={{ height: 12 }} />

        </SafeAreaView>
      </Animated.View>

      {/* Dimmed Background live call overlay */}
      {isLiveCallBackground && (
        <View style={styles.liveCallDimBg}>
          <Pressable
            onPress={() => router.push('/call?type=wall')}
            style={styles.liveCallPillContainer}
          >
            <Animated.View style={[styles.liveCallPill, animatedLiveCallPillStyle]}>
              <View style={styles.liveCallPulseDot} />
              <Text style={styles.liveCallText}>
                Live call · {nextCall?.goalTitle ?? 'Gym Session'} · Tap to return
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      )}

      {/* Rough Day Confirmation Modal Sheet */}
      <Modal
        transparent
        visible={showRoughDayModal}
        animationType="slide"
        onRequestClose={() => setShowRoughDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismissArea} onPress={() => setShowRoughDayModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Having a rough day?</Text>
            <Text style={styles.modalDescription}>
              We will dim today's scheduled check-ins and ease up on goals. No pressure, just take it easy.
            </Text>
            <View style={styles.modalActionRow}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowRoughDayModal(false)}
              >
                <Text style={styles.modalBtnTextSecondary}>Nevermind</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => {
                  setRoughDayMode(true);
                  setShowRoughDayModal(false);
                }}
              >
                <Text style={styles.modalBtnTextPrimary}>Yes, ease up</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Goal Detail Sheet Modal */}
      <Modal
        transparent
        visible={showDetailSheet && selectedSlot !== null}
        animationType="slide"
        onRequestClose={() => setShowDetailSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismissArea} onPress={() => setShowDetailSheet(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            {selectedSlot && (
              <>
                <Text style={styles.modalTitle}>{slotDisplayName(selectedSlot)}</Text>
                {selectedSlot.label?.trim() && selectedSlot.kind === 'goal' && (
                  <Text style={styles.modalParent}>in {selectedSlot.goalTitle}</Text>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Scheduled time</Text>
                  <Text style={styles.detailValue}>{selectedSlot.timeLabel}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Coaching framework</Text>
                  <Text style={styles.detailValue}>
                    {FRAMEWORK_LABEL[selectedSlot.framework] || 'Atomic Habits'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Session type</Text>
                  <Text style={styles.detailValue}>
                    {selectedSlot.kind === 'kickoff' ? 'Morning Kickoff' :
                     selectedSlot.kind === 'cooldown' ? 'Evening Cooldown' :
                     selectedSlot.kind === 'routine' ? 'Routine Reminder' :
                     selectedSlot.timeLabel.includes('AM') ? 'Morning Check-in' :
                     selectedSlot.timeLabel.includes('12:') || selectedSlot.timeLabel.includes('1:') || selectedSlot.timeLabel.includes('2:') ? 'Midday Check-in' : 'Evening Check-in'}
                  </Text>
                </View>

                <View style={styles.promptPreviewContainer}>
                  <Text style={styles.promptPreviewLabel}>Session Focus</Text>
                  <Text style={styles.promptPreviewText}>
                    {selectedSlot.kind === 'kickoff' ? 'Set the day: surface your top 1–3 commitments and a first action for the next couple of hours.' :
                     selectedSlot.kind === 'cooldown' ? 'Wind down: log how the day went, celebrate the wins, and prime tomorrow.' :
                     selectedSlot.kind === 'routine' ? 'Quick reminder. Coach rings, names the routine, asks if you handled it. Under 15 seconds.' :
                     selectedSlot.timeLabel.includes('AM') ? 'Plan your morning focus blocks, anticipate obstacles, and align with your core identity goals.' :
                     selectedSlot.timeLabel.includes('12:') || selectedSlot.timeLabel.includes('1:') || selectedSlot.timeLabel.includes('2:') ? 'Review your midday consistency, track current progress, and pivot tactics if hitting a hurdle.' :
                     'Reflect on today\'s wins and setbacks, celebrate micro-successes, and synthesize lessons for tomorrow.'}
                  </Text>
                </View>

                {/* Outcome — mark this slot done / skipped (or undo). Today only. */}
                {viewingToday && (
                <View style={styles.outcomeRow}>
                  {slotOutcome(selectedSlot) ? (
                    <>
                      <View style={styles.outcomeStatusPill}>
                        <Text style={styles.outcomeStatusText}>
                          {slotOutcome(selectedSlot) === 'completed' ? '✓  Marked done' : '—  Marked skipped'}
                        </Text>
                      </View>
                      <Pressable style={[styles.outcomeBtn, styles.outcomeBtnUndo]} onPress={undoSelected}>
                        <Text style={styles.outcomeBtnUndoText}>Undo</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Pressable style={[styles.outcomeBtn, styles.outcomeBtnDone]} onPress={() => markSelected('done')}>
                        <Text style={styles.outcomeBtnDoneText}>✓  Mark done</Text>
                      </Pressable>
                      <Pressable style={[styles.outcomeBtn, styles.outcomeBtnSkip]} onPress={() => markSelected('skipped')}>
                        <Text style={styles.outcomeBtnSkipText}>Skip</Text>
                      </Pressable>
                    </>
                  )}
                </View>
                )}

                <View style={styles.modalActionRow}>
                  <Pressable
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => {
                      setShowDetailSheet(false);
                      if (selectedSlot.kind === 'kickoff' || selectedSlot.kind === 'cooldown') {
                        setEditingAnchor(selectedSlot.kind);
                      } else if (selectedSlot.kind === 'routine') {
                        router.push('/(app)/goals' as any);
                      } else {
                        router.push({ pathname: '/(app)/goal-detail', params: { id: selectedSlot.goalId } } as any);
                      }
                    }}
                  >
                    <Text style={styles.modalBtnTextSecondary}>
                      {selectedSlot.kind === 'kickoff' || selectedSlot.kind === 'cooldown' ? 'Edit Time' :
                       selectedSlot.kind === 'routine' ? 'Edit Routine' : 'Edit Schedule'}
                    </Text>
                  </Pressable>

                  {selectedSlot.status !== 'done' && (
                    <Pressable
                      style={[styles.modalBtn, styles.modalBtnPrimary]}
                      onPress={() => {
                        setShowDetailSheet(false);
                        const callType =
                          selectedSlot.kind === 'kickoff' ? 'morning' :
                          selectedSlot.kind === 'cooldown' ? 'retro' :
                          selectedSlot.kind === 'routine' ? 'routine' : 'midday';
                        // For a named slot, give the coach both the task and its parent goal.
                        const callTitle =
                          selectedSlot.kind === 'goal' && selectedSlot.label?.trim()
                            ? `${selectedSlot.label.trim()} (${selectedSlot.goalTitle})`
                            : selectedSlot.goalTitle;
                        router.push(`/call?goalId=${selectedSlot.goalId}&goalTitle=${encodeURIComponent(callTitle)}&type=${callType}`);
                      }}
                    >
                      <Text style={styles.modalBtnTextPrimary}>🎙 Call Coach Now</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* In-place time editor for the daily anchor calls */}
      <TimePickerSheet
        visible={editingAnchor !== null}
        title={editingAnchor === 'kickoff' ? 'Morning Kickoff time' : 'Evening Cooldown time'}
        value={(editingAnchor === 'kickoff' ? kickoffTime : cooldownTime) ?? '07:00'}
        onClose={() => setEditingAnchor(null)}
        onSave={(t) => {
          // Optimistic local update so the timeline reflects it immediately,
          // then persist (best-effort; re-syncs on next foreground).
          if (editingAnchor === 'kickoff') {
            setKickoffTime(t);
            updateProfile({ morning_sync_time: t }).catch(e => console.warn('[home] save kickoff', e));
          } else if (editingAnchor === 'cooldown') {
            setCooldownTime(t);
            updateProfile({ preferred_check_in_local_time: t }).catch(e => console.warn('[home] save cooldown', e));
          }
        }}
      />

    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerLeftBtn: {
    paddingVertical: 4,
    paddingRight: 16,
  },
  headerDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6B7280', // text-2
  },
  headerVelocityCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  velocityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  velocityTrendText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10.5,
  },
  velocityTrendUp: {
    color: '#10B981', // green arrow
  },
  velocityTrendDown: {
    color: '#F43F5E', // rose red arrow
  },
  velocityValue: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 14,
    color: '#6C5DD3', // Highlight accent
  },
  velocityLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1,
    color: '#A0AEC0', // text-3
  },
  daySelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    backgroundColor: 'transparent',
  },
  daySelectorCol: {
    flex: 1,
    maxWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    height: 72,
    borderRadius: 22,
    position: 'relative',
    paddingVertical: 6,
  },
  daySelectorColSelected: {
    backgroundColor: '#6C5DD3',
  },
  daySelectorLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#8A94A6',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  daySelectorLabelSelected: {
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  dateContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dateContainerSelected: {
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: '#1E1B4B',
  },
  dateTextSelected: {
    color: '#6C5DD3',
  },
  daySelectorTodayDot: {
    position: 'absolute',
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C5DD3',
  },
  daySelectorTodayDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  heroCallContent: {
    width: '100%',
    alignItems: 'center',
  },
  heroCompletedContent: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  heroCompletedTitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 28,
    color: '#1E1B4B',
    textAlign: 'center',
  },
  heroCompletedSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  heroEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  heroEyebrowLine: {
    width: 16,
    height: 1,
    backgroundColor: '#A0AEC0',
  },
  heroEyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#A0AEC0', // text-3
  },
  heroTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  heroTimeNumeral: {
    fontFamily: 'Inter_100Thin',
    fontSize: 78,
    letterSpacing: -3.5,
    color: '#1E1B4B', // text-1
  },
  heroTimePeriod: {
    fontFamily: 'Inter_300Light',
    fontSize: 20,
    color: '#1E1B4B',
    marginLeft: 4,
    marginTop: 24,
  },
  heroGoalTitle: {
    fontFamily: 'Inter_300Light',
    fontSize: 23,
    letterSpacing: -0.5,
    color: '#1E1B4B',
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  heroMetaFramework: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6B7280', // text-2
  },
  heroMetaBullet: {
    color: '#6B7280',
    fontSize: 12,
  },
  heroMetaCountdown: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6C5DD3', // Brand purple accent
    opacity: 0.8,
  },
  wakingArcContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    paddingHorizontal: 8,
  },
  wakingArcTrack: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(108, 93, 211, 0.05)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  wakingArcFill: {
    height: '100%',
    backgroundColor: '#6C5DD3',
  },
  wakingArcValue: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: '#A0AEC0', // text-3
  },
  hairlineDivider: {
    height: 1,
    backgroundColor: 'rgba(108, 93, 211, 0.05)',
    marginHorizontal: 24,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  timelineHeaderLabel: {
    color: '#1E1B4B',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },
  addBtnPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.25)',
  },
  addBtnPillText: {
    color: '#6C5DD3',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  timelineScroll: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  timelineEmptyCard: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineEmptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6C5DD3',
  },
  timelinePill: {
    minWidth: 104,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  pillDone: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
    shadowOpacity: 0.01,
  },
  pillActive: {
    backgroundColor: '#F3F1FC',
    borderColor: '#6C5DD3',
    shadowColor: '#6C5DD3',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  pillUpcoming: {
    borderColor: 'rgba(108, 93, 211, 0.16)',
    shadowColor: '#6C5DD3',
    shadowOpacity: 0.04,
  },
  pillNext: {
    borderColor: '#6C5DD3',
    borderWidth: 1.8,
    transform: [{ scale: 1.05 }],
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: '#FFFFFF',
  },
  pillTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  pillTimeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11.5,
    letterSpacing: -0.2,
  },
  pillPeriodText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 8.5,
    letterSpacing: 0.3,
    opacity: 0.75,
  },
  pillCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  pillSkipped: {
    backgroundColor: '#F4F6FB',
    borderColor: 'rgba(108, 93, 211, 0.12)',
    opacity: 0.7,
  },
  pillCheck: {
    fontSize: 11,
    lineHeight: 12,
    color: '#10B981',
    fontFamily: 'Inter_600SemiBold',
  },
  pillSkip: {
    fontSize: 11,
    lineHeight: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter_600SemiBold',
  },
  pillTimeDone: {
    color: '#6C5DD3',
  },
  pillTimeActive: {
    color: '#6C5DD3',
  },
  pillTimeUpcoming: {
    color: '#6C5DD3',
  },
  pillTimeNext: {
    color: '#6C5DD3',
  },
  pillDotContainer: {
    height: 8,
    width: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillDotDone: {
    backgroundColor: '#10B981',
  },
  pillDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillDotActiveLive: {
    backgroundColor: '#FB923C',
  },
  pillDotActiveNext: {
    backgroundColor: '#6C5DD3',
  },
  pillDotUpcoming: {
    backgroundColor: '#A0AEC0',
  },
  pillGoalText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 15,
  },
  pillGoalDone: {
    color: '#1E1B4B',
  },
  pillGoalActive: {
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
  },
  pillGoalUpcoming: {
    color: '#1E1B4B',
    fontFamily: 'Inter_500Medium',
  },
  pillGoalNext: {
    color: '#1E1B4B',
    fontFamily: 'Inter_600SemiBold',
  },
  pillRoutineTag: {
    marginTop: 4,
    fontSize: 8,
    letterSpacing: 1,
    color: '#9CA3AF',
    fontFamily: 'JetBrainsMono_500Medium',
  },
  pillRoutineTagActive: {
    color: '#9CA3AF',
  },
  bottomActionZone: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 18,
  },
  escapeBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  escapeBtnCol: {
    flex: 1,
    alignItems: 'center',
  },
  escapeBtn: {
    width: '100%',
    backgroundColor: '#6C5DD3',
    borderRadius: 13,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escapeBtnTapped: {
    backgroundColor: '#5748C2',
  },
  escapeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  escapeBtnCaption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9.5,
    color: '#A0AEC0',
    marginTop: 5,
    textAlign: 'center',
  },
  voiceOrbWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  voiceOrbLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: '#A0AEC0', // idle
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voiceOrbLabelActive: {
    color: '#6C5DD3', // active
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6C5DD3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  addCirclePlus: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
    marginTop: -2,
    fontFamily: 'Inter_400Regular',
  },

  // Background Live Call Banner & Dim overlay
  liveCallDimBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 27, 75, 0.18)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
    zIndex: 999,
  },
  liveCallPillContainer: {
    alignSelf: 'center',
  },
  liveCallPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#6C5DD3',
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    gap: 8,
  },
  liveCallPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F43F5E',
  },
  liveCallText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#1E1B4B',
  },

  // Modal Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 75, 0.4)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 42,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(108, 93, 211, 0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1E1B4B',
    marginBottom: 8,
  },
  modalParent: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6C5DD3',
    marginTop: -4,
    marginBottom: 8,
  },
  modalDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 24,
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  outcomeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  outcomeBtnDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  outcomeBtnDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  outcomeBtnSkip: {
    backgroundColor: 'rgba(108, 93, 211, 0.04)',
    borderColor: 'rgba(108, 93, 211, 0.12)',
  },
  outcomeBtnSkipText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  outcomeStatusPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  outcomeStatusText: {
    color: '#059669',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  outcomeBtnUndo: {
    backgroundColor: 'rgba(108, 93, 211, 0.04)',
    borderColor: 'rgba(108, 93, 211, 0.12)',
    flex: 0,
    paddingHorizontal: 20,
  },
  outcomeBtnUndoText: {
    color: '#6C5DD3',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: '#6C5DD3',
  },
  modalBtnSecondary: {
    backgroundColor: 'rgba(108, 93, 211, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
  },
  modalBtnTextPrimary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  modalBtnTextSecondary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#6B7280',
  },
  guideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(108, 93, 211, 0.08)',
    padding: 20,
    width: '100%',
    marginTop: 24,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 3,
  },
  guideCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#1E1B4B',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  guideStepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(108, 93, 211, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideStepDotText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10.5,
    color: '#6C5DD3',
  },
  guideStepText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(108, 93, 211, 0.05)',
  },
  detailLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#1E1B4B',
  },
  promptPreviewContainer: {
    backgroundColor: 'rgba(108, 93, 211, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginVertical: 18,
  },
  promptPreviewLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#6C5DD3',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptPreviewText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#4A5568',
    lineHeight: 18,
  },
});

