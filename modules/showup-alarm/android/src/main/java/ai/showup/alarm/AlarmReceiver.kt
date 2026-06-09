package ai.showup.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * AlarmReceiver — entry point when AlarmManager fires.
 *
 * We have ~10s of foreground priority on Android < 12 and stricter limits on 12+.
 * Just hand off to VoiceCallService (which becomes a foreground service with
 * type=mediaPlayback) immediately. All real work happens there.
 */
class AlarmReceiver : BroadcastReceiver() {

  override fun onReceive(ctx: Context, intent: Intent) {
    val service = Intent(ctx, VoiceCallService::class.java).apply {
      putExtra("alarmId",          intent.getStringExtra("alarmId") ?: "")
      putExtra("goalId",           intent.getStringExtra("goalId"))
      putExtra("goalTitle",        intent.getStringExtra("goalTitle") ?: "")
      putExtra("callType",         intent.getStringExtra("callType") ?: "morning")
      putExtra("promptBlueprint",  intent.getStringExtra("promptBlueprint") ?: "")
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      ctx.startForegroundService(service)
    } else {
      ctx.startService(service)
    }
  }
}
