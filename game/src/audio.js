// Sound, synthesised: no audio files, no network — a handful of WebAudio
// oscillators and a noise buffer stand in for an engine, sirens, pickups,
// punches, gunfire and a mission jingle. Everything is guarded so calling
// it before the first user gesture (or in screenshot mode) is a no-op.

export function createAudio() {
  const sys = {
    ctx: null,
    master: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    muted: false,
    sirenHigh: false,
    sirenAt: 0,
  };

  function ensure() {
    if (sys.ctx || sys.muted) return false;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      sys.ctx = new Ctx();
      sys.master = sys.ctx.createGain();
      sys.master.gain.value = 0.5;
      sys.master.connect(sys.ctx.destination);
      sys.engineOsc = sys.ctx.createOscillator();
      sys.engineOsc.type = 'sawtooth';
      sys.engineOsc.frequency.value = 55;
      sys.engineGain = sys.ctx.createGain();
      sys.engineGain.gain.value = 0;
      const lp = sys.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 500;
      sys.engineOsc.connect(lp); lp.connect(sys.engineGain); sys.engineGain.connect(sys.master);
      sys.engineOsc.start();
      sys.sirenOsc = sys.ctx.createOscillator();
      sys.sirenOsc.type = 'square';
      sys.sirenOsc.frequency.value = 700;
      sys.sirenGain = sys.ctx.createGain();
      sys.sirenGain.gain.value = 0;
      sys.sirenOsc.connect(sys.sirenGain); sys.sirenGain.connect(sys.master);
      sys.sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur = 0.12, type = 'sine', vol = 0.25) {
    if (!ensure()) return;
    const t = sys.ctx.currentTime;
    const o = sys.ctx.createOscillator();
    const g = sys.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sys.master);
    o.start(t); o.stop(t + dur);
  }

  function noiseBurst(dur = 0.18, vol = 0.4) {
    if (!ensure()) return;
    const t = sys.ctx.currentTime;
    const len = Math.floor(sys.ctx.sampleRate * dur);
    const buf = sys.ctx.createBuffer(1, len, sys.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = sys.ctx.createBufferSource();
    src.buffer = buf;
    const g = sys.ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(sys.master);
    src.start(t);
  }

  function update(driving, speed01, wanted, time) {
    if (!sys.ctx) return;
    if (sys.muted) {
      sys.engineGain.gain.value = 0;
      sys.sirenGain.gain.value = 0;
      return;
    }
    if (driving) {
      sys.engineOsc.frequency.value = 55 + speed01 * 160;
      sys.engineGain.gain.value = 0.045 + speed01 * 0.05;
    } else {
      sys.engineGain.gain.value = 0;
    }
    if (wanted > 0) {
      if (time - sys.sirenAt > 0.45) {
        sys.sirenAt = time;
        sys.sirenHigh = !sys.sirenHigh;
        sys.sirenOsc.frequency.value = sys.sirenHigh ? 950 : 700;
      }
      sys.sirenGain.gain.value = 0.022;
    } else {
      sys.sirenGain.gain.value = 0;
    }
  }

  function setMuted(m) {
    sys.muted = m;
    if (sys.ctx) {
      sys.master.gain.value = m ? 0 : 0.5;
    }
  }

  return {
    ensure,
    update,
    setMuted,
    pickup: () => { blip(880, 0.1); setTimeout(() => blip(1318, 0.16), 90); },
    punch: () => noiseBurst(0.09, 0.3),
    gunshot: () => noiseBurst(0.16, 0.35),
    jingle: () => { blip(523, 0.14); setTimeout(() => blip(659, 0.14), 130); setTimeout(() => blip(784, 0.22), 260); },
    fail: () => { blip(220, 0.25, 'sawtooth', 0.2); setTimeout(() => blip(165, 0.35, 'sawtooth', 0.2), 200); },
  };
}
