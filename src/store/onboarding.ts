/**
 * Onboarding state — collected across screens, persisted on the final step.
 * Lightweight global store using React's useSyncExternalStore (no Redux/Zustand).
 */

import { useSyncExternalStore } from 'react';
import { Database } from '../services/database.types';

type Intensity = Database['public']['Enums']['intensity_level'];
type Framework = Database['public']['Enums']['framework_key'];

export interface OnboardingState {
  name: string;
  timezone: string;
  intensity: Intensity | null;
  framework: Framework | null;
  goals: { title: string; scheduledTime?: string }[];
  /** Optional routines captured during onboarding. days: 0=Sun..6=Sat. */
  routines: { title: string; time: string; days: number[] }[];
  scheduleTimes: string[];      // ['06:00', '18:00']
  retroTime: string | null;     // '21:30'
  morningSyncTime: string;      // default '07:00'
}

const initial: OnboardingState = {
  name: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  intensity: null,
  framework: null,
  goals: [],
  routines: [],
  scheduleTimes: [],
  retroTime: null,
  morningSyncTime: '07:00',
};

let state: OnboardingState = { ...initial };
const listeners = new Set<() => void>();

function emit() { listeners.forEach(l => l()); }

export const onboarding = {
  get: (): OnboardingState => state,
  set: (patch: Partial<OnboardingState>) => {
    state = { ...state, ...patch };
    emit();
  },
  reset: () => {
    state = { ...initial };
    emit();
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useOnboarding(): OnboardingState {
  return useSyncExternalStore(onboarding.subscribe, onboarding.get, onboarding.get);
}
