// HUD: every DOM readout — health, cash, stars, clock, objective, speed,
// banner, toast and the live minimap. The game writes state in; this file
// only turns it into pixels and text.

import { CFG } from './config.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'), health: $('healthfill'), money: $('money'),
    objective: $('objective'), clock: $('clock'), stars: $('stars'),
    banner: $('banner'), speed: $('speed'), toast: $('toast'),
    minimap: $('minimap'),
  };
  const mm = els.minimap.getContext('2d');
  let bannerUntil = 0;
  let toastUntil = 0;

  function show() { els.hud.classList.add('on'); }
  function hide() { els.hud.classList.remove('on'); }

  function showBanner(text, seconds = 5) {
    els.banner.textContent = text;
    els.banner.classList.add('show');
    bannerUntil = performance.now() / 1000 + seconds;
  }
  function showToast(text, seconds = 3) {
    els.toast.textContent = text;
    els.toast.classList.add('show');
    toastUntil = performance.now() / 1000 + seconds;
  }

  function drawMinimap(world) {
    const S = 190;
    const scale = S / (CFG.worldHalf * 2 + 40);
    const toMap = (x, z) => [(x + CFG.worldHalf + 20) * scale, (z + CFG.worldHalf + 20) * scale];
    mm.fillStyle = '#10182a';
    mm.fillRect(0, 0, S, S);
    // water and sand
    mm.fillStyle = '#2e7fb8';
    mm.fillRect(...toMap(CFG.waterEast, -CFG.worldHalf), S - toMap(CFG.waterEast, 0)[0], S);
    mm.fillRect(0, toMap(0, CFG.waterSouth)[1], S, S);
    mm.fillStyle = '#d9c08a';
    mm.fillRect(0, toMap(0, CFG.beachSouth)[1], S, toMap(0, CFG.waterSouth)[1] - toMap(0, CFG.beachSouth)[1]);
    mm.fillStyle = '#8d8f96';
    mm.fillRect(toMap(CFG.dockEast, 0)[0], 0, toMap(CFG.waterEast, 0)[0] - toMap(CFG.dockEast, 0)[0], S);
    // roads
    mm.strokeStyle = '#3a3f4a';
    mm.lineWidth = 5;
    for (const c of CFG.roadCenters) {
      const [x1] = toMap(c, 0);
      mm.beginPath(); mm.moveTo(x1, 0); mm.lineTo(x1, S); mm.stroke();
      const [, y1] = toMap(0, c);
      mm.beginPath(); mm.moveTo(0, y1); mm.lineTo(S, y1); mm.stroke();
    }
    const dot = (x, z, color, r = 3) => {
      const [mx, mz] = toMap(x, z);
      mm.fillStyle = color;
      mm.beginPath(); mm.arc(mx, mz, r, 0, Math.PI * 2); mm.fill();
    };
    for (const c of world.trafficCars) dot(c.pos.x, c.pos.z, '#8a94a6', 2);
    for (const p of world.policeCars) dot(p.pos.x, p.pos.z, '#3b82f6', 3);
    if (world.missionTarget) {
      const pulse = 3 + Math.sin(performance.now() / 300) * 1.5;
      dot(world.missionTarget.x, world.missionTarget.z, '#ffd23e', pulse);
    }
    // player arrow, rotated to the heading
    const [px, pz] = toMap(world.playerX, world.playerZ);
    mm.save();
    mm.translate(px, pz);
    mm.rotate(Math.PI - world.playerHeading); // map north is up, heading 0 is south
    mm.fillStyle = '#ffffff';
    mm.beginPath();
    mm.moveTo(0, -6); mm.lineTo(4.5, 5); mm.lineTo(-4.5, 5); mm.closePath(); mm.fill();
    mm.restore();
  }

  function update(view, time) {
    const now = performance.now() / 1000;
    if (now > bannerUntil) els.banner.classList.remove('show');
    if (now > toastUntil) els.toast.classList.remove('show');
    els.health.style.width = `${Math.max(0, Math.min(100, view.health))}%`;
    els.health.style.background = view.health > 50
      ? 'linear-gradient(90deg,#37d67a,#9be15d)'
      : view.health > 25 ? 'linear-gradient(90deg,#e8a13a,#ffd23e)' : 'linear-gradient(90deg,#d63a3a,#ff7a5d)';
    els.money.textContent = `$${Math.floor(view.money).toLocaleString('en-US')}`;
    const hh = String(Math.floor(view.clockMinutes / 60) % 24).padStart(2, '0');
    const mi = String(Math.floor(view.clockMinutes % 60)).padStart(2, '0');
    els.clock.textContent = `${hh}:${mi}`;
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < view.stars ? '★' : '<span class="off">★</span>';
    els.stars.innerHTML = stars;
    els.objective.innerHTML = view.objectiveHtml;
    if (view.driving) {
      els.speed.style.display = 'block';
      els.speed.querySelector('b').textContent = String(Math.round(view.speedKmh));
    } else {
      els.speed.style.display = 'none';
    }
    drawMinimap(view.minimap);
  }

  return { show, hide, showBanner, showToast, update };
}
