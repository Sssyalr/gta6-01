// SOLMAR HEAT — the gta6-01 entrypoint (Node 22, standard library only).
// The game lives in this directory's game/ folder: plain static files that a
// desktop browser loads offline — game/index.html plus its ES modules, with
// three.js vendored under game/vendor/ and no network request at runtime.
// Running this file hands the game in: it copies game/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there,
// the summary the judge reads, using the vendored make.fun library.
// Play it locally with `node serve.ts` (http://localhost:8080).
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(rootDir, 'game');
const shotsDir = join(rootDir, 'screenshots');

// Mirror the game and its screenshots into the output directory.
mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's caps, as the kit's gate states them: the dossier text is capped
// at 160 KiB; at most 4 screenshots of 256 KiB each; game/ holds at most 993
// files and 48 MiB in all, with no path over 1000 bytes. game/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json.
const dossierOptions = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, dossierOptions));
