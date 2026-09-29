// An earlier build, taken whole from its commit and run on this machine, to compare the present game with. A record
// stored from one machine cannot be relied on to match on another to the last digit (sines and cosines may differ
// between machines and Node versions), so the suites compare with what the old build does here and now.
// The old build's dist/ is unpacked into a temporary folder beside a copy of the present test harness (which loads
// older builds: its exports are guarded); the folder is removed when the process ends.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.join(here, '..'), made = new Map();
export async function oldBuild(commit) {
  if (made.has(commit)) return made.get(commit);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dustline-${commit}-`));
  process.on('exit', () => fs.rmSync(dir, {recursive: true, force: true}));
  execSync(`git archive ${commit} dist | tar -x -C "${dir}"`, {cwd: repo, stdio: ['ignore', 'ignore', 'pipe']});
  fs.mkdirSync(path.join(dir, 'tests'));
  for (const f of ['sprint-harness.mjs']) fs.copyFileSync(path.join(here, f), path.join(dir, 'tests', f));
  const harness = await import(pathToFileURL(path.join(dir, 'tests', 'sprint-harness.mjs')));
  const build = {commit, dir, createGame: harness.createGame, module: name => import(pathToFileURL(path.join(dir, 'dist', name)))};
  made.set(commit, build); return build;
}

// ---- The Build 09 trace of Story and Skirmish (commit 6560f7a): 200 s of the real enemy AI, the player invulnerable,
// walking forward for 18 s and then standing, sampled every 2 s. The same scenario the suites run on the present game.
export const BUILD09 = '6560f7a';
const enemies = g => g.actors.filter(a => a.team === 'enemy');
export function aiTrace(g, seconds = 200) {
  const rows = []; let clock = 0; g.frame(0); g.press('KeyW');
  for (let i = 0; i < seconds * 60; i++) {
    if (i === 18 * 60) g.release('KeyW');
    g.frame(clock += 1000 / 60);
    if (i % 120 === 119) rows.push({t: Math.round((i + 1) / 60), p: [+g.player.x.toFixed(3), +g.player.z.toFixed(3)], kills: g.kills(), stage: g.getStage(),
      e: enemies(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.ai?.role ?? null, a.crouch ? 1 : 0, a.gone ? 1 : 0]),
      a: g.actors.filter(a => a.team === 'ally' && !a.remote).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp])});
  }
  return rows;
}
let trace;
// What Build 09 does on this machine, in the shape of the stored record, and whether the stored record (made on the
// developer's Mac, tests/fixtures/story-skirmish-ai-b09.json) says the same: that is reported, never required.
export async function build09Trace() {
  if (trace) return trace;
  const old = await oldBuild(BUILD09), out = {recordedFrom: `Build 09 (${BUILD09}), run on this machine`};
  for (const mode of ['story', 'skirmish']) { const g = await old.createGame(); g.prepare({clearLane: false}); g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate;
    out[mode] = {rows: aiTrace(g), solids: g.solids.length, occluders: g.occluders.length}; }
  const stored = JSON.parse(fs.readFileSync(path.join(here, 'fixtures', 'story-skirmish-ai-b09.json'), 'utf8'));
  out.storedRecordAgrees = ['story', 'skirmish'].every(m => JSON.stringify(stored[m].rows) === JSON.stringify(out[m].rows) && stored[m].solids === out[m].solids && stored[m].occluders === out[m].occluders);
  return trace = out;
}
