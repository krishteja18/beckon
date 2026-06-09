package ai.showup.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * VoiceCallService — foreground service (type=mediaPlayback) that handles
 * an entire scheduled voice call session.
 *
 * Lifecycle:
 *   1. Show persistent notification (required by foreground service contract).
 *   2. Request audio focus (ducks Spotify/podcasts).
 *   3. Check if user is on a PSTN call → defer via PhoneStateMonitor.
 *   4. Open MainLauncher with deep-link params; JS-side picks up the alarm-fired
 *      event and drives the Gemini Live WebSocket from there.
 *   5. (Future) If app process is dead, fall back to a fully-native Gemini
 *      WebSocket loop that runs without JS.
 *   6. On call end: release audio focus, write check_in/task_event via JS, stop.
 */
class VoiceCallService : Service() {

  companion object {
    const val CHANNEL_ID = "showup-calls"
    const val NOTIFICATION_ID = 1
  }

  private var audioManager: AudioManager? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val goalTitle = intent?.getStringExtra("goalTitle") ?: "Showup"
    val alarmId   = intent?.getStringExtra("alarmId") ?: ""
    val goalId    = intent?.getStringExtra("goalId")
    val callType  = intent?.getStringExtra("callType") ?: "morning"
    val prompt    = intent?.getStringExtra("promptBlueprint") ?: ""

    startForegroundCompat(goalTitle)

    requestAudioFocus()

    // Launch the app's main activity with deep-link params so the JS side
    // navigates to the /call screen and opens the Gemini WebSocket.
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      data = android.net.Uri.parse(
        "showup://call?alarmId=$alarmId" +
        (goalId?.let { "&goalId=$it" } ?: "") +
        "&goalTitle=${android.net.Uri.encode(goalTitle)}" +
        "&type=$callType"
      )
      putExtra("promptBlueprint", prompt)
    }
    launch?.let { startActivity(it) }

    // For now, stop the service after launching the activity. The activity
    // owns the call session. A future iteration moves the WebSocket into
    // the service itself so the call survives the app being killed.
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    releaseAudioFocus()
    super.onDestroy()
  }

  // ── Foreground notification ──────────────────────────────────────────

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID, "Scheduled coach calls", NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Plays your scheduled Showup voice check-ins."
      setShowBadge(false)
      setSound(null, null) // we own the audio playback
      enableVibration(true)
    }
    nm.createNotificationChannel(channel)
  }

  private fun startForegroundCompat(goalTitle: String) {
    val tapIntent = packageManager.getLaunchIntentForPackage(packageName)
    val tap = PendingIntent.getActivity(
      this, 0, tapIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val n: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info) // TODO: app icon
      .setContentTitle("Showup")
      .setContentText(goalTitle)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(tap)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        NOTIFICATION_ID, n,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(NOTIFICATION_ID, n)
    }
  }

  // ── Audio focus ──────────────────────────────────────────────────────

  private var focusRequest: android.media.AudioFocusRequest? = null

  private fun requestAudioFocus() {
    val am = audioManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val req = android.media.AudioFocusRequest.Builder(
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
      )
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build(),
        )
        .setWillPauseWhenDucked(false)
        .build()
      focusRequest = req
      am.requestAudioFocus(req)
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(
        null,
        AudioManager.STREAM_VOICE_CALL,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
      )
    }
  }

  private fun releaseAudioFocus() {
    val am = audioManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      am.abandonAudioFocus(null)
    }
  }
}
