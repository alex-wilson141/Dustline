// Observational frame/movement diagnostics (F3). Off by default: while off, game.js skips every
// call into this module, nothing is sampled or stored, and no overlay element exists.
// It only reads values the game has already computed; it never writes game state.
const HISTORY_MS = 60000, DRAW_MS = 250;
const samples = [], events = [];
let enabled = false, saved = null, panel = null, lastDraw = 0, lastPos = null, lastScale = null, lastRunning = null;
let move = {speed: 0, classSpeed: 1, running: false, gate: '', toggles: 0};

function r(v, d = 2) { return Number.isFinite(v) ? Number(v.toFixed(d)) : null; }
function trim(now) {
  let i = 0;
  while (i < samples.length && now - samples[i].t > HISTORY_MS) i++;
  if (i) samples.splice(0, i);
  let j = 0;
  while (j < events.length && now - events[j].t > HISTORY_MS) j++;
  if (j) events.splice(0, j);
}
function event(t, text) { events.push({t, text}); }

// Called from stepSimulation once per substep with the values it already computed.
function movement(m) {
  if (lastRunning !== null && m.running !== lastRunning) {
    move.toggles++;
    event(performance.now(), (m.running ? 'sprint on' : 'sprint off') + (m.gate ? ' (' + m.gate + ')' : ''));
  }
  lastRunning = m.running;
  move = {...m, toggles: move.toggles};
}

// Called from frame() once per rendered frame, after simulation and render.
function record(f) {
  const t = f.now;
  const measured = lastPos && f.rawDt > 0 ? Math.hypot(f.x - lastPos.x, f.z - lastPos.z) / f.rawDt : 0;
  lastPos = {x: f.x, z: f.z};
  if (lastScale !== null && f.renderScale !== lastScale) event(t, `render scale ${r(lastScale)} -> ${r(f.renderScale)} (game fps ${r(f.gameFps, 1)})`);
  lastScale = f.renderScale;
  const discarded = Math.max(0, f.rawDt - f.cap);
  if (discarded > 0) event(t, `cap discarded ${r(discarded * 1000, 1)} ms of a ${r(f.rawDt * 1000, 1)} ms frame`);
  samples.push({
    t, state: f.state, frameMs: r(f.rawDt * 1000, 2), fps: r(f.rawDt > 0 ? 1 / f.rawDt : 0, 1), gameFps: r(f.gameFps, 1),
    substeps: f.substeps, simulatedMs: r(f.simulated * 1000, 2), discardedMs: r(discarded * 1000, 2),
    simCpuMs: r(f.simCpuMs, 2), renderCpuMs: r(f.renderCpuMs, 2),
    quality: f.quality, renderScale: r(f.renderScale), pixelRatio: r(f.pixelRatio), canvas: f.canvas, autoCheckIn: r(f.autoCheckIn, 1),
    fov: r(f.fov, 2), running: move.running, gate: move.gate, targetSpeed: r(move.speed), classSpeed: move.classSpeed,
    multiplier: r(move.speed / 3.5, 3), measuredSpeed: r(measured), toggles: move.toggles
  });
  move.toggles = 0;
  if (samples.length % 120 === 0) trim(t);
  if (t - lastDraw >= DRAW_MS) { lastDraw = t; trim(t); draw(t); }
}

function recent(now, ms) { const out = []; for (let i = samples.length - 1; i >= 0 && now - samples[i].t <= ms; i--) out.push(samples[i]); return out; }
function draw(now) {
  if (!panel) return;
  const s = samples[samples.length - 1];
  if (!s) return;
  const last1 = recent(now, 1000), last60 = recent(now, HISTORY_MS);
  const worst = Math.max(...last1.map(x => x.frameMs)), avgFps = last1.length / Math.max(.001, (last1.reduce((a, x) => a + x.frameMs, 0) / 1000));
  const discard60 = last60.reduce((a, x) => a + x.discardedMs, 0), capped60 = last60.filter(x => x.discardedMs > 0).length;
  const toggles1 = last1.reduce((a, x) => a + x.toggles, 0);
  const measured = last1.length ? last1.reduce((a, x) => a + x.measuredSpeed, 0) / last1.length : 0;
  panel.textContent = [
    'DIAGNOSTICS  F3 hide · K dump to console',
    `FPS ${avgFps.toFixed(1)} (1s)  game avg ${s.gameFps}  auto check in ${s.quality === 'auto' ? s.autoCheckIn + 's' : 'off'}`,
    `frame ${s.frameMs} ms  worst 1s ${worst.toFixed(1)} ms`,
    `substeps ${s.substeps}  cap discarded ${s.discardedMs} ms  (60s: ${discard60.toFixed(0)} ms, ${capped60} frames)`,
    `quality ${s.quality}  render scale ${s.renderScale}  pixel ratio ${s.pixelRatio}  canvas ${s.canvas}`,
    `FOV ${s.fov}  state ${s.state}`,
    `speed target ${s.targetSpeed} m/s  x${s.multiplier} of walk  class x${s.classSpeed}`,
    `sprint ${s.running ? 'ON' : 'off'}${s.gate ? '  blocked by: ' + s.gate : ''}  toggles 1s ${toggles1}`,
    `measured ground speed ${measured.toFixed(2)} m/s (1s avg)`,
    `cpu sim ${s.simCpuMs} ms  render submit ${s.renderCpuMs} ms`,
    ...events.slice(-4).map(e => `${((e.t - now) / 1000).toFixed(1)}s  ${e.text}`)
  ].join('\n');
}

