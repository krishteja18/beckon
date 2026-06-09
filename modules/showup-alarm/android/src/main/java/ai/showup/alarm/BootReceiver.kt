package ai.showup.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import org.json.JSONObject

/**
 * BootReceiver — re-arms all stored alarms on:
 *   - BOOT_COMPLETED       (device reboot)
 *   - LOCKED_BOOT_COMPLETED (Direct Boot, before user unlocks)
 *   - MY_PACKAGE_REPLACED   (app update)
 *   - TIME_SET              (user manually changed clock)
 *   - TIMEZONE_CHANGED      (timezone shifted, e.g. travel)
 *
 * AlarmManager forgets all pending alarms on reboot — without this, every
 * reboot silently breaks future scheduled calls.
 */
class BootReceiver : BroadcastReceiver() {

  override fun onReceive(ctx: Context, intent: Intent) {
    val action = intent.action ?: return
    when (action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_LOCKED_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED -> rearm(ctx)
    }
  }

  private fun rearm(ctx: Context) {
    val prefs = ctx.getSharedPreferences(ShowupAlarmModule.PREFS, Context.MODE_PRIVATE)
    val raw = prefs.getString(ShowupAlarmModule.PREFS_KEY_ALARMS, null) ?: return
    val stored = try { JSONObject(raw) } catch (_: Exception) { return }

    val mgr = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val now = System.currentTimeMillis()

    val ids = stored.keys()
    while (ids.hasNext()) {
      val id = ids.next()
      val j  = stored.optJSONObject(id) ?: continue
      val fireAt = j.optLong("fireAtMs")
      // Skip alarms that should have already fired (catch-up handles them in-app)
      if (fireAt <= now) continue

      val alarmIntent = Intent(ctx, AlarmReceiver::class.java).apply {
        action = "ai.showup.alarm.FIRE"
        data = Uri.parse("showup-alarm://$id")
        putExtra("alarmId",         id)
        putExtra("goalId",          j.optString("goalId").takeIf { it.isNotEmpty() })
        putExtra("goalTitle",       j.optString("goalTitle"))
        putExtra("callType",        j.optString("callType"))
        putExtra("promptBlueprint", j.optString("promptBlueprint"))
      }
      val pending = PendingIntent.getBroadcast(
        ctx, id.hashCode(), alarmIntent,
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      val showIntent = PendingIntent.getActivity(
        ctx, id.hashCode(),
        Intent(ctx, MainLauncher::class.java),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      mgr.setAlarmClock(AlarmManager.AlarmClockInfo(fireAt, showIntent), pending)
    }
  }
}
