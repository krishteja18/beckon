package ai.showup.alarm

/**
 * Type alias so AlarmReceiver / VoiceCallService / BootReceiver can reference
 * "MainLauncher" without knowing the app's actual MainActivity class name.
 *
 * The host app must override this in its own manifest by setting the launch
 * intent. For now, we resolve the launch intent dynamically via
 * `packageManager.getLaunchIntentForPackage(...)` instead.
 *
 * Keep this file empty intentionally — it exists only because the receiver
 * code references the type. Replace with the real MainActivity once the
 * Expo app integration is finalized.
 */
class MainLauncher {
  // intentionally empty — see file comment
}
