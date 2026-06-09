package ai.showup.alarm

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * OemAutostart — deep-links into manufacturer-specific autostart managers.
 *
 * Reference: dontkillmyapp.com — these intents are well-known but not officially
 * documented. They can break between OEM updates; fall back to the generic
 * battery-optimization page if a specific intent doesn't resolve.
 */
object OemAutostart {

  fun openSettings(ctx: Context): Boolean {
    val manufacturer = (Build.MANUFACTURER ?: "").lowercase()
    val candidates = when {
      manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") ->
        listOf(
          ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
          ComponentName("com.miui.securitycenter", "com.miui.appmanager.ApplicationsDetailsActivity"),
        )
      manufacturer.contains("samsung") ->
        listOf(
          ComponentName("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"),
          ComponentName("com.samsung.android.sm",   "com.samsung.android.sm.ui.battery.BatteryActivity"),
        )
      manufacturer.contains("oppo") ->
        listOf(
          ComponentName("com.coloros.safecenter",   "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
          ComponentName("com.oppo.safe",            "com.oppo.safe.permission.startup.StartupAppListActivity"),
        )
      manufacturer.contains("vivo") ->
        listOf(
          ComponentName("com.iqoo.secure",          "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
          ComponentName("com.vivo.permissionmanager","com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
        )
      manufacturer.contains("oneplus") ->
        listOf(
          ComponentName("com.oneplus.security",     "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"),
        )
      manufacturer.contains("huawei") || manufacturer.contains("honor") ->
        listOf(
          ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
          ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
        )
      else -> emptyList()
    }

    for (cn in candidates) {
      val intent = Intent().apply {
        component = cn
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      try {
        ctx.startActivity(intent)
        return true
      } catch (_: Exception) {
        // try next candidate
      }
    }

    // Fallback: generic battery-optimization settings
    try {
      val intent = Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
      return true
    } catch (_: Exception) {
      return false
    }
  }
}
