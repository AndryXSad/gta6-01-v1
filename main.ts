// SOLMAR — entri open-world crime untuk gta6-01 (Node 22, standard library only).
// Game-nya file statis di game/ (index.html + modul ES + three.js yang di-vendor,
// tanpa network). Program ini menyalin game/ dan screenshots/ dari samping file
// ini ke /output lalu menulis /output/dossier.json — ringkasan yang dibaca juri —
// dengan library make.fun yang di-vendor. Di luar container grader,
// MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Mainkan lokal dengan `node serve.ts`, lalu buka http://localhost:8080.
//
// Ditulis ulang untuk rebuild terekam 21 Nov 2026: isi fungsional sama dengan
// starter (salin + dossier), penamaan & komentar ditulis sendiri di sesi ini.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Direktori repo ini (tempat main.ts berada) dan direktori output grader.
const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Game + screenshot disalin apa adanya; dossier dibangun dari hasil salinan
// supaya isinya persis sama dengan yang dinilai.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Batas gate (lihat kit RULES.txt): teks dossier max 160 KiB, max 4 screenshot
// @ 256 KiB, game/ max 993 entri & 48 MiB, path max 1000 byte.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
