// Solmar sound — everything synthesised with WebAudio (oscillators + a noise
// buffer), no audio files. The context is created lazily on the first user
// gesture (browser autoplay rules); every method is a safe no-op before that,
// so shot mode and headless runs never crash on sound.
let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    return true;
  } catch (e) {
    return false;
  }
}

export const audio = {
  unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  },

  blip(freq = 660, dur = 0.09, type = 'square', vol = 0.5) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur);
  },

  pickup() {
    this.blip(880, 0.1, 'sine', 0.6);
    setTimeout(() => this.blip(1318, 0.14, 'sine', 0.5), 70);
  },

  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.55), i * 95));
  },

  punch() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const len = 0.12;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.7;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  },

  gunshot() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const len = 0.09;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t);
  },

  engineStart() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 320;
    engineOsc.connect(f);
    f.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  },

  engine(speed01, on) {
    if (!engineOsc) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0.0, t, 0.12);
    engineOsc.frequency.setTargetAtTime(52 + speed01 * 110, t, 0.1);
  },

  engineStop() {
    if (!engineOsc) return;
    try {
      engineOsc.stop();
    } catch (e) {}
    engineOsc = null;
    engineGain = null;
  },

  sirenStart() {
    if (!ensure() || sirenTimer) return;
    let high = false;
    sirenTimer = setInterval(() => {
      high = !high;
      this.blip(high ? 960 : 720, 0.34, 'sine', 0.16);
    }, 360);
  },

  sirenStop() {
    if (sirenTimer) {
      clearInterval(sirenTimer);
      sirenTimer = null;
    }
  },
};
