import ExpoModulesCore
import CallKit
import PushKit
import UIKit
import AVFoundation

public class ShowupAlarmModule: Module, CXProviderDelegate, PKPushRegistryDelegate {
  private var provider: CXProvider?
  private var voipRegistry: PKPushRegistry?
  private var currentCallUUID: UUID?
  private var activePayload: [String: Any]?
  private var voipToken: String?

  private var audioEngine: AVAudioEngine?
  private var inputNodeTapInstalled = false
  private var playerNode: AVAudioPlayerNode?
  private var currentPlaybackSampleRate: Double = 24000.0

  public func definition() -> ModuleDefinition {
    Name("ShowupAlarm")

    // Events emitted to JS
    Events("onAlarmFired", "onVoipTokenReceived", "onCallAnswered", "onCallEnded", "onAudioCapture")

    OnCreate {
      self.setupCallKit()
    }

    // Return the manufacturer (Apple for iOS)
    Function("getDeviceManufacturer") { () -> String in
      return "Apple"
    }

    // Dummy method so TS signatures align on both platforms
    AsyncFunction("canScheduleExactAlarms") { () -> Bool in
      return true
    }

    // Register CallKit & PushKit configurations
    AsyncFunction("requestCallKitPermissions") { () -> Bool in
      DispatchQueue.main.async {
        self.setupPushKit()
      }
      return true
    }

    // For diagnostics & testing CallKit sheet on Simulator / Device
    AsyncFunction("simulateIncomingCall") { (title: String) -> Void in
      let uuid = UUID()
      self.currentCallUUID = uuid
      self.activePayload = [
        "alarmId": "simulated-\(uuid.uuidString)",
        "goalId": "simulated-goal-id",
        "goalTitle": title,
        "callType": "morning",
        "promptBlueprint": "SIMULATED_PROMPT_BLUEPRINT"
      ]
      
      let update = CXCallUpdate()
      update.remoteHandle = CXHandle(type: .generic, value: "Showup Coach")
      update.localizedCallerName = "Showup Coach"
      update.hasVideo = false
      update.supportsHolding = false
      update.supportsGrouping = false
      update.supportsUngrouping = false
      
      self.provider?.reportNewIncomingCall(with: uuid, update: update) { error in
        if let error = error {
          print("[ShowupAlarm] Simulator CallKit error: \(error.localizedDescription)")
        }
      }
    }

    // Clean up all pending alerts
    AsyncFunction("cancelAllAlarms") { () -> Void in
      if let uuid = self.currentCallUUID {
        let endAction = CXEndCallAction(call: uuid)
        let transaction = CXTransaction(action: endAction)
        CXCallController().request(transaction) { error in
          if let error = error {
            print("[ShowupAlarm] cancelAllAlarms error: \(error.localizedDescription)")
          }
        }
      }
    }

    // Native iOS dummy methods to align with Android AlarmManager API signatures
    AsyncFunction("scheduleAlarm") { (alarm: [String: Any]) -> Void in }
    AsyncFunction("cancelAlarm") { (alarmId: String) -> Void in }
    AsyncFunction("rearmAllAlarms") { (alarms: [[String: Any]]) -> Void in }
    AsyncFunction("listPendingAlarms") { () -> [String] in return [] }
    AsyncFunction("openOemAutostartSettings") { () -> Bool in return false }

    AsyncFunction("startAudioSession") { (playbackSampleRate: Double) -> Void in
      self.startAudio(playbackSampleRate: playbackSampleRate)
    }

    AsyncFunction("stopAudioSession") { () -> Void in
      self.stopAudio()
    }

    AsyncFunction("playAudioChunk") { (base64: String, sampleRate: Double) -> Void in
      self.playAudio(base64: base64, sampleRate: sampleRate)
    }
  }

