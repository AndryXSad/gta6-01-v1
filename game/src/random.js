// RNG deterministik untuk Solmar: mulberry32 + helper kecil. Dipakai kota
// (tata gedung), traffic, dan mode screenshot agar hasil bisa diulang
// dengan seed yang sama.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ubah string pendek jadi seed angka (hash FNV-1a 32-bit).
export function hashSeed(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function pickInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pilih warna dari palet berdasarkan RNG.
export function pickColor(rng, palette) {
  return pick(rng, palette);
}
