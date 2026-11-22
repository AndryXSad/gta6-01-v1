// SOLMAR — a gta6-01 entry (Node 22, standard library only).
//
// The game itself is plain static files in game/: index.html plus ES
// modules plus a vendored three.js build, loaded offline with no network
// at all. This program is only the hand-in plumbing: it copies game/ and
// screenshots/ from beside this file into the output directory and writes
// dossier.json there, the summary the judge reads, using the vendored
// make.fun library.
//
// Local run (MAKEFUN_OUTPUT_DIR stands in for /output outside the grader):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it locally first with `node serve.ts`, then http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Caps from the scorer's own gates (reference/gate.json): text_max_bytes is
// the only one that shapes bytes; the rest refuse an entry the scorer would
// refuse anyway — more than 4 screenshots or one over 256 KiB, more than
// 993 files in game/ or 48 MiB of game files in all, or a path under game/
// over 1000 bytes. (game/ counts beside /output's own 1000-entry cap, its
// screenshots/ folder and dossier.json.)
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
