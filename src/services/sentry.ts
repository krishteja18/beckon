/**
 * sentry.ts — error tracking init.
 *
 * Wire-up:
 *   1. Sign up at sentry.io (free tier)
 *   2. Create a React Native project, copy the DSN
 *   3. Set EXPO_PUBLIC_SENTRY_DSN in .env (and eas.json env)
 *   4. Call initSentry() at the top of app/_layout.tsx
 *
 * No DSN configured → silent no-op (safe for local dev).
 */

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    debug: __DEV__,
  });
}

export function captureException(err: unknown, context?: Record<string, any>) {
  if (!DSN) return;
  Sentry.captureException(err, { extra: context });
}

export { Sentry };
