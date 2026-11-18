// Procedural Web Audio only: engine hum, sirens, gunshots, punches, pickups, UI clicks.
export class SoundEngine {
  constructor() { this.ctx = null; this.engineOsc = null; this.engineGain = null; this.sirenOn = false; this.sirenOsc = null; this.muted = false; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch { this.ctx = null; }
  }
  setEngine(speed01, driving) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(driving ? 0.045 + speed01 * 0.05 : 0.0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.08);
  }
  blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime, len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(this.ctx.destination); s.start(t);
  }
  shot() { this.noise(0.14, 0.35, 2500); this.blip(180, 0.08, 'square', 0.15, 60); }
  punch() { this.noise(0.09, 0.25, 500); }
  crash() { this.noise(0.3, 0.4, 700); }
  pickup() { this.blip(880, 0.09, 'sine', 0.16); setTimeout(() => this.blip(1320, 0.14, 'sine', 0.16), 80); }
  cash() { [660, 880, 1100].forEach((f, i) => setTimeout(() => this.blip(f, 0.12, 'sine', 0.16), i * 90)); }
  click() { this.blip(700, 0.05, 'square', 0.08); }
  missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'triangle', 0.18), i * 120)); }
  fail() { this.blip(220, 0.5, 'sawtooth', 0.15, 110); }
  setSiren(on) {
    if (!this.ctx || on === this.sirenOn) return;
    this.sirenOn = on;
    if (!on) { if (this.sirenOsc) { try { this.sirenOsc.stop(); } catch {} this.sirenOsc = null; } return; }
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; g.gain.value = 0.035;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.7;
    const lg = this.ctx.createGain(); lg.gain.value = 320;
    lfo.connect(lg); lg.connect(o.frequency); o.frequency.value = 750;
    o.connect(g); g.connect(this.ctx.destination); o.start(); lfo.start();
    this.sirenOsc = o; this.sirenOscLfo = lfo;
  }
}
