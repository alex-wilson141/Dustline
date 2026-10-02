// Runs the regression suites: `node tools/run-suites.mjs quick|slow|all [--jobs N]`. Build 37: the quick ones (every suite
// not listed as slow in tests/suite-groups.json, the three traces among them) gate a publish; the slow ones run apart.
// Several run at once (each suite is its own process and shares nothing with another); the result is the same as one
// after another. Exit code 1 if any suite fails, or if the group file names a suite that does not exist.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2), group = args.find(a => !a.startsWith('--')) || 'all';
const jobsAt = args.indexOf('--jobs'), jobs = Math.max(1, +(jobsAt >= 0 ? args[jobsAt + 1] : 0) || 4);
export function suites(which, dir = root) {
  const groups = JSON.parse(fs.readFileSync(path.join(dir, 'tests', 'suite-groups.json'), 'utf8')), all = fs.readdirSync(path.join(dir, 'tests')).filter(f => /^test-.*\.mjs$/.test(f)).map(f => f.replace(/\.mjs$/, '')).sort();
  const missing = [...groups.slow, ...groups.traces].filter(n => !all.includes(n)), slowTrace = groups.traces.filter(n => groups.slow.includes(n));
  if (missing.length) throw new Error(`tests/suite-groups.json names suites that do not exist: ${missing.join(', ')}`);
  if (slowTrace.length) throw new Error(`a trace suite is listed as slow: ${slowTrace.join(', ')}`);
  const slow = all.filter(n => groups.slow.includes(n)), quick = all.filter(n => !groups.slow.includes(n));
  if (!['quick', 'slow', 'all'].includes(which)) throw new Error(`unknown group "${which}": quick, slow or all`);
  return {quick, slow, all}[which];
}
function run(name) { return new Promise(done => { const t0 = Date.now(), child = spawn(process.execPath, [path.join('tests', name + '.mjs')], {cwd: root}); let out = '', err = '';
  child.stdout.on('data', d => out += d); child.stderr.on('data', d => err += d);
  child.on('close', code => { let passed = null; try { passed = JSON.parse(out).passed; } catch {} done({name, ok: code === 0 && Number.isInteger(passed), passed, seconds: Math.round((Date.now() - t0) / 1000), err}); }); }); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const list = suites(group), queue = [...list], results = [], t0 = Date.now();
  await Promise.all(Array.from({length: Math.min(jobs, list.length)}, async () => { while (queue.length) { const r = await run(queue.shift()); results.push(r); console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}  ${r.ok ? r.passed + ' checks' : ''}  ${r.seconds} s`); if (!r.ok) console.log(r.err.split('\n').filter(l => l.trim()).slice(0, 12).join('\n')); } }));
  const failed = results.filter(r => !r.ok), checks = results.reduce((s, r) => s + (r.passed || 0), 0);
  console.log(`${group}: ${results.length - failed.length} of ${results.length} suites passed, ${checks} checks, ${Math.round((Date.now() - t0) / 1000)} s with ${jobs} at once${failed.length ? '; FAILED: ' + failed.map(r => r.name).join(', ') : ''}`);
  process.exit(failed.length ? 1 : 0);
}
