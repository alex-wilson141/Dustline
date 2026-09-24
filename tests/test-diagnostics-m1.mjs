// F3 diagnostics must be purely observational: identical gameplay with the overlay off or on.
// Optional: DUSTLINE_BASELINE_GAME=<path to an earlier game.js> also compares against that build.
import assert from 'node:assert/strict';
import {createGame, projectRoot} from './sprint-harness.mjs';

const {diagnostics} = await import(new URL('dist/diagnostics.js', projectRoot));
const results = [];
async function check(name, fn) { await fn(); results.push(name); }

// Scripted run over the real map: sprint, turns, wall contact, fire, aim, reload, jump, crouch, slow and stalled frames.
async function trace(options) {
  const g = await createGame(options);
  g.prepare({clearLane: false, classId: 'assault'});
  g.player.set(0, 0, 55);
  const out = [];
  // Fixed clock: the harness default starts from real performance.now(), which varies float rounding between runs.
  let clock = 0; g.frame(0); g.step = seconds => g.frame(clock += seconds * 1000);
  const snap = () => { const s = g.state(); out.push([g.player.x, g.player.y, g.player.z, g.camera.position.x, g.camera.position.y, g.camera.position.z, g.camera.fov, s.yaw, s.pitch, g.gun.position.x, g.gun.position.y, g.gun.position.z, g.weapon.ammo, g.weapon.reserve, g.weapon.reloadRemaining, s.running, s.aim, s.crouch, s.jumpY, s.walk]); };
  const run = (seconds, fps) => { for (let i = 0; i < Math.round(seconds * fps); i++) { g.step(1 / fps); snap(); } };
  g.press('KeyW'); g.press('ShiftLeft');
  run(4, 60); g.set({yaw: .7}); run(2, 24); g.step(.4); snap(); g.step(.25); snap();
  g.set({trigger: true}); run(1, 60); g.set({trigger: false}); run(1, 30);
  g.press('KeyF'); g.release('KeyF'); run(.6, 60); g.press('KeyF'); g.release('KeyF');
  g.press('KeyR'); g.release('KeyR'); run(3, 45);
  g.press('Space'); g.release('Space'); run(1, 120);
  g.press('KeyA'); run(1, 60); g.release('KeyA'); g.set({yaw: -1.2}); run(3, 60);
  g.press('KeyC'); g.release('KeyC'); run(1, 60); g.press('KeyC'); g.release('KeyC'); run(1, 15);
  g.release('ShiftLeft'); g.release('KeyW'); run(1, 60);
  return out;
}

await check('diagnostics are off by default and record nothing while off', async () => {
  assert.equal(diagnostics.enabled, false);
  const g = await createGame();
  g.prepare();g.press('KeyW');g.press('ShiftLeft');g.simulate(2, 60);
  assert.equal(diagnostics.history().length, 0);
  assert.equal(g.elements.has('diagnostics'), false);
});

const off = await trace();
await check('gameplay trace is identical with the overlay off and on', async () => {
  diagnostics.setEnabled(true);
  const on = await trace();
  diagnostics.setEnabled(false);
  assert.equal(on.length, off.length);
  assert.deepEqual(on, off);
});

await check('overlay records substeps, cap discard, FOV, render scale and sprint gate; K dump is saved', async () => {
  diagnostics.setEnabled(true);
  const g = await createGame();
  g.prepare();g.press('KeyW');g.press('ShiftLeft');g.simulate(1, 60);g.step(.4);g.set({aim: true});g.step(1 / 60);
  const h = diagnostics.history();
  diagnostics.setEnabled(false);
  const slow = h.find(s => s.frameMs > 399);
  assert.equal(slow.substeps, 15); assert.equal(slow.discardedMs, 150); assert.equal(slow.simulatedMs, 250);
  const normal = h.filter(s => s.state === 'playing' && s.frameMs < 17 && s.running)[30];
  assert.equal(normal.substeps, 1); assert.equal(normal.discardedMs, 0); assert.equal(normal.targetSpeed, 6.1); assert(normal.measuredSpeed > 5.9 && normal.measuredSpeed < 6.3);
  assert.equal(h.at(-1).gate, 'aim'); assert.equal(h.at(-1).running, false);
  assert(h.every(s => Number.isFinite(s.fov) && Number.isFinite(s.renderScale)));
  assert(diagnostics.events().some(e => e.text.startsWith('cap discarded 150')));
  assert(diagnostics.events().some(e => e.text === 'sprint off (aim)'));
  assert(diagnostics.summary().length >= 1 && diagnostics.csv().split('\n').length === h.length + 1);
  const {log, table} = console; console.log = console.table = () => {};
  try { diagnostics.dump(); } finally { Object.assign(console, {log, table}); }
  assert.equal(diagnostics.saved().csv, diagnostics.csv()); assert.equal(diagnostics.saved().summary.length, diagnostics.summary().length);
});

if (process.env.DUSTLINE_BASELINE_GAME) await check('gameplay trace is identical to the baseline game.js', async () => {
  const base = await trace({sourcePath: new URL(process.env.DUSTLINE_BASELINE_GAME, 'file://' + process.cwd() + '/')});
  assert.deepEqual(off, base);
});

console.log(JSON.stringify({passed: results.length, checks: results, framesCompared: off.length,
  limitations: ['Headless production-code execution with mocked DOM/WebGL/transport; the overlay text rendering, real F3 key handling and browser frame pacing are not exercised here.']}, null, 2));
