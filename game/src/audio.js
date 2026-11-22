// Sound, all synthesised with WebAudio: engine hum, two-tone siren, pickup
// blips, punch thuds and gunshots. No audio files, no network. Everything
// is guarded: if the browser blocks audio, the game just stays silent.
export function createAudio() {
  const audio = { ctx: null, master: null, engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null, sirenTimer: null, sirenHigh: false };

  audio.ensure = function ensure() {
    if (audio.ctx) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audio.ctx = new Ctx();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.16;
      audio.master.connect(audio.ctx.destination);
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      audio.engineOsc.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
      audio.sirenOsc = audio.ctx.createOscillator();
      audio.sirenOsc.type = 'sine';
      audio.sirenOsc.frequency.value = 700;
      audio.sirenGain = audio.ctx.createGain();
      audio.sirenGain.gain.value = 0;
      audio.sirenOsc.connect(audio.sirenGain);
      audio.sirenGain.connect(audio.master);
      audio.sirenOsc.start();
    } catch {
      audio.ctx = null;
      return false;
    }
    return true;
  };

  audio.engine = function engine(speed01, driving) {
    if (!audio.ctx || !audio.engineOsc) return;
    const target = driving ? 0.05 + speed01 * 0.12 : 0;
    audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.08);
    audio.engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, audio.ctx.currentTime, 0.08);
  };

  audio.siren = function siren(on) {
    if (!audio.ctx || !audio.sirenOsc) return;
    if (on && !audio.sirenTimer) {
      audio.sirenGain.gain.setTargetAtTime(0.05, audio.ctx.currentTime, 0.1);
      audio.sirenTimer = window.setInterval(() => {
        audio.sirenHigh = !audio.sirenHigh;
        audio.sirenOsc.frequency.setTargetAtTime(audio.sirenHigh ? 950 : 700, audio.ctx.currentTime, 0.05);
      }, 420);
    } else if (!on && audio.sirenTimer) {
      window.clearInterval(audio.sirenTimer);
      audio.sirenTimer = null;
      audio.sirenGain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.1);
    }
  };

  audio.blip = function blip(freq) {
    if (!audio.ctx) return;
    try {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq || 660;
      gain.gain.setValueAtTime(0.25, audio.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start();
      osc.stop(audio.ctx.currentTime + 0.3);
    } catch { /* silent */ }
  };

  audio.thud = function thud() {
    if (!audio.ctx) return;
    try {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, audio.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, audio.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, audio.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audio.master);
      osc.start();
      osc.stop(audio.ctx.currentTime + 0.18);
    } catch { /* silent */ }
  };

  audio.shot = function shot() {
    if (!audio.ctx) return;
    try {
      const len = Math.floor(audio.ctx.sampleRate * 0.12);
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.3;
      src.connect(gain);
      gain.connect(audio.master);
      src.start();
    } catch { /* silent */ }
  };

  return audio;
}
