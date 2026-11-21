// Suara Solmar: semua tersintesis WebAudio (oscillator + noise), tanpa
// file eksternal. AudioContext dibuat lazily saat interaksi pertama
// (aturan autoplay browser) — aman dipanggil sebelum itu.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOn = false;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function beep(freq, dur, type = 'sine', vol = 0.12, slideTo = 0) {
    const c = ensure();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, vol = 0.15, freq = 800) {
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  }

  return {
    unlock() { ensure(); },
    pickup() { beep(660, 0.12, 'sine', 0.14); setTimeout(() => beep(880, 0.16, 'sine', 0.14), 90); },
    missionDone() { [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.16), i * 130)); },
    punch() { noiseBurst(0.09, 0.2, 500); },
    gunshot() { noiseBurst(0.12, 0.22, 2400); beep(160, 0.1, 'square', 0.1, 60); },
    steal() { beep(220, 0.18, 'sawtooth', 0.1, 440); },
    crash() { noiseBurst(0.25, 0.25, 300); },
    busted() { beep(440, 0.4, 'sawtooth', 0.14, 110); },

    engine(speedNorm) {
      const c = ensure();
      if (!c) return;
      if (!engineOsc) {
        engineOsc = c.createOscillator();
        engineGain = c.createGain();
        engineOsc.type = 'sawtooth';
        engineGain.gain.value = 0;
        engineOsc.connect(engineGain).connect(c.destination);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speedNorm * 165;
      engineGain.gain.value = speedNorm > 0.02 ? 0.045 + speedNorm * 0.05 : 0;
    },

    // Sirene naik-turun dua nada saat wanted ≥1.
    siren(dt, wanted) {
      const c = ensure();
      if (!c) return;
      if (wanted <= 0) {
        if (sirenGain) sirenGain.gain.value = 0;
        sirenOn = false;
        return;
      }
      if (!sirenOsc) {
        sirenOsc = c.createOscillator();
        sirenGain = c.createGain();
        sirenOsc.type = 'sine';
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain).connect(c.destination);
        sirenOsc.start();
      }
      sirenTimer += dt;
      const twoTone = Math.sin(sirenTimer * 2.4) > 0 ? 720 : 540;
      sirenOsc.frequency.value = twoTone;
      sirenGain.gain.value = 0.028;
      sirenOn = true;
    },
  };
}
