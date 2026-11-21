// HUD Solmar: health/armor/uangan/bintang wanted/jam kota/objektif/toast,
// plus minimap canvas 2D top-down (jalan, laut, pemain, polisi, traffic,
// penanda misi). Semua DOM sudah ada di index.html.
import { CFG } from './config.js';

export function createHud(doc) {
  const $ = (id) => doc.getElementById(id);
  const el = {
    health: $('hud-health'), healthBar: $('hud-health-bar'),
    armor: $('hud-armor'), money: $('hud-money'),
    stars: $('hud-stars'), clock: $('hud-clock'),
    objective: $('hud-objective'), dialog: $('hud-dialog'),
    toast: $('hud-toast'), speed: $('hud-speed'),
    prompt: $('hud-prompt'), menu: $('menu'), minimap: $('minimap'),
  };
  const ctx = el.minimap ? el.minimap.getContext('2d') : null;

  function starString(n) {
    let s = '';
    for (let i = 0; i < CFG.wantedMax; i++) s += i < n ? '★' : '☆';
    return s;
  }

  function clockString(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return {
    el,

    showMenu(show) {
      if (el.menu) el.menu.style.display = show ? 'flex' : 'none';
    },

    setPrompt(text) {
      if (el.prompt) el.prompt.textContent = text || '';
    },

    update(state) {
      const { player, police, missions, minutes, speedKmh, driving } = state;
      if (el.health) el.health.textContent = `HP ${Math.ceil(player.health)}`;
      if (el.healthBar) el.healthBar.style.width = `${player.health}%`;
      if (el.armor) el.armor.textContent = player.armor > 0 ? `Armor ${Math.ceil(player.armor)}` : '';
      if (el.money) el.money.textContent = `$${player.money}`;
      if (el.stars) {
        el.stars.textContent = starString(police.stars);
        el.stars.style.color = police.stars > 0 ? '#ffd23e' : '#ffffff';
      }
      if (el.clock) el.clock.textContent = clockString(minutes);
      if (el.objective) el.objective.textContent = missions.objectiveText();
      if (el.dialog) el.dialog.textContent = missions.dialogText();
      if (el.toast) {
        el.toast.textContent = missions.toastTimer > 0 ? missions.toast : '';
        el.toast.style.opacity = missions.toastTimer > 0 ? '1' : '0';
      }
      if (el.speed) {
        el.speed.textContent = driving ? `${Math.round(speedKmh)} km/h` : '';
      }
      if (ctx && el.minimap) drawMinimap(ctx, state);
    },
  };

  function drawMinimap(c, state) {
    const { player, police, missions, traffic, vehicles } = state;
    const W = 150, H = 150;
    const half = CFG.worldHalf;
    const toMap = (x, z) => [((x + half) / (half * 2)) * W, ((z + half) / (half * 2)) * H];
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#20242c';
    c.fillRect(0, 0, W, H);
    // Laut di selatan.
    c.fillStyle = '#2f7fb8';
    c.fillRect(0, H * 0.93, W, H * 0.07);
    // Jalan grid.
    c.strokeStyle = '#5a5f6a';
    c.lineWidth = 3;
    for (const x of CFG.gridXs) {
      const [mx] = toMap(x, 0);
      c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx, H); c.stroke();
    }
    for (const z of CFG.gridZs) {
      const [, mz] = toMap(0, z);
      c.beginPath(); c.moveTo(0, mz); c.lineTo(W, mz); c.stroke();
    }
    // Penanda misi (kuning berdenyut).
    const cur = missions.current();
    if (cur) {
      const [mx, mz] = toMap(cur.target.x, cur.target.z);
      c.fillStyle = '#f5d76e';
      c.beginPath(); c.arc(mx, mz, 5 + Math.sin(Date.now() * 0.006) * 1.5, 0, Math.PI * 2); c.fill();
    }
    // Traffic (abu-abu), mobil parkir (putih kecil).
    c.fillStyle = '#9aa0aa';
    for (const t of traffic.cars) {
      const [mx, mz] = toMap(t.pos.x, t.pos.z);
      c.fillRect(mx - 1.5, mz - 1.5, 3, 3);
    }
    // Polisi (biru/merah).
    for (const p of police.patrols) {
      const [mx, mz] = toMap(p.pos.x, p.pos.z);
      c.fillStyle = '#ff4444';
      c.beginPath(); c.arc(mx, mz, 3.5, 0, Math.PI * 2); c.fill();
    }
    for (const o of police.officers) {
      const [mx, mz] = toMap(o.pos.x, o.pos.z);
      c.fillStyle = '#4488ff';
      c.fillRect(mx - 2, mz - 2, 4, 4);
    }
    // Pemain (panah hijau menghadap heading).
    const [px, py] = toMap(player.pos.x, player.pos.z);
    c.save();
    c.translate(px, py);
    c.rotate(Math.atan2(Math.sin(player.heading), Math.cos(player.heading)) + Math.PI);
    c.fillStyle = '#2ecc71';
    c.beginPath(); c.moveTo(0, -6); c.lineTo(4.5, 5); c.lineTo(-4.5, 5); c.closePath(); c.fill();
    c.restore();
    // Bingkai.
    c.strokeStyle = '#f5d76e';
    c.lineWidth = 2;
    c.strokeRect(1, 1, W - 2, H - 2);
  }
}
