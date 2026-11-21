# SOLMAR — Open-World Crime

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/AndryXSad/gta6-01-v1/reward.svg)](https://make.fun/bounty/gta6-01)

**SOLMAR** adalah game open-world crime 3D (three.js, low-poly) yang dibuat untuk
kompetisi make.fun **gta6-01 "Make GTA 6"**. Kota pesisir orisinal yang disinari
matahari — bukan tiruan kota, nama, karakter, atau aset game komersial apa pun.

## Cerita

Rio, kurir pelabuhan, berutang besar pada Madame Kestrel, fixer yang menguasai
dermaga Solmar. Empat pekerjaan, satu jalan keluar: antar paket ke pelabuhan,
curi mobil dan bawa ke garasi Ombak, jemput Sari di boulevard pantai, lalu
getaway terakhir lewat highway utara — sambil polisi Solmar mengejar.

## Yang ada di dalam game

- **Kota Solmar** — grid jalan pusat kota, pelabuhan dengan kontainer & crane,
  pantai + laut, highway lingkar, alun-alun, lampu jalan, palem.
- **Jalan kaki + mobil** — WASD, lari (Shift), kamera third-person (drag mouse).
- **Mobil bisa dicuri** — tekan E di dekat mobil parkir/NPC; mencuri menaikkan wanted.
- **Traffic & pejalan kaki** — mobil mengikuti loop jalan, pejalan kaki kabur
  saat ketakutan.
- **Wanted level 1–5 + polisi** — patroli mengejar & menabrak, petugas jalan kaki
  mengejar & menangkap, polisi menembak di bintang ≥3. Bintang turun bila lolos.
- **4 misi berurutan + cerita** — beacon penanda, dialog Kestrel, hadiah uang.
- **Combat** — pukul jarak dekat (Space/F) saat jalan kaki.
- **HUD + minimap** — health, armor, uang, bintang wanted, kecepatan, objektif
  misi, jam kota, minimap canvas 2D (jalan, pemain, polisi, penanda misi).
- **Start screen + save** — Continue / New Game, progres tersimpan di localStorage.
- **Suara tersintesis WebAudio** — mesin, sirene, pukulan, tembakan, pickup.
  Tanpa file eksternal, tanpa network sama sekali.

## Main

```sh
node serve.ts   # lalu buka http://localhost:8080
```

Kontrol: WASD jalan/mengemudi, mouse drag putar kamera, Shift lari,
E masuk/keluar mobil, Space pukul / rem tangan, Esc/P jeda.
Progres (misi, uang, HP, posisi) tersimpan otomatis di localStorage.

## Struktur source

- `game/index.html` — canvas + HUD DOM
- `game/src/main.js` — loop game & state machine
- `game/src/city.js` — bangun kota Solmar
- `game/src/player.js` — jalan kaki, kamera, combat
- `game/src/vehicles.js` — mobil, masuk/keluar, mencuri, mengemudi
- `game/src/traffic.js` — traffic & pejalan kaki
- `game/src/police.js` — wanted level & pengejaran
- `game/src/missions.js` — misi & cerita
- `game/src/hud.js` — HUD + minimap
- `game/src/audio.js` — suara WebAudio tersintesis
- `game/src/save.js` — save/load localStorage
- `game/src/shots.js` — mode screenshot deterministik (`?shot=...&seed=1`)
- `game/src/config.js`, `game/src/random.js` — konstanta + RNG seed

## Lisensi

MIT — lihat [LICENSE](LICENSE).
