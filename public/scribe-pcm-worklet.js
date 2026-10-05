/* global AudioWorkletProcessor, registerProcessor */
// Send 100 ms mono frames. Only the live session's audio graph owns this node.
class ScribePCM extends AudioWorkletProcessor {
  constructor() {
    super(); this.buffer = new Float32Array(1600); this.offset = 0;
    this.port.onmessage = event => {
      if (!event.data?.flush) return;
      if (this.offset) { const tail = this.buffer.slice(0, this.offset); this.port.postMessage(tail, [tail.buffer]); this.offset = 0; }
      this.port.postMessage(null);
    };
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      this.buffer[this.offset++] = sample;
      if (this.offset === 1600) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(1600); this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('scribe-pcm', ScribePCM);
