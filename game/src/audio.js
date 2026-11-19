// Suara tersintesis WebAudio — tanpa file eksternal. Semua efek dibuat dari
// osilator & noise buffer saat runtime. AudioContext dibuat pas gestur pertama.
let ctx = null, engineOsc = null, engineGain = null, sirenTimer = null, sirenOn = false;

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(ctx.destination);
    engineOsc.start();
  } catch (e) { ctx = null; }
}

export function engineSound(speed01, driving) {
  if (!ctx || !engineOsc) return;
  const t = ctx.currentTime;
  engineGain.gain.setTargetAtTime(driving ? 0.03 + speed01 * 0.05 : 0, t, 0.1);
  engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, t, 0.08);
}

function blip(freq, dur, type, vol, slideTo) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur);
}

function noiseBurst(dur, vol, freq) {
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 900;
  const g = ctx.createGain(); g.gain.value = vol || 0.2;
  src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
}

export const sfx = {
  punch() { noiseBurst(0.12, 0.25, 500); blip(120, 0.1, 'square', 0.1, 60); },
  pickup() { blip(660, 0.12, 'sine', 0.14, 990); },
  cash() { blip(880, 0.1, 'triangle', 0.14); setTimeout(() => blip(1320, 0.14, 'triangle', 0.14), 90); },
  mission() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.15), i * 110)); },
  shot() { noiseBurst(0.09, 0.3, 2400); },
  hurt() { blip(180, 0.18, 'sawtooth', 0.16, 90); },
  steal() { blip(300, 0.15, 'square', 0.1, 520); },
  busted() { blip(220, 0.5, 'sawtooth', 0.18, 110); },
  door() { noiseBurst(0.08, 0.15, 700); },
};

// Sirene dua nada (polisi) — interval bergantian 660/880 Hz.
export function setSiren(on) {
  if (on === sirenOn) return;
  sirenOn = on;
  if (on && ctx) {
    let hi = false;
    sirenTimer = setInterval(() => { hi = !hi; blip(hi ? 880 : 660, 0.42, 'sine', 0.05); }, 430);
  } else if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
}
