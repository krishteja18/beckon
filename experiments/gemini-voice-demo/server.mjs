import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import { buildShowupPrompt } from './prompts.mjs';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'models/gemini-3.1-flash-live-preview';
const PORT = Number(process.env.PORT) || 3000;
const INTENSITY = process.env.INTENSITY || 'firm';
const CALL_TYPE = process.env.CALL_TYPE || 'morning';

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY — copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(express.static('public'));
app.get('/config', (_req, res) =>
  res.json({ model: MODEL, intensity: INTENSITY, callType: CALL_TYPE }),
);

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_PROMPT = buildShowupPrompt({ intensity: INTENSITY, callType: CALL_TYPE });
console.log(`[prompt] intensity=${INTENSITY} callType=${CALL_TYPE}`);

wss.on('connection', async (clientWs) => {
  console.log('[client] connected');
  let session;

  const sendToClient = (payload) => {
    if (clientWs.readyState === clientWs.OPEN) clientWs.send(JSON.stringify(payload));
  };

  try {
    session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          languageCode: 'te-IN',
        },
        systemInstruction: SYSTEM_PROMPT,
      },
      callbacks: {
        onopen: () => {
          console.log('[gemini] session open');
          sendToClient({ type: 'ready', model: MODEL });
        },
        onmessage: (msg) => {
          const parts = msg.serverContent?.modelTurn?.parts ?? [];
          for (const part of parts) {
            const inline = part.inlineData;
            if (inline?.data && inline.mimeType?.startsWith('audio/')) {
              sendToClient({ type: 'audio', data: inline.data, mimeType: inline.mimeType });
            }
            if (part.text) {
              sendToClient({ type: 'text', text: part.text });
            }
          }
          if (msg.serverContent?.interrupted) {
            sendToClient({ type: 'interrupted' });
          }
          if (msg.serverContent?.turnComplete) {
            sendToClient({ type: 'turn_complete' });
          }
        },
        onerror: (err) => {
          console.error('[gemini] error', err);
          sendToClient({ type: 'error', message: err?.message || String(err) });
        },
        onclose: (event) => {
          console.log('[gemini] session closed', event?.reason || '');
          sendToClient({ type: 'closed', reason: event?.reason || '' });
          if (clientWs.readyState === clientWs.OPEN) clientWs.close();
        },
      },
    });
  } catch (err) {
    console.error('[gemini] failed to open session', err);
    sendToClient({ type: 'error', message: err?.message || String(err) });
    clientWs.close();
    return;
  }

  clientWs.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'audio') {
        session.sendRealtimeInput({
          audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
        });
      } else if (msg.type === 'text') {
        session.sendClientContent({
          turns: [{ role: 'user', parts: [{ text: msg.text }] }],
          turnComplete: true,
        });
      }
    } catch (err) {
      console.error('[client] message handling error', err);
    }
  });

  clientWs.on('close', () => {
    console.log('[client] disconnected');
    try { session?.close(); } catch {}
  });
});

httpServer.listen(PORT, () => {
  console.log(`gemini-voice-demo listening on http://localhost:${PORT}`);
  console.log(`model: ${MODEL}`);
});
