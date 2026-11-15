// WebAudio synthesis: every sound is built from oscillators and noise
// buffers at play time. There are no audio files and no network loads.
// A tiny step sequencer loops a minor-key bassline whose tempo and
// brightness rise with the wave number.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.silent = false;
    this.musicTimer = 0;
    this.step = 0;
    this.intensity = 0;
  }

  ensure() {
    if (this.silent) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setSilent(value) {
    this.silent = value;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime);
    }
    return this.muted;
  }

  tone(freq, dur, type = "sine", vol = 0.2, slideTo = null, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, vol = 0.2, freq = 1200, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  shoot() { this.tone(880, 0.07, "square", 0.06, 320); }
  hit() { this.noise(0.05, 0.08, 2400); this.tone(320, 0.05, "triangle", 0.07, 180); }
  explosion() { this.noise(0.28, 0.22, 700); this.tone(140, 0.25, "sine", 0.2, 45); }
  playerHurt() { this.tone(220, 0.18, "sawtooth", 0.16, 90); this.noise(0.12, 0.1, 900); }
  emberHurt() { this.tone(520, 0.2, "triangle", 0.16, 240); this.tone(392, 0.22, "triangle", 0.12, 196, 0.05); }
  pickup() { this.tone(980, 0.08, "sine", 0.1, 1420); }
  dash() { this.noise(0.14, 0.1, 1800); this.tone(300, 0.12, "sine", 0.06, 720); }
  upgrade() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.14, "triangle", 0.11, null, i * 0.07)); }
  bossRoar() { this.tone(82, 0.7, "sawtooth", 0.24, 55); this.tone(110, 0.6, "square", 0.12, 70, 0.08); this.noise(0.5, 0.12, 500); }
  victory() { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, "triangle", 0.13, null, i * 0.11)); }
  gameOver() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.34, "triangle", 0.14, null, i * 0.16)); }

  updateMusic(dt, wave, active) {
    if (this.silent || !active) return;
    this.intensity = Math.min(1, wave / 10);
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    const stepDur = 0.21 - this.intensity * 0.05;
    this.musicTimer = stepDur;
    if (!this.ctx || this.muted) return;
    const scale = [110, 130.8, 164.8, 196, 164.8, 130.8, 98, 130.8];
    const note = scale[this.step % scale.length];
    const bright = this.intensity > 0.45 && this.step % 2 === 0;
    this.tone(note, stepDur * 1.4, "triangle", 0.055);
    if (bright) this.tone(note * 2, stepDur * 0.8, "sine", 0.028);
    if (this.step % 4 === 0) this.noise(0.03, 0.02, 5000);
    this.step += 1;
  }
}
