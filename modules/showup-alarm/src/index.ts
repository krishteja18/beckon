import { requireNativeModule, EventEmitter } from 'expo-modules-core';

export type CallType = 'morning' | 'midday' | 'evening' | 'wall' | 'retro';

export interface ScheduledAlarm {
  /** Unique id matching a goal_schedules row id, OR a synthetic one for ad-hoc alarms. */
  alarmId: string;
  /** Wall-clock time the alarm should fire, as epoch ms. */
  fireAtMs: number;
  /** Goal id this call is for (for context injection into the prompt). */
  goalId: string | null;
  goalTitle: string;
  callType: CallType;
  /** Prompt blueprint composed at schedule time (BASE+INTENSITY+CALL_TYPE+framework). */
  promptBlueprint: string;
}

export interface AlarmFiredEvent {
  alarmId: string;
  goalId: string | null;
  goalTitle: string;
  callType: CallType;
  promptBlueprint: string;
}

interface NativeShowupAlarm {
  /** Schedule a single alarm via AlarmManager.setAlarmClock(). */
  scheduleAlarm(alarm: ScheduledAlarm): Promise<void>;
  /** Cancel a previously scheduled alarm. */
  cancelAlarm(alarmId: string): Promise<void>;
  /** Cancel ALL pending alarms (e.g. on sign-out or rough-day). */
  cancelAllAlarms(): Promise<void>;
  /** Re-arm all alarms from the JS-side cache (called after BOOT_COMPLETED). */
  rearmAllAlarms(alarms: ScheduledAlarm[]): Promise<void>;
  /** Return the list of currently pending alarm ids. */
  listPendingAlarms(): Promise<string[]>;
  /** Check if USE_EXACT_ALARM permission is granted. */
  canScheduleExactAlarms(): Promise<boolean>;
  /** Request the user to enable autostart in their OEM's settings (Xiaomi etc). */
  openOemAutostartSettings(): Promise<boolean>;
  /** Manufacturer string (Build.MANUFACTURER) — used for OEM-specific onboarding. */
  getDeviceManufacturer(): string;
}

const NativeModule = requireNativeModule('ShowupAlarm') as unknown as NativeShowupAlarm;
// `EventEmitter` typing is overly restrictive; cast to a permissive shape.
const emitter: any = new (EventEmitter as any)(NativeModule);

export const ShowupAlarm = {
  scheduleAlarm:           NativeModule.scheduleAlarm,
  cancelAlarm:             NativeModule.cancelAlarm,
  cancelAllAlarms:         NativeModule.cancelAllAlarms,
  rearmAllAlarms:          NativeModule.rearmAllAlarms,
  listPendingAlarms:       NativeModule.listPendingAlarms,
  canScheduleExactAlarms:  NativeModule.canScheduleExactAlarms,
  openOemAutostartSettings: NativeModule.openOemAutostartSettings,
  manufacturer:            NativeModule.getDeviceManufacturer(),

  /** Subscribe to alarm-fired events. The ForegroundService emits this when an
   *  alarm fires AND the app process is alive. (If the app is dead, the native
   *  service handles the call entirely without JS involvement, then the next
   *  app-open shows the captured outcome via the regular Supabase read.) */
  onAlarmFired(handler: (e: AlarmFiredEvent) => void) {
    return emitter.addListener('onAlarmFired', handler);
  },
};

export default ShowupAlarm;
