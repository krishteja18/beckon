const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const modelEl = document.getElementById('model');
const textForm = document.getElementById('textForm');
const textInput = document.getElementById('textInput');

let ws = null;
let micStream = null;
let captureCtx = null;
let workletNode = null;
let playbackCtx = null;
let playbackTime = 0;
const scheduledSources = new Set();

const personaEl = document.getElementById('persona');
fetch('/config').then((r) => r.json()).then((c) => {
  modelEl.textContent = `model: ${c.model}`;
  if (personaEl) personaEl.textContent = `intensity: ${c.intensity} · call type: ${c.callType}`;
}).catch(() => {});

function setStatus(s) { statusEl.textContent = s; }
function log(role, text) {
  const div = document.createElement('div');
  div.className = role;
  div.textContent = (role === 'me' ? 'you: ' : role === 'ai' ? 'ai: ' : '— ') + text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function base64ToInt16(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

function int16ToBase64(int16) {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function schedulePlayback(int16, sampleRate) {
  if (!playbackCtx) playbackCtx = new AudioContext({ sampleRate });
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  const buf = playbackCtx.createBuffer(1, float32.length, sampleRate);
  buf.copyToChannel(float32, 0);
  const src = playbackCtx.createBufferSource();
  src.buffer = buf;
  src.connect(playbackCtx.destination);
  const now = playbackCtx.currentTime;
  const startAt = Math.max(now, playbackTime);
  src.start(startAt);
  playbackTime = startAt + buf.duration;
  scheduledSources.add(src);
  src.onended = () => scheduledSources.delete(src);
}

function flushPlayback() {
  for (const src of scheduledSources) {
    try { src.onended = null; src.stop(); } catch {}
    try { src.disconnect(); } catch {}
  }
  scheduledSources.clear();
  if (playbackCtx) playbackTime = playbackCtx.currentTime;
}

function parseSampleRate(mimeType) {
  const m = /rate=(\d+)/.exec(mimeType || '');
  return m ? Number(m[1]) : 24000;
}

async function start() {
  startBtn.disabled = true;
  setStatus('requesting mic…');

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    setStatus('mic denied');
    startBtn.disabled = false;
    log('sys', 'mic permission denied: ' + err.message);
    return;
  }

  captureCtx = new AudioContext({ sampleRate: 16000 });
  await captureCtx.audioWorklet.addModule('worklet.js');
  const source = captureCtx.createMediaStreamSource(micStream);
  workletNode = new AudioWorkletNode(captureCtx, 'pcm-recorder');
  source.connect(workletNode);

  setStatus('connecting…');
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => {
    setStatus('connected — talk');
    stopBtn.disabled = false;
    workletNode.port.onmessage = (e) => {
      if (ws?.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: 'audio', data: int16ToBase64(e.data) }));
    };
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'audio') {
      const int16 = base64ToInt16(msg.data);
      schedulePlayback(int16, parseSampleRate(msg.mimeType));
    } else if (msg.type === 'text') {
      log('ai', msg.text);
    } else if (msg.type === 'interrupted') {
      flushPlayback();
      log('sys', 'interrupted');
    } else if (msg.type === 'turn_complete') {
      // could mute mic between turns; leaving open for natural barge-in
    } else if (msg.type === 'ready') {
      log('sys', `gemini ready (${msg.model})`);
    } else if (msg.type === 'error') {
      log('sys', 'error: ' + msg.message);
      setStatus('error');
    } else if (msg.type === 'closed') {
      log('sys', 'session closed ' + (msg.reason || ''));
    }
  };

  ws.onclose = () => {
    setStatus('disconnected');
    cleanup();
  };
  ws.onerror = () => {
    setStatus('ws error');
  };
}

function cleanup() {
  try { workletNode?.disconnect(); } catch {}
  try { micStream?.getTracks().forEach((t) => t.stop()); } catch {}
  try { captureCtx?.close(); } catch {}
  workletNode = null;
  micStream = null;
  captureCtx = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
}

function stop() {
  try { ws?.close(); } catch {}
  ws = null;
  cleanup();
  setStatus('idle');
}

startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);

textForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if (!text || ws?.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: 'text', text }));
  log('me', text);
  textInput.value = '';
});
