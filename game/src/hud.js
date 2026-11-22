// HUD: health, cash, wanted stars, speed, mission objective, dialog, city
// clock, toast messages and the live top-down minimap. All DOM, drawn over
// the 3D canvas; the title screen, pause and busted overlays live here too.
import { CLOCK, FONT, MISSIONS, WORLD } from './config.js';

function el(tag, id, parent, text) {
  const node = document.createElement(tag);
  if (id) node.id = id;
  if (text !== undefined) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

export function createHud() {
  const root = document.getElementById('hud');
  const topLeft = el('div', 'hud-topleft', root);
  el('div', 'hud-health-label', topLeft, 'RIO');
  const healthBar = el('div', 'hud-health-bar', topLeft);
  const healthFill = el('div', 'hud-health-fill', healthBar);
  const cash = el('div', 'hud-cash', topLeft, '$0');
  const stars = el('div', 'hud-stars', root, '☆☆☆☆☆');
  const objective = el('div', 'hud-objective', root);
  const dialog = el('div', 'hud-dialog', root);
  const toast = el('div', 'hud-toast', root);
  const speed = el('div', 'hud-speed', root, '');
  const clock = el('div', 'hud-clock', root, '09:00');
  const mapWrap = el('div', 'hud-map-wrap', root);
  const map = document.createElement('canvas');
  map.id = 'hud-map';
  map.width = 176;
  map.height = 176;
  mapWrap.appendChild(map);
  const mapLabel = el('div', 'hud-map-label', mapWrap, 'SOLMAR');
  const menu = el('div', 'menu', root);
  el('h1', null, menu, 'SOLMAR');
  el('p', 'menu-sub', menu, 'Kota pesisir. Empat misi. Satu utang yang harus lunas.');
  el('p', 'menu-story', menu, 'Rio, kurir pelabuhan, berutang pada fixer Madame Kestrel. Antar paketnya, curi mobilnya, jemput rekannya — dan kabur sebelum polisi menutup kota.');
  const btnContinue = el('button', 'btn-continue', menu, 'Continue');
  const btnNew = el('button', 'btn-new', menu, 'New Game');
  el('p', 'menu-controls', menu, 'WASD gerak · Shift lari · drag mouse putar kamera · E masuk/keluar mobil · klik / F pukul · Space rem tangan · P jeda');
  const paused = el('div', 'hud-paused', root, 'JEDA — tekan P untuk lanjut');
  paused.style.display = 'none';
  const busted = el('div', 'hud-busted', root);
  el('h2', null, busted, 'TERTANGKAP');
  el('p', null, busted, 'Polisi membawamu ke kantor pos. Denda $100 — tapi Rio bebas lagi.');
  const btnRetry = el('button', 'btn-retry', busted, 'Main lagi');
  busted.style.display = 'none';
  const done = el('div', 'hud-done', root);
  el('h2', null, done, 'UTANG LUNAS');
  el('p', null, done, 'Empat misi selesai. Solmar milikmu sekarang, Rio.');
  const btnAgain = el('button', 'btn-again', done, 'Main bebas');
  done.style.display = 'none';
  return {
    root, healthFill, cash, stars, objective, dialog, toast, speed, clock,
    map, mapCtx: map.getContext('2d'), menu, btnContinue, btnNew,
    paused, busted, btnRetry, done, btnAgain,
  };
}

export function updateHud(hud, state) {
  hud.healthFill.style.width = `${Math.max(0, Math.min(100, state.health))}%`;
  hud.healthFill.style.background = state.health > 50 ? '#37b24d' : state.health > 25 ? '#f2c94c' : '#e5534b';
  hud.cash.textContent = `$${state.money}`;
  let starText = '';
  for (let i = 0; i < 5; i += 1) starText += i < state.wanted ? '★' : '☆';
  hud.stars.textContent = starText;
  hud.stars.style.color = state.wanted > 0 ? '#ffd43b' : '#cfd6dd';
  const mission = state.missionIndex < MISSIONS.length ? MISSIONS[state.missionIndex] : null;
  hud.objective.textContent = mission ? `MISI ${mission.id}: ${mission.text}` : 'Semua misi selesai — jelajahi Solmar!';
  hud.dialog.textContent = state.dialog || '';
  hud.toast.textContent = state.toast || '';
  hud.toast.style.opacity = state.toast ? '1' : '0';
  hud.speed.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
  const totalMinutes = CLOCK.startHour * 60 + Math.floor(state.elapsed * CLOCK.minutesPerSecond);
  const hh = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');
  hud.clock.textContent = `${hh}:${mm}`;
}

// Top-down minimap: roads, water, beach, buildings, mission marker, traffic,
// police and the player arrow.
export function drawMinimap(hud, world) {
  const ctx = hud.mapCtx;
  const S = 176;
  const half = WORLD.bound + 10;
  const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
  ctx.fillStyle = '#20262e';
  ctx.fillRect(0, 0, S, S);
  // Water north, sand south.
  ctx.fillStyle = '#2e6f9e';
  let [wx, wy] = toMap(-half, WORLD.waterZ - 55);
  ctx.fillRect(0, 0, S, wy);
  ctx.fillStyle = '#dcc48f';
  [wx, wy] = toMap(-half, WORLD.beachZ - 2);
  ctx.fillRect(0, wy, S, S - wy);
  // Roads.
  ctx.strokeStyle = '#4a5058';
  ctx.lineWidth = 4;
  for (const line of WORLD.roadLines) {
    let [x1, y1] = toMap(-WORLD.half, line);
    let [x2, y2] = toMap(WORLD.half, line);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    [x1, y1] = toMap(line, -WORLD.half);
    [x2, y2] = toMap(line, WORLD.half);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Highway ring.
  ctx.strokeStyle = '#6a7078';
  ctx.lineWidth = 3;
  ctx.strokeRect(...toMap(-WORLD.highway, -WORLD.highway), (WORLD.highway * 2 / (half * 2)) * S, (WORLD.highway * 2 / (half * 2)) * S);
  // Buildings.
  ctx.fillStyle = '#31383f';
  for (const b of world.buildings) {
    const [x, y] = toMap(b.minX, b.minZ);
    const w = ((b.maxX - b.minX) / (half * 2)) * S;
    const h = ((b.maxZ - b.minZ) / (half * 2)) * S;
    ctx.fillRect(x, y, Math.max(1, w), Math.max(1, h));
  }
  // Mission marker.
  if (world.missionTarget) {
    const [x, y] = toMap(world.missionTarget.x, world.missionTarget.z);
    const pulse = 4 + Math.sin(performance.now() * 0.005) * 1.5;
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(x, y - pulse - 3); ctx.lineTo(x + pulse, y); ctx.lineTo(x, y + pulse + 3); ctx.lineTo(x - pulse, y);
    ctx.closePath(); ctx.fill();
  }
  // Traffic dots, police dots, player arrow.
  ctx.fillStyle = '#9aa0a3';
  for (const car of world.trafficCars) {
    const [x, y] = toMap(car.x, car.z);
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  ctx.fillStyle = '#ff5a4e';
  for (const p of world.policeDots) {
    const [x, y] = toMap(p.x, p.z);
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  const [px, py] = toMap(world.playerX, world.playerZ);
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(world.playerHeading);
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export { FONT };
