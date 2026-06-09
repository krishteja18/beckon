package ai.showup.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Base64
import androidx.core.content.edit
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * ShowupAlarm — JS-facing native module.
 *
 * Scheduling: AlarmManager.setAlarmClock(). This is the same API the system
 * Clock app uses for wake-up alarms. It's the only AlarmManager API that
 * Xiaomi/HyperOS battery managers are reluctant to throttle.
 *
 * Persistence: pending alarm metadata is stored in SharedPreferences so the
 * BootReceiver can re-arm them after reboot without needing to wake the app.
 */
class ShowupAlarmModule : Module() {

  companion object {
    const val PREFS = "showup_alarms"
    const val PREFS_KEY_ALARMS = "alarms"
    const val EVENT_ALARM_FIRED = "onAlarmFired"
    const val EVENT_AUDIO_CAPTURE = "onAudioCapture"
  }

  private val ctx: Context get() = appContext.reactContext ?: throw IllegalStateException("No context")

  private var audioRecord: AudioRecord? = null
  private var audioTrack: AudioTrack? = null
  private var isRecording = false
  private var recordingThread: Thread? = null
  private val playbackExecutor = Executors.newSingleThreadExecutor()
  private var currentPlaybackSampleRate = 24000

  override fun definition() = ModuleDefinition {
    Name("ShowupAlarm")
    Events(EVENT_ALARM_FIRED, EVENT_AUDIO_CAPTURE)

    AsyncFunction("scheduleAlarm") { alarm: Map<String, Any?> ->
      schedule(alarm)
    }

    AsyncFunction("cancelAlarm") { alarmId: String ->
      cancel(alarmId)
    }

    AsyncFunction("cancelAllAlarms") {
      cancelAll()
    }

    AsyncFunction("rearmAllAlarms") { alarms: List<Map<String, Any?>> ->
      rearmAll(alarms)
    }

    AsyncFunction("listPendingAlarms") {
      readStoredAlarms().keys().asSequence().toList()
    }

    AsyncFunction("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        getAlarmMgr().canScheduleExactAlarms()
      } else true
    }

    AsyncFunction("openOemAutostartSettings") {
      OemAutostart.openSettings(ctx)
    }

    Function("getDeviceManufacturer") {
      Build.MANUFACTURER ?: "unknown"
    }

    AsyncFunction("startAudioSession") { playbackSampleRate: Int ->
      startAudio(playbackSampleRate)
    }

    AsyncFunction("stopAudioSession") {
      stopAudio()
    }

