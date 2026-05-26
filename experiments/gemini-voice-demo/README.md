# Gemini Voice Demo

Local sandbox for testing Gemini Live (native-audio) bidi voice. Not part of the Showup mobile app — lives under `experiments/` for evaluation only.

## What it does

- Browser captures your mic at 16 kHz PCM and streams it over a WebSocket to a local Node server.
- Server proxies the audio into a Gemini Live session via the `@google/genai` SDK.
- Server streams Gemini's audio response back to the browser, which plays it through your speakers.
- Includes a text input fallback for testing without a mic.

The Node proxy exists so your Gemini API key stays on the server, not in the browser.

## Setup

1. Get an API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. From this folder:
   ```bash
   cp .env.example .env
   # paste your key into GEMINI_API_KEY
   npm install
   npm start
   ```
3. Open <http://localhost:3000>, click **Start talking**, allow mic, and speak.

## Model selection

Set `GEMINI_MODEL` in `.env`. Known live/native-audio model IDs (verify against [Google's model docs](https://ai.google.dev/gemini-api/docs/models) — names change):

- `models/gemini-3.1-flash-live-preview` (default — newest Flash live preview)
- `gemini-2.5-flash-preview-native-audio-dialog`
- `gemini-2.0-flash-live-001`
- Any newer Flash-family live model — paste the ID into `.env` and restart.

If you see an `INVALID_ARGUMENT` or `model not found` error in the terminal, the model ID isn't valid for your project — try a different one from AI Studio. The Live API gates models behind allowlists, so a model visible in the picker may not yet be available to your key.

## Troubleshooting

- **Empty / robotic playback** — usually a sample-rate mismatch. The server forwards the `mimeType` Gemini returns and the client respects it; if Google changes the default output rate, you may need to tweak `parseSampleRate` in `public/app.js`.
- **Mic permission denied** — Chrome blocks `getUserMedia` on non-localhost HTTP origins. Use `http://localhost:3000`, not your LAN IP.
- **"Missing GEMINI_API_KEY"** — `.env` isn't in this folder, or `dotenv` isn't loading. Run `npm start` from `experiments/gemini-voice-demo/`.
- **Latency** — first response can take 1–3 s while the session warms up; subsequent turns should be sub-second.

## Files

- `server.mjs` — Express + ws proxy that brokers a Gemini Live session per client.
- `public/app.js` — mic capture, WebSocket I/O, scheduled playback.
- `public/worklet.js` — AudioWorklet that down-converts mic float32 → int16 PCM.
- `public/index.html` / `styles.css` — minimal UI.
