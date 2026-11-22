// Solmar entrypoint (Node 22, standard library only). The game is the plain
// static folder game/ beside this file: a three.js open-world game a desktop
// browser loads offline, no build step and no network request. This program
// hands it in: it copies game/ and screenshots/ into the output directory
// and writes dossier.json there, the summary the judge reads, using the
// vendored make.fun library. Run it locally with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

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

// The scorer's own caps (from the kit's reference/gate.json): text_max_bytes is
// the only one that shapes the bytes; the rest refuse an entry the scorer
// would refuse — more than 4 screenshots or one over 256 KiB, more than 993
// files in game/ or 48 MiB of game files in all, or a path under game/ over
// 1000 bytes long.
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
