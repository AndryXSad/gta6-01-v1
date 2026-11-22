// Solmar HUD — health bar, cash, wanted stars, city clock, objective text and
// toasts, plus a 2D top-down minimap (roads, sea, player, police, traffic and
// the mission marker). All DOM nodes already exist in index.html.
import { WORLD } from './config.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  return {
    healthFill: $('health-fill'),
    healthText: $('health-text'),
    cash: $('cash'),
    stars: $('stars'),
    clock: $('clock'),
    objective: $('objective'),
    brief: $('brief'),
    banner: $('banner'),
    toast: $('toast'),
    minimap: $('minimap'),
    menu: $('menu'),
    menuSummary: $('menu-summary'),
    help: $('help'),
    toastTimer: 0,
  };
}

export function showToast(hud, text, seconds = 3) {
  hud.toast.textContent = text;
  hud.toast.style.opacity = '1';
  hud.toastTimer = seconds;
}

export function showBanner(hud, text, seconds = 3.2) {
  hud.banner.textContent = text;
  hud.banner.style.opacity = '1';
  setTimeout(() => {
    hud.banner.style.opacity = '0';
  }, seconds * 1000);
}

export function updateHud(hud, dt, state) {
  // state: {health, maxHealth, cash, wanted, clockMin, objective, brief, banner}
  const hp = Math.max(0, Math.round(state.health));
  hud.healthFill.style.width = `${(hp / state.maxHealth) * 100}%`;
  hud.healthFill.style.background = hp > 50 ? '#43aa5b' : hp > 25 ? '#e0a458' : '#e63946';
  hud.healthText.textContent = `${hp}`;
  hud.cash.textContent = `$${Math.floor(state.cash)}`;
  hud.stars.textContent = '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted);
  hud.stars.style.color = state.wanted > 0 ? '#ffd60a' : '#888';
  const hh = String(Math.floor(state.clockMin / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(state.clockMin % 60)).padStart(2, '0');
  hud.clock.textContent = `${hh}:${mm}`;
  hud.objective.textContent = state.objective;
  hud.brief.textContent = state.brief;
  if (hud.toastTimer > 0) {
    hud.toastTimer -= dt;
    if (hud.toastTimer <= 0) hud.toast.style.opacity = '0';
  }
}

export function drawMinimap(hud, world) {
  // world: {playerX, playerZ, heading, inCar, target, police: [{x,z}], traffic: [{x,z}], peds: [{x,z}]}
  const c = hud.minimap;
  if (!c) return;
  const g = c.getContext('2d');
  const W = c.width;
  const H = c.height;
  const half = WORLD.size / 2;
  const toMap = (x, z) => [((x + half) / WORLD.size) * W, ((z + half) / WORLD.size) * H];
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#274d33';
  g.fillRect(0, 0, W, H);
  // sea
  const [, seaY] = toMap(0, WORLD.waterAt);
  g.fillStyle = '#2a6f9e';
  g.fillRect(0, 0, W, seaY);
  // sand
  g.fillStyle = '#d9c28a';
  const [, sandY] = toMap(0, WORLD.beachAt);
  g.fillRect(0, seaY, W, sandY - seaY);
  // roads
  g.strokeStyle = '#55595e';
  g.lineWidth = 3;
  for (let x = -207; x <= 207; x += WORLD.roadGap) {
    const [mx] = toMap(x, 0);
    g.beginPath();
    g.moveTo(mx, 0);
    g.lineTo(mx, H);
    g.stroke();
  }
  for (let z = -207; z <= 207; z += WORLD.roadGap) {
    const [, mz] = toMap(0, z);
    g.beginPath();
    g.moveTo(0, mz);
    g.lineTo(W, mz);
    g.stroke();
  }
  // ring highway
  g.strokeStyle = '#777';
  g.lineWidth = 2;
  g.beginPath();
  const [ccx, ccy] = toMap(0, 0);
  g.arc(ccx, ccy, (WORLD.highwayRadius / WORLD.size) * W, 0, Math.PI * 2);
  g.stroke();
  // mission target
  if (world.target) {
    const [tx, ty] = toMap(world.target[0], world.target[1]);
    g.fillStyle = '#ffd60a';
    g.beginPath();
    g.arc(tx, ty, 5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.lineWidth = 1.5;
    g.stroke();
  }
  // traffic dots
  g.fillStyle = '#cfd3d6';
  for (const t of world.traffic || []) {
    const [tx, ty] = toMap(t.x, t.z);
    g.fillRect(tx - 1, ty - 1, 2, 2);
  }
  // police
  g.fillStyle = '#3a86ff';
  for (const p of world.police || []) {
    const [px, py] = toMap(p.x, p.z);
    g.beginPath();
    g.arc(px, py, 3, 0, Math.PI * 2);
    g.fill();
  }
  // player arrow (rotates with heading)
  const [px, py] = toMap(world.playerX, world.playerZ);
  g.save();
  g.translate(px, py);
  g.rotate(Math.atan2(Math.sin(world.heading), Math.cos(world.heading)) * -1 + Math.PI);
  g.fillStyle = world.inCar ? '#e63946' : '#ffffff';
  g.beginPath();
  g.moveTo(0, -7);
  g.lineTo(5, 6);
  g.lineTo(-5, 6);
  g.closePath();
  g.fill();
  g.restore();
}
