// HUD DOM + minimap canvas 2D: health, armor, uang, bintang wanted, kecepatan,
// objektif misi, jam kota, dialog cerita. Minimap top-down: jalan, pemain,
// polisi, penanda misi, pantai & pelabuhan.
import { CFG } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  return {
    health: el('hud-health'), armor: el('hud-armor'), cash: el('hud-cash'),
    stars: el('hud-stars'), speed: el('hud-speed'), objective: el('hud-objective'),
    dialog: el('hud-dialog'), clock: el('hud-clock'), prompt: el('hud-prompt'),
    minimap: el('minimap'), toast: el('hud-toast'),
    ctx: el('minimap').getContext('2d'),
  };
}

let toastTimer = null;
export function showToast(hud, text) {
  hud.toast.textContent = text;
  hud.toast.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { hud.toast.style.opacity = 0; }, 3200);
}

function drawMinimap(hud, s) {
  const c = hud.ctx, W = 190, H = 190;
  const scale = W / 420; // dunia -210..210 -> 0..190
  const px = (x) => (x + 210) * scale;
  const pz = (z) => (z + 210) * scale;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#1e3a2f'; c.fillRect(0, 0, W, H); // daratan
  c.fillStyle = '#2e86c1'; c.fillRect(px(150), 0, W - px(150), H); // laut timur
  c.fillStyle = '#5d6d7e'; c.fillRect(0, pz(120), W, H - pz(120)); // pelabuhan selatan
  c.strokeStyle = '#888'; c.lineWidth = 5;
  for (let i = -2; i <= 2; i++) {
    c.beginPath(); c.moveTo(px(i * 40), 0); c.lineTo(px(i * 40), H); c.stroke();
    c.beginPath(); c.moveTo(0, pz(i * 40)); c.lineTo(W, pz(i * 40)); c.stroke();
  }
  c.strokeStyle = '#f5d76e'; c.lineWidth = 2;
  c.beginPath(); c.arc(px(0), pz(0), 165 * scale, 0, Math.PI * 2); c.stroke(); // highway
  // Penanda misi (kuning berdenyut).
  if (s.missionTarget) {
    c.fillStyle = '#f1c40f';
    c.beginPath(); c.arc(px(s.missionTarget.x), pz(s.missionTarget.z), 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#f1c40f';
    c.beginPath(); c.arc(px(s.missionTarget.x), pz(s.missionTarget.z), 9 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2); c.stroke();
  }
  // Polisi (biru/merah).
  c.fillStyle = '#ff2222';
  for (const p of s.police) { c.beginPath(); c.arc(px(p.x), pz(p.z), 3.5, 0, Math.PI * 2); c.fill(); }
  // Pemain (panah putih searah heading).
  c.save();
  c.translate(px(s.player.x), pz(s.player.z));
  c.rotate(Math.PI - s.heading);
  c.fillStyle = '#ffffff';
  c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
  c.restore();
}

export function updateHud(hud, s) {
  hud.health.style.width = Math.max(0, s.health) + '%';
  hud.health.style.background = s.health > 40 ? '#2ecc71' : '#e74c3c';
  hud.armor.style.width = Math.max(0, s.armor) + '%';
  hud.cash.textContent = '$' + Math.floor(s.cash).toLocaleString('en-US');
  hud.stars.textContent = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
  hud.stars.style.color = s.wanted > 0 ? '#ffd700' : '#888';
  hud.speed.textContent = s.inCar ? Math.round(Math.abs(s.speedKmh)) + ' km/h' : '';
  hud.speed.style.display = s.inCar ? 'block' : 'none';
  hud.objective.textContent = s.objective || '';
  hud.clock.textContent = s.clock;
  hud.dialog.textContent = s.dialog || '';
  hud.dialog.style.display = s.dialog ? 'block' : 'none';
  hud.prompt.textContent = s.prompt || '';
  hud.prompt.style.display = s.prompt ? 'block' : 'none';
  drawMinimap(hud, s);
}
