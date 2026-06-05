import { requireNativeModule, EventEmitter } from 'expo-modules-core';

export type CallType = 'morning' | 'midday' | 'evening' | 'wall' | 'retro' | 'routine';

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
  /** Request PushKit registration for VoIP push tokens. */
  requestCallKitPermissions(): Promise<boolean>;
  /** Simulates a CallKit incoming call UI (for simulator testing). */
  simulateIncomingCall(title: string): Promise<void>;
  /** Start raw PCM audio capture (16kHz 16-bit Mono input) and playback (sampleRate 16-bit Mono output) */
  startAudioSession(playbackSampleRate: number): Promise<void>;
  /** Stop raw PCM audio capture and playback, releasing resources */
  stopAudioSession(): Promise<void>;
  /** Queue a base64 PCM audio chunk to be played back */
  playAudioChunk(base64: string, sampleRate: number): Promise<void>;
}

let NativeModule: NativeShowupAlarm;
try {
  const mod = requireNativeModule('ShowupAlarm') as unknown as NativeShowupAlarm;
  if (!mod || typeof mod.getDeviceManufacturer !== 'function') {
    throw new Error('Native ShowupAlarm module is not loaded');
  }
  NativeModule = mod;
} catch (e) {
  // Safe mock for Web/Expo Go
  NativeModule = {
    scheduleAlarm: async () => {},
    cancelAlarm: async () => {},
    cancelAllAlarms: async () => {},
    rearmAllAlarms: async () => {},
    listPendingAlarms: async () => [],
    canScheduleExactAlarms: async () => true,
    openOemAutostartSettings: async () => false,
    getDeviceManufacturer: () => 'unknown',
    requestCallKitPermissions: async () => false,
    simulateIncomingCall: async () => {},
    startAudioSession: async () => {},
    stopAudioSession: async () => {},
    playAudioChunk: async () => {},
  } as any;
}

// `EventEmitter` typing is overly restrictive; cast to a permissive shape.
let emitter: any;
try {
  emitter = new (EventEmitter as any)(NativeModule);
} catch (e) {
  emitter = {
    addListener: () => ({ remove: () => {} }),
  };
}

export const ShowupAlarm = {
  scheduleAlarm:           NativeModule.scheduleAlarm,
  cancelAlarm:             NativeModule.cancelAlarm,
  cancelAllAlarms:         NativeModule.cancelAllAlarms,
  rearmAllAlarms:          NativeModule.rearmAllAlarms,
  listPendingAlarms:       NativeModule.listPendingAlarms,
  canScheduleExactAlarms:  NativeModule.canScheduleExactAlarms,
  openOemAutostartSettings: NativeModule.openOemAutostartSettings,
  manufacturer:            NativeModule.getDeviceManufacturer(),
  requestCallKitPermissions: NativeModule.requestCallKitPermissions,
  simulateIncomingCall:    NativeModule.simulateIncomingCall,
  startAudioSession:       NativeModule.startAudioSession,
  stopAudioSession:        NativeModule.stopAudioSession,
  playAudioChunk:          NativeModule.playAudioChunk,

  /** Subscribe to alarm-fired events. */
  onAlarmFired(handler: (e: AlarmFiredEvent) => void) {
    return emitter.addListener('onAlarmFired', handler);
  },

  /** Subscribe to PushKit VoIP token changes. */
  onVoipTokenReceived(handler: (e: { token: string }) => void) {
    return emitter.addListener('onVoipTokenReceived', handler);
  },

  /** Subscribe to CallKit Call Answered events. */
  onCallAnswered(handler: (e: { uuid: string }) => void) {
    return emitter.addListener('onCallAnswered', handler);
  },

  /** Subscribe to CallKit Call Ended events. */
  onCallEnded(handler: (e: { uuid: string }) => void) {
    return emitter.addListener('onCallEnded', handler);
  },

  /** Subscribe to raw PCM microphone capture events. */
  onAudioCapture(handler: (e: { data: string }) => void) {
    return emitter.addListener('onAudioCapture', handler);
  },
};

export default ShowupAlarm;
