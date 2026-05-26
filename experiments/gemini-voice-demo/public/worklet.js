// Down-converts float32 mic samples to 16-bit PCM and posts batches to main thread.
class PCMRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.targetSamples = 1600; // 100ms @ 16kHz
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0];
    if (!ch) return true;

    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.buffer.push(s < 0 ? s * 0x8000 : s * 0x7fff);
    }

    while (this.buffer.length >= this.targetSamples) {
      const chunk = this.buffer.splice(0, this.targetSamples);
      const int16 = new Int16Array(chunk);
      this.port.postMessage(int16, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-recorder', PCMRecorder);
