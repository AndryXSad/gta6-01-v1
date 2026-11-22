// Story missions: four jobs for Madame Kestrel, in order. Each mission has
// a target on the map (a glowing beacon), a briefing, and a reward. The
// manager only tracks state — main.js moves the player and the world.

import { MISSIONS } from './config.js';

export function createMissions(scene, onEvent) {
  // the beacon: a pulsing column of light plus a floating marker
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xffd23e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 60, 18, 1, true), beaconMat);
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.4),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  beacon.visible = false;
  marker.visible = false;
  scene.add(beacon, marker);

  const state = {
    index: 0, // which mission is current; == MISSIONS.length means story done
    phase: 'to-target', // 'to-target' | 'to-dropoff' | 'done'
    checkpoint: 0,
    timeLeft: 0,
    active: false,
    friendBoarded: false,
  };

  function current() {
    return state.index < MISSIONS.length ? MISSIONS[state.index] : null;
  }

  function targetNow() {
    const m = current();
    if (!m) return null;
    if (state.phase === 'to-dropoff' && m.dropoff) return { ...m.dropoff, label: m.dropoffLabel };
    if (m.checkpoints) {
      const cp = m.checkpoints[state.checkpoint];
      return cp ? { ...cp } : null;
    }
    return { ...m.target, label: m.targetLabel };
  }

  function start() {
    const m = current();
    if (!m) return;
    state.active = true;
    state.phase = 'to-target';
    state.checkpoint = 0;
    state.timeLeft = m.timer ?? 0;
    state.friendBoarded = false;
    onEvent({ type: 'brief', mission: m });
  }

  function complete() {
    const m = current();
    state.index += 1;
    state.active = false;
    beacon.visible = false;
    marker.visible = false;
    onEvent({ type: 'complete', mission: m });
    const next = current();
    if (next) start();
    else onEvent({ type: 'story-done' });
  }

  // Called every frame with the player's position and whether they are in
  // a car. Returns nothing; progress is reported through onEvent.
  function update(dt, pos, inCar, time) {
    const m = current();
    if (!m || !state.active) {
      beacon.visible = false;
      marker.visible = false;
      return;
    }
    if (m.timer) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        onEvent({ type: 'failed', mission: m, reason: 'time' });
        start(); // the job restarts — Kestrel does not accept excuses
        return;
      }
    }
    const t = targetNow();
    if (!t) return;
    beacon.position.set(t.x, 30, t.z);
    marker.position.set(t.x, 7 + Math.sin(time * 2.2) * 0.8, t.z);
    marker.rotation.y = time * 1.4;
    beacon.visible = true;
    marker.visible = true;
    beaconMat.opacity = 0.22 + Math.sin(time * 3) * 0.08;

    const dist = Math.hypot(pos.x - t.x, pos.z - t.z);
    if (dist > t.r) return;

    // arrived — what happens next depends on the job
    if (m.pickup && state.phase === 'to-target') {
      if (!inCar) {
        onEvent({ type: 'need-car', mission: m });
        return;
      }
      state.phase = 'to-dropoff';
      state.friendBoarded = true;
      onEvent({ type: 'picked-up', mission: m });
      return;
    }
    if (m.checkpoints) {
      state.checkpoint += 1;
      onEvent({ type: 'checkpoint', mission: m, at: state.checkpoint, of: m.checkpoints.length });
      if (state.checkpoint >= m.checkpoints.length) complete();
      return;
    }
    if (m.needCar && !inCar) {
      onEvent({ type: 'need-car', mission: m });
      return;
    }
    complete();
  }

  function resetTo(index) {
    state.index = Math.max(0, Math.min(index, MISSIONS.length));
    state.active = false;
    state.phase = 'to-target';
    state.checkpoint = 0;
    state.friendBoarded = false;
    beacon.visible = false;
    marker.visible = false;
  }

  // Live view: the numbers main.js reads (timer, progress) are getters so
  // they always reflect the current state, not a copy from creation time.
  const api = { current, targetNow, start, complete, update, resetTo, list: MISSIONS };
  Object.defineProperties(api, {
    index: { get: () => state.index },
    phase: { get: () => state.phase },
    checkpoint: { get: () => state.checkpoint },
    timeLeft: { get: () => state.timeLeft },
    active: { get: () => state.active },
    friendBoarded: { get: () => state.friendBoarded },
  });
  return api;
}