  // MARK: - CallKit Setup
  private func setupCallKit() {
    let configuration = CXProviderConfiguration(localizedName: "Showup")
    configuration.supportsVideo = false
    configuration.maximumCallGroups = 1
    configuration.maximumCallsPerCallGroup = 1
    configuration.supportedHandleTypes = [.generic]
    
    // Check if custom ringtone is bundled
    if let _ = Bundle.main.url(forResource: "showup_ringtone", withExtension: "caf") {
      configuration.ringtoneSound = "showup_ringtone.caf"
    }

    self.provider = CXProvider(configuration: configuration)
    self.provider?.setDelegate(self, queue: nil)
  }

  // MARK: - CallKit Provider Delegate
  public func providerDidReset(_ provider: CXProvider) {
    self.currentCallUUID = nil
    self.activePayload = nil
  }

  public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    print("[ShowupAlarm] Call answered by user.")
    action.fulfill()
    
    // Emit call answered event and trigger alarm fired logic in JS
    if let payload = self.activePayload {
      self.sendEvent("onAlarmFired", [
        "alarmId": payload["alarmId"] as? String ?? "",
        "goalId": payload["goalId"] as? String ?? "",
        "goalTitle": payload["goalTitle"] as? String ?? "Workout Goal",
        "callType": payload["callType"] as? String ?? "morning",
        "promptBlueprint": payload["promptBlueprint"] as? String ?? ""
      ])
    }
    