function summary() {
  const buckets = new Map();
  const t0 = samples.length ? samples[0].t : 0;
  for (const s of samples) {
    const k = Math.floor((s.t - t0) / 1000);
    const b = buckets.get(k) || {second: k, frames: 0, ms: 0, worstMs: 0, maxSubsteps: 0, discardedMs: 0, cappedFrames: 0, sprintFrames: 0, toggles: 0, speedSum: 0, fovMin: Infinity, fovMax: -Infinity, renderScale: s.renderScale, pixelRatio: s.pixelRatio, gates: new Set(), states: new Set()};
    b.frames++; b.ms += s.frameMs; b.worstMs = Math.max(b.worstMs, s.frameMs); b.maxSubsteps = Math.max(b.maxSubsteps, s.substeps);
    b.discardedMs += s.discardedMs; if (s.discardedMs > 0) b.cappedFrames++; if (s.running) b.sprintFrames++; b.toggles += s.toggles;
    b.speedSum += s.measuredSpeed; b.fovMin = Math.min(b.fovMin, s.fov); b.fovMax = Math.max(b.fovMax, s.fov);
    b.renderScale = s.renderScale; b.pixelRatio = s.pixelRatio; if (s.gate) b.gates.add(s.gate); b.states.add(s.state);
    buckets.set(k, b);
  }
  return [...buckets.values()].map(b => ({
    second: b.second, state: [...b.states].join('/'), fps: r(b.frames / Math.max(.001, b.ms / 1000), 1), worstFrameMs: r(b.worstMs, 1),
    maxSubsteps: b.maxSubsteps, discardedMs: r(b.discardedMs, 1), cappedFrames: b.cappedFrames, sprintPct: Math.round(b.sprintFrames / b.frames * 100),
    sprintToggles: b.toggles, measuredSpeed: r(b.speedSum / b.frames), fovMin: r(b.fovMin, 1), fovMax: r(b.fovMax, 1),
    renderScale: b.renderScale, pixelRatio: b.pixelRatio, sprintBlockedBy: [...b.gates].join(' ')
  }));
}
function csv() {
  if (!samples.length) return '';
  const keys = Object.keys(samples[0]);
  return [keys.join(','), ...samples.map(s => keys.map(k => String(s[k]).replace(/,/g, ';')).join(','))].join('\n');
}
// K freezes a copy so later paused frames cannot roll the sprint out of the 60 s window.
function dump() {
  const rows = summary(), log = events.map(e => `${((e.t - (samples[0]?.t ?? e.t)) / 1000).toFixed(2)}s  ${e.text}`).join('\n') || 'none';
  saved = {summary: rows, events: log, csv: csv()};
  console.log(`DUSTLINE diagnostics: ${samples.length} frames over the last ${rows.length} s (saved). Copy later with: copy(dustlineDiag.saved().csv) or copy(JSON.stringify(dustlineDiag.saved().summary))`);
  console.table(rows);
  console.log('Events (last 60 s):\n' + log);
  console.log(saved.csv);
  if (panel && enabled) panel.textContent += '\nDUMPED to console (saved)';
  return rows;
}

function setEnabled(on) {
  enabled = !!on;
  if (enabled) {
    samples.length = events.length = 0; lastPos = lastScale = lastRunning = null;
    if (!panel && typeof document !== 'undefined' && document.body) {
      panel = document.createElement('pre');
      panel.id = 'diagnostics';
      Object.assign(panel.style, {position: 'fixed', top: '8px', left: '8px', zIndex: 9999, margin: 0, padding: '8px 10px', pointerEvents: 'none', background: 'rgba(0,0,0,.72)', color: '#e8e2d0', font: '11px/1.4 ui-monospace, Menlo, monospace', whiteSpace: 'pre', borderRadius: '4px'});
      document.body.appendChild(panel);
    }
    if (panel) { panel.hidden = false; panel.textContent = 'DIAGNOSTICS  collecting…'; }
  } else if (panel) panel.hidden = true;
}

export const diagnostics = {
  get enabled() { return enabled; },
  setEnabled, toggle: () => setEnabled(!enabled), record, movement, dump, csv, summary, saved: () => saved,
  history: () => samples.slice(), events: () => events.slice()
};

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', e => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.code === 'F3') { e.preventDefault(); if (!e.repeat) diagnostics.toggle(); }
    else if (e.code === 'KeyK' && enabled && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) dump();
  });
  window.dustlineDiag = diagnostics;
}