    AsyncFunction("playAudioChunk") { base64: String, sampleRate: Int ->
      playAudio(base64, sampleRate)
    }
  }

  // ── Scheduling ─────────────────────────────────────────────────────────

  private fun schedule(alarm: Map<String, Any?>) {
    val alarmId   = alarm["alarmId"] as? String ?: error("alarmId required")
    val fireAtMs  = (alarm["fireAtMs"] as? Number)?.toLong() ?: error("fireAtMs required")
    val intent    = buildAlarmIntent(alarmId, alarm)
    val pending   = pendingFor(alarmId, intent)
    val showIntent = PendingIntent.getActivity(
      ctx, alarmId.hashCode(),
      Intent(ctx, MainLauncher::class.java),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    getAlarmMgr().setAlarmClock(
      AlarmManager.AlarmClockInfo(fireAtMs, showIntent),
      pending,
    )

    persistAlarm(alarmId, alarm)
  }

  private fun cancel(alarmId: String) {
    val pending = pendingFor(alarmId, buildAlarmIntent(alarmId, null))
    getAlarmMgr().cancel(pending)
    removePersistedAlarm(alarmId)
  }

  private fun cancelAll() {
    val stored = readStoredAlarms()
    stored.keys().forEach { id -> cancel(id) }
  }

  private fun rearmAll(alarms: List<Map<String, Any?>>) {
    alarms.forEach { schedule(it) }
  }

  // ── Intent + PendingIntent helpers ─────────────────────────────────────

  private fun buildAlarmIntent(alarmId: String, alarm: Map<String, Any?>?): Intent {
    return Intent(ctx, AlarmReceiver::class.java).apply {
      action = "ai.showup.alarm.FIRE"
      data = Uri.parse("showup-alarm://$alarmId")
      putExtra("alarmId", alarmId)
      if (alarm != null) {
        putExtra("goalId",          alarm["goalId"] as? String)
        putExtra("goalTitle",       alarm["goalTitle"] as? String ?: "")
        putExtra("callType",        alarm["callType"] as? String ?: "morning")
        putExtra("promptBlueprint", alarm["promptBlueprint"] as? String ?: "")
      }
    }
  }

  private fun pendingFor(alarmId: String, intent: Intent): PendingIntent {
    return PendingIntent.getBroadcast(
      ctx, alarmId.hashCode(), intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  private fun getAlarmMgr(): AlarmManager =
    ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  // ── Persistence ────────────────────────────────────────────────────────

  private fun prefs(): SharedPreferences =
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun persistAlarm(alarmId: String, alarm: Map<String, Any?>) {
    val stored = readStoredAlarms()
    stored.put(alarmId, JSONObject(alarm))
    prefs().edit { putString(PREFS_KEY_ALARMS, stored.toString()) }
  }

  private fun removePersistedAlarm(alarmId: String) {
    val stored = readStoredAlarms()
    stored.remove(alarmId)
    prefs().edit { putString(PREFS_KEY_ALARMS, stored.toString()) }
  }

  private fun readStoredAlarms(): JSONObject {
    val raw = prefs().getString(PREFS_KEY_ALARMS, null) ?: return JSONObject()
    return try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
  }

  fun allStoredAlarmsAsList(): List<Map<String, Any?>> {
    val stored = readStoredAlarms()
    return stored.keys().asSequence().map { id ->
      val j = stored.getJSONObject(id)
      mapOf(
        "alarmId"          to id,
        "fireAtMs"         to j.optLong("fireAtMs"),
        "goalId"           to j.optString("goalId").takeIf { it.isNotEmpty() },
        "goalTitle"        to j.optString("goalTitle"),
        "callType"         to j.optString("callType"),
        "promptBlueprint"  to j.optString("promptBlueprint"),
      )
    }.toList()
  }

  // ── Audio Session Capture & Playback ────────────────────────────────────

  @Synchronized
  private fun startAudio(playbackSampleRate: Int) {
    stopAudio() // make sure to release first

    currentPlaybackSampleRate = playbackSampleRate

    // 1. Initialize AudioRecord (Mic) at 16kHz Mono 16-bit PCM
    try {
      val minRecBuf = AudioRecord.getMinBufferSize(
        16000,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
      )
      val recBufSize = Math.max(minRecBuf, 3200 * 2)
      
      // Attempt VoiceCommunication source first for HW echo cancellation, fallback to Mic
      var recordInstance: AudioRecord
      try {
        recordInstance = AudioRecord(
          MediaRecorder.AudioSource.VOICE_COMMUNICATION,
          16000,
          AudioFormat.CHANNEL_IN_MONO,
          AudioFormat.ENCODING_PCM_16BIT,
          recBufSize
        )
        if (recordInstance.state != AudioRecord.STATE_INITIALIZED) {
          throw Exception("VOICE_COMMUNICATION source failed to initialize")
        }
      } catch (e: Exception) {
        recordInstance = AudioRecord(
          MediaRecorder.AudioSource.MIC,
          16000,
          AudioFormat.CHANNEL_IN_MONO,
          AudioFormat.ENCODING_PCM_16BIT,
          recBufSize
        )
      }

      if (recordInstance.state != AudioRecord.STATE_INITIALIZED) {
        throw Exception("AudioRecord failed to initialize")
      }
      audioRecord = recordInstance
    } catch (e: Exception) {
      android.util.Log.e("ShowupAlarm", "Failed to init AudioRecord", e)
    }

    // 2. Initialize AudioTrack (Speaker) at dynamic sample rate, Mono, 16-bit PCM
    try {
      setupAudioTrack(playbackSampleRate)
    } catch (e: Exception) {
      android.util.Log.e("ShowupAlarm", "Failed to init AudioTrack", e)
    }

    // 3. Start recording thread
    val record = audioRecord
    if (record != null && record.state == AudioRecord.STATE_INITIALIZED) {
      isRecording = true
      recordingThread = Thread {
        val buffer = ByteArray(3200) // ~100ms chunks at 16kHz
        try {
          record.startRecording()
          while (isRecording) {
            val read = record.read(buffer, 0, buffer.size)
            if (read > 0) {
              val chunk = if (read == buffer.size) buffer else buffer.copyOf(read)
              val base64 = Base64.encodeToString(chunk, Base64.NO_WRAP)
              sendEvent(EVENT_AUDIO_CAPTURE, mapOf("data" to base64))
            }
          }
        } catch (e: Exception) {
          android.util.Log.e("ShowupAlarm", "Error in AudioRecord recording loop", e)
        }
      }
      recordingThread?.start()
    }

    // 4. Start AudioTrack playback
    try {
      audioTrack?.play()
    } catch (e: Exception) {
      android.util.Log.e("ShowupAlarm", "Failed to play AudioTrack", e)
    }
  }

  @Synchronized
  private fun setupAudioTrack(sampleRate: Int) {
    audioTrack?.apply {
      try { stop() } catch(_: Exception){}
      try { release() } catch(_: Exception){}
    }
    audioTrack = null

    val minPlayBuf = AudioTrack.getMinBufferSize(
      sampleRate,
      AudioFormat.CHANNEL_OUT_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    val playBufSize = Math.max(minPlayBuf, 4800 * 2)

    val track = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      AudioTrack.Builder()
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setAudioFormat(
          AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
        )
        .setBufferSizeInBytes(playBufSize)
        .setTransferMode(AudioTrack.MODE_STREAM)
        .build()
    } else {
      @Suppress("DEPRECATION")
      AudioTrack(
        android.media.AudioManager.STREAM_VOICE_CALL,
        sampleRate,
        AudioFormat.CHANNEL_OUT_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        playBufSize,
        AudioTrack.MODE_STREAM
      )
    }
    
    if (track.state != AudioTrack.STATE_INITIALIZED) {
      throw Exception("AudioTrack failed to initialize")
    }
    audioTrack = track
  }

  @Synchronized
  private fun stopAudio() {
    isRecording = false
    recordingThread?.interrupt()
    recordingThread = null

    audioRecord?.apply {
      try {
        if (state == AudioRecord.STATE_INITIALIZED) {
          stop()
        }
      } catch (_: Exception) {}
      try {
        release()
      } catch (_: Exception) {}
    }
    audioRecord = null

    audioTrack?.apply {
      try {
        if (state == AudioTrack.STATE_INITIALIZED) {
          stop()
        }
      } catch (_: Exception) {}
      try {
        release()
      } catch (_: Exception) {}
    }
    audioTrack = null
  }

  private fun playAudio(base64: String, sampleRate: Int) {
    playbackExecutor.submit {
      try {
        val data = Base64.decode(base64, Base64.DEFAULT)
        synchronized(this) {
          if (audioTrack == null || currentPlaybackSampleRate != sampleRate) {
            setupAudioTrack(sampleRate)
            currentPlaybackSampleRate = sampleRate
            audioTrack?.play()
          }
          audioTrack?.write(data, 0, data.size)
        }
      } catch (e: Exception) {
        android.util.Log.e("ShowupAlarm", "Failed playing audio chunk", e)
      }
    }
  }
}