    self.sendEvent("onCallAnswered", [
      "uuid": action.callUUID.uuidString
    ])
  }

  public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    print("[ShowupAlarm] Call ended by user.")
    action.fulfill()
    self.sendEvent("onCallEnded", [
      "uuid": action.callUUID.uuidString
    ])
    self.currentCallUUID = nil
    self.activePayload = nil
  }

  // MARK: - PushKit Setup
  private func setupPushKit() {
    self.voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
    self.voipRegistry?.delegate = self
    self.voipRegistry?.desiredPushTypes = [.voIP]
  }

  // MARK: - PushKit Delegate
  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    let tokenParts = pushCredentials.token.map { data in String(format: "%02.2hhx", data) }
    let tokenString = tokenParts.joined()
    self.voipToken = tokenString
    print("[ShowupAlarm] VoIP Push Token registered: \(tokenString)")
    self.sendEvent("onVoipTokenReceived", [
      "token": tokenString
    ])
  }

  public func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    print("[ShowupAlarm] Incoming VoIP push payload received.")
    let dict = payload.dictionaryPayload
    
    // VoIP payloads put metadata inside custom parameters
    guard let customData = dict["aps"] as? [String: Any],
          let alarmData = customData["alert"] as? [String: Any] else {
      completion()
      return
    }

    let uuid = UUID()
    self.currentCallUUID = uuid
    self.activePayload = [
      "alarmId": alarmData["alarmId"] as? String ?? uuid.uuidString,
      "goalId": alarmData["goalId"] as? String ?? "",
      "goalTitle": alarmData["goalTitle"] as? String ?? "Coaching Sync",
      "callType": alarmData["callType"] as? String ?? "morning",
      "promptBlueprint": alarmData["promptBlueprint"] as? String ?? ""
    ]

    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: "Showup Coach")
    update.localizedCallerName = "Showup Coach"
    update.hasVideo = false
    update.supportsHolding = false
    update.supportsGrouping = false
    update.supportsUngrouping = false

    self.provider?.reportNewIncomingCall(with: uuid, update: update) { error in
      if let error = error {
        print("[ShowupAlarm] CallKit report error: \(error.localizedDescription)")
      }
      completion()
    }
  }

  public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    self.voipToken = nil
  }

  // MARK: - Audio Session Capture & Playback

  private func startAudio(playbackSampleRate: Double) {
    self.stopAudio() // clean up any existing engine session first

    let audioSession = AVAudioSession.sharedInstance()
    do {
      try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
      try audioSession.setActive(true)
    } catch {
      print("[ShowupAlarm] Failed to set AVAudioSession category: \(error.localizedDescription)")
    }

    let engine = AVAudioEngine()
    let player = AVAudioPlayerNode()
    engine.attach(player)

    self.audioEngine = engine
    self.playerNode = player
    self.currentPlaybackSampleRate = playbackSampleRate

    // 1. Setup Input Tap (Mic Capture)
    let inputNode = engine.inputNode
    let inputFormat = inputNode.outputFormat(forBus: 0)
    let recordFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: false)!
    
    guard let converter = AVAudioConverter(from: inputFormat, to: recordFormat) else {
      print("[ShowupAlarm] Failed to create AVAudioConverter")
      return
    }

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, time in
      guard let self = self else { return }
      let ratio = recordFormat.sampleRate / inputFormat.sampleRate
      let capacity = AVAudioFrameCount(Double(buffer.frameCapacity) * ratio)
      guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: recordFormat, frameCapacity: capacity) else { return }
      
      let inputBlock: AVAudioConverterInputBlock = { inNumPackets, outStatus in
        outStatus.pointee = .haveData
        return buffer
      }
      
      var error: NSError?
      let status = converter.convert(to: outputBuffer, error: &error, withInputFrom: inputBlock)
      if status == .error {
        print("[ShowupAlarm] Convert error: \(String(describing: error))")
      } else if let channelData = outputBuffer.int16ChannelData {
        let frameLength = Int(outputBuffer.frameLength)
        let pointer = channelData.pointee
        let bufferPointer = UnsafeBufferPointer(start: pointer, count: frameLength)
        let data = Data(buffer: bufferPointer)
        let base64 = data.base64EncodedString()
        self.sendEvent("onAudioCapture", ["data": base64])
      }
    }
    self.inputNodeTapInstalled = true

    // 2. Connect player and start engine
    let playbackFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: playbackSampleRate, channels: 1, interleaved: false)!
    engine.connect(player, to: engine.mainMixerNode, format: playbackFormat)

    do {
      try engine.start()
      player.play()
    } catch {
      print("[ShowupAlarm] Failed to start AVAudioEngine: \(error.localizedDescription)")
    }
  }

  private func setupAudioPlayer(sampleRate: Double) {
    guard let engine = self.audioEngine, let player = self.playerNode else { return }
    
    player.stop()
    engine.disconnectNodeInput(player)
    engine.disconnectNodeOutput(player)
    
    let playbackFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: false)!
    engine.connect(player, to: engine.mainMixerNode, format: playbackFormat)
    
    player.play()
  }

  private func stopAudio() {
    if let engine = self.audioEngine {
      if self.inputNodeTapInstalled {
        engine.inputNode.removeTap(onBus: 0)
        self.inputNodeTapInstalled = false
      }
      self.playerNode?.stop()
      engine.stop()
    }
    self.audioEngine = nil
    self.playerNode = nil

    do {
      try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      print("[ShowupAlarm] Failed to deactivate AVAudioSession: \(error.localizedDescription)")
    }
  }

  private func playAudio(base64: String, sampleRate: Double) {
    guard let player = self.playerNode, let engine = self.audioEngine, engine.isRunning else { return }
    guard let data = Data(base64Encoded: base64) else { return }

    if self.currentPlaybackSampleRate != sampleRate {
      self.setupAudioPlayer(sampleRate: sampleRate)
      self.currentPlaybackSampleRate = sampleRate
    }

    let pcmFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: false)!
    let frameCount = AVAudioFrameCount(data.count / MemoryLayout<Int16>.size)
    guard let buffer = AVAudioPCMBuffer(pcmFormat: pcmFormat, frameCapacity: frameCount) else { return }
    buffer.frameLength = frameCount

    if let channelData = buffer.int16ChannelData {
      data.withUnsafeBytes { rawBufferPointer in
        if let rawPointer = rawBufferPointer.baseAddress {
          channelData.pointee.assign(from: rawPointer.assumingMemoryBound(to: Int16.self), count: Int(frameCount))
        }
      }
    }

    player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
  }
}
