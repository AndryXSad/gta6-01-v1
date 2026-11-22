// Solmar entrypoint (gta6-01): hands the game in for grading.
//
// What it does, in plain terms: it takes the game/ folder and the
// screenshots/ folder that sit next to this file, copies both into the
// output directory, and writes dossier.json there — the summary the judge
// reads — using the vendored make.fun library in vendor/makefun-game.ts.
//
// Outside the grader's container the output directory is /output. When
// MAKEFUN_OUTPUT_DIR is set (local runs, CI), that path is used instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program only uses the Node standard library, and it never touches
// the network. It refuses to hand in a broken entry: game/index.html has
// to exist, and there has to be at least one screenshot.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

// Guard rails of my own: never hand in an entry without its game or
// without a single screenshot — a silent empty dossier helps nobody.
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing — nothing to hand in');
}
const shotFiles = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f))
  : [];
if (shotFiles.length === 0) {
  throw new Error('screenshots/ holds no PNG or JPEG — take the screenshots first');
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the rest refuse an entry the scorer would refuse — more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or
// 48 MiB of game files in all; a path under game/ over 1000 bytes. game/
// counts beside /output's own 1000-entry cap, its screenshots/ and
// dossier.json, so the caps below leave that room.
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

// A one-line receipt on stdout so a local run can confirm what was handed in.
console.log(`solmar: handed in ${shotFiles.length} screenshot(s) + game/ -> ${out}`);
