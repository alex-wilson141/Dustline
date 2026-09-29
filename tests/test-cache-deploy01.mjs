// DEPLOY-01: a browser must never run a mix of cached old files and new ones. Every module and asset URL carries a
// content hash (import map + assetURL, stamped by tools/stamp-build.mjs), and index.html loads the game only after
// confirming it is the build the server has now. These checks prove the stamp is current and complete and exercise the
// start-up check; the real-browser proof (stale caches in Chromium and Safari) is recorded in the roadmap.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execSync} from 'node:child_process';
import {createGame, projectRoot} from './sprint-harness.mjs';
import {computeStamp, stamp} from '../tools/stamp-build.mjs';

const dist = fileURLToPath(new URL('dist/', projectRoot));
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const token = (/<meta name="dustline-build" content="([0-9a-f]{12})">/.exec(html) || [])[1];
const importMap = JSON.parse((/<script type="importmap">([^<]*)<\/script>/.exec(html) || [])[1] || '{}');
const gateCode = (/<script>([\s\S]*?)<\/script>/.exec(html) || [])[1];

await check('dist is stamped: the build token, import map, stylesheet, start-up check and asset hashes match the current files', async () => {
  assert.match(token, /^[0-9a-f]{12}$/, 'a 12-hex build token in the dustline-build meta tag');
  const s = stamp(dist, {check: true});
  assert.deepEqual(s.stale, [], 'run node tools/stamp-build.mjs after changing dist/');
  assert.equal(s.token, token);
  assert(html.includes(`<link rel="stylesheet" href="style.css?v=${token}">`), 'stylesheet versioned');
  assert(gateCode && gateCode.includes(`var build = '${token}'`), 'start-up check carries the token');
  report.token = token; report.modules = s.modules; report.assets = s.assets;
});

await check('every module URL is versioned: the import map covers every .js file, every relative import in dist resolves to a mapped file, and the page has no unversioned script or style', async () => {
  const files = fs.readdirSync(dist).filter(f => f.endsWith('.js') && !f.startsWith('.')).sort(); // dot-files (a test's temporary copy, .DS_Store) are ignored
  assert.deepEqual(Object.keys(importMap.imports).sort(), files.map(f => `./${f}`), 'one entry per module');
  for (const [key, url] of Object.entries(importMap.imports)) assert.equal(url, `${key}?v=${token}`);
  let imports = 0;
  for (const f of files) {
    const src = fs.readFileSync(path.join(dist, f), 'utf8');
    if (f === 'three.module.js') { assert(!/^\s*(import|export)\b[^;]*\bfrom\s*['"]/m.test(src), 'vendored three.js imports nothing'); continue; }
    assert(!/new\s+(Shared)?Worker\s*\(|importScripts\s*\(/.test(src), `${f}: no workers (they would need their own versioned URL)`);
    // Build 22: a module may be fetched later (a map that is asked for), but only by a plain name written out in full that
    // the import map versions like any other; a name worked out at run time would escape the fingerprint.
    for (const m of src.matchAll(/\bimport\s*\(([^)]*)\)/g)) { const spec = m[1].trim().match(/^'(\.\/[\w.-]+\.js)'$/)?.[1]; assert(spec, `${f}: import(${m[1]}) names a module in full`); assert(importMap.imports[spec], `${f}: ${spec} is in the import map`); assert(fs.existsSync(path.join(dist, spec)), `${spec} exists`); imports++; }
    for (const [, spec] of src.matchAll(/(?:^|\n)\s*(?:(?:import|export)\b[^;'"]*?\bfrom|import)\s*['"]([^'"]+)['"]/g)) {
      imports++; assert(spec.startsWith('./') && !spec.includes('?'), `${f}: import ${spec} is a plain relative path`);
      assert(importMap.imports[spec], `${f}: ${spec} is in the import map`); assert(fs.existsSync(path.join(dist, spec)), `${spec} exists`);
    }
  }
  assert(imports >= 20, `${imports} imports checked`);
  const tags = [...html.matchAll(/<(script|link)\b[^>]*>/g)].map(m => m[0]);
  assert.deepEqual(tags.filter(t => /<script/.test(t)), ['<script type="importmap">', '<script>'], 'only the import map and the start-up check; game.js is added by the check');
  assert(html.indexOf('<script type="importmap">') < html.indexOf('<script>'), 'import map before any module can load');
  assert(!/modulepreload|<script[^>]*\bsrc=/.test(html), 'no static module or preload tags');
  for (const t of tags.filter(t => /<link/.test(t))) assert(/href="(data:|style\.css\?v=)/.test(t), `${t}: versioned or inline`);
  assert.deepEqual([...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]).filter(u => !u.includes('?v=')), ['credits.html'], 'the only unversioned local link is the credits page, which loads no game files');
});

await check('every asset URL is versioned: code requests assets only through assetURL, every request in a real game start carries the file\'s content hash, and every bundled asset is listed', async () => {
  const {ASSET_VERSIONS, assetURL} = await import(new URL('dist/build.js', projectRoot));
  const onDisk = [];
  const walk = d => { for (const e of fs.readdirSync(path.join(dist, d), {withFileTypes: true}).filter(e => !e.name.startsWith('.'))) e.isDirectory() ? walk(`${d}/${e.name}`) : onDisk.push(`${d}/${e.name}`); };
  walk('assets');
  assert.deepEqual(Object.keys(ASSET_VERSIONS).sort(), onDisk.sort(), 'one hash per bundled asset');
  for (const f of onDisk) assert.equal(ASSET_VERSIONS[f], crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, f))).digest('hex').slice(0, 10), `${f} hash`);
  for (const f of fs.readdirSync(dist).filter(f => f.endsWith('.js') && !f.startsWith('.') && f !== 'build.js' && f !== 'three.module.js' && f !== 'GLTFLoader.js')) { // the vendored loader names a path in an example in its comments; it fetches nothing itself (the kit hands it a model's bytes)
    const src = fs.readFileSync(path.join(dist, f), 'utf8');
    for (const m of src.matchAll(/['"`]assets\//g)) assert.equal(src.slice(m.index - 9, m.index), 'assetURL(', `${f}: asset path at ${m.index} goes through assetURL`);
  }
  const g = await createGame(); await g.viewmodel.ready;
  const requests = g.assetRequests.filter(u => /assets\//.test(u));
  assert(requests.length >= 15, `${requests.length} asset requests recorded`);
  for (const u of requests) { const [file, q] = u.split('?'); assert(ASSET_VERSIONS[file], `${file} is bundled`); assert.equal(q, `v=${ASSET_VERSIONS[file]}`, `${u} carries its hash`); }
  assert.equal(assetURL('assets/rifle/rifle.json'), `assets/rifle/rifle.json?v=${ASSET_VERSIONS['assets/rifle/rifle.json']}`);
  report.assetRequests = requests.length;
});

// Runs the real start-up check from index.html with a scripted server response.
async function gate({page = 'http://localhost:8765/', served = html, fetchFails = false, ok = true} = {}) {
  const out = {fetch: [], replace: [], replaceState: [], scripts: [], error: {hidden: true, textContent: ''}}, here = new URL(page);
  vm.runInNewContext(gateCode, {URL,
    location: {href: here.href, pathname: here.pathname, replace: u => out.replace.push(u)},
    history: {state: null, replaceState: (s, t, u) => out.replaceState.push(u)},
    document: {createElement: () => ({}), body: {appendChild: el => out.scripts.push({...el})}, getElementById: id => id === 'error' ? out.error : null},
    fetch: (p, opts) => { out.fetch.push([p, opts?.cache]); return fetchFails ? Promise.reject(new TypeError('Load failed')) : Promise.resolve({ok, text: async () => served}); }});
  await new Promise(r => setTimeout(r, 20));
  return out;
}

await check('the start-up check loads the game only for the current build: current page, stale page, stale after a retry, unreadable or unstamped server page, unreachable server, cleanup of the retry marker, sub-path hosting', async () => {
  const game = [{type: 'module', src: `game.js?v=${token}`}], other = 'aaaaaaaaaaaa', newer = html.replaceAll(token, other);
  let r = await gate();
  assert.deepEqual(r.fetch, [['/', 'reload']], 'fetches the served page past the HTTP cache (and stores it over a stale copy)');
  assert.deepEqual(r.scripts, game, 'current: loads game.js with this build\'s URL'); assert.deepEqual(r.replace, []);
  r = await gate({served: newer});
  assert.deepEqual(r.scripts, [], 'stale: no game code loads'); assert.deepEqual(r.replace, [`http://localhost:8765/?build=${other}`], 'stale: replaced by the current page');
  r = await gate({page: `http://localhost:8765/?build=${other}`, served: newer});
  assert.deepEqual([r.scripts, r.replace], [[], []], 'still stale after the retry: no game code and no reload loop');
  assert(!r.error.hidden && /Reload/.test(r.error.textContent), 'explains how to reload');
  // Unreachable server: nothing can be fetched, so the page runs from what the browser already has (offline play).
  r = await gate({fetchFails: true}); assert.deepEqual(r.scripts, game, 'server unreachable: this copy starts');
  // A readable answer that is not this build (an error page, or a build from before DEPLOY-01): the server's current page
  // is loaded as a whole instead, once; if it still cannot be confirmed, nothing starts.
  for (const [label, opts] of [['error response', {ok: false, served: ''}], ['page without a stamp', {served: html.replace(/<meta name="dustline-build"[^>]*>/, '')}]]) {
    r = await gate(opts); assert.deepEqual(r.scripts, [], `${label}: no game code from this copy`);
    assert.equal(r.replace.length, 1); assert.match(r.replace[0], /^http:\/\/localhost:8765\/\?build=none-\d+$/, `${label}: the server's page is loaded under a new address`);
    r = await gate({...opts, page: r.replace[0]}); assert.deepEqual([r.scripts, r.replace], [[], []], `${label}, after the retry: no loop, no game code`); assert(!r.error.hidden);
  }
  r = await gate({page: `http://localhost:8765/?build=${token}&x=1#top`});
  assert.deepEqual(r.scripts, game); assert.deepEqual(r.replaceState, ['http://localhost:8765/?x=1#top'], 'the retry marker is removed from the address once current');
  r = await gate({page: 'https://example.site/dustline/index.html', served: newer});
  assert.deepEqual(r.fetch, [['/dustline/index.html', 'reload']]); assert.deepEqual(r.replace, [`https://example.site/dustline/index.html?build=${other}`]);
});

await check('a page from before DEPLOY-01 (Build 08, no import map) that fetches new files reloads the current page before any game code runs; every module changed since Build 08 triggers it', async () => {
  const src = fs.readFileSync(path.join(dist, 'build.js'), 'utf8'), m = /\nif \(typeof location[\s\S]*?\n}\n/.exec(src);
  assert(m, 'build.js carries the upgrade guard');
  const run = ({protocol = 'http:', url = 'http://localhost:8765/build.js', meta = false} = {}) => {
    const out = {replace: []}; let threw = false;
    try { Function('location', 'document', '__url', m[0].replace('import.meta.url', '__url'))({protocol, pathname: '/', replace: u => out.replace.push(u)}, {querySelector: q => meta && q === 'meta[name="dustline-build"]' ? {} : null}, url); } catch { threw = true; }
    return {...out, threw};
  };
  let r = run(); assert(r.threw && r.replace.length === 1 && /^\/\?build=upgrade-\d+$/.test(r.replace[0]), 'old page: replaced, and no game module body runs (the import throws)');
  assert.deepEqual(run({url: `http://localhost:8765/build.js?v=${token}`}), {replace: [], threw: false}, 'stamped page (import map): nothing happens');
  assert.deepEqual(run({meta: true}), {replace: [], threw: false}, 'stamped page in a browser without import maps: no reload loop');
  assert.deepEqual(run({protocol: 'file:'}), {replace: [], threw: false}, 'not served over http: nothing happens');
  // Every module that differs from Build 08 (600a65a) imports build.js, so no new file can run under the old page.
  const changed = fs.readdirSync(dist).filter(f => f.endsWith('.js') && !f.startsWith('.') && f !== 'build.js').filter(f => {
    try { return execSync(`git show 600a65a:dist/${f}`, {cwd: new URL('.', projectRoot), stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26}).toString() !== fs.readFileSync(path.join(dist, f), 'utf8'); } catch { return true; } });
  assert(changed.length >= 4, `${changed.join(', ')} changed since Build 08`);
  for (const f of changed) assert(/(?:^|\n)\s*import\b[^;]*['"]\.\/build\.js['"]/.test(fs.readFileSync(path.join(dist, f), 'utf8')), `${f} changed since Build 08 and imports build.js`);
  report.changedSinceBuild08 = changed;
});

await check('the stamp tool gives a new token for any code, page or asset change and the same token otherwise; stamping is idempotent', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dustline-stamp-'));
  try {
    fs.cpSync(dist, tmp, {recursive: true});
    const base = computeStamp(tmp); assert.equal(base.token, token, 'a copy stamps to the same token');
    assert.deepEqual(stamp(tmp).stale, [], 'stamping a stamped copy writes nothing');
    const edits = [['code', 'enemy-ai.js', s => s + '\n// edit\n'], ['style', 'style.css', s => s + '\n'], ['page', 'index.html', s => s.replace('</title>', ' </title>')],
      ['asset', 'assets/rifle/rifle.json', s => s + ' ']];
    const seen = new Set([token]);
    for (const [kind, file, edit] of edits) {
      const p = path.join(tmp, file), before = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, edit(before));
      const s = stamp(tmp); assert(!seen.has(s.token), `${kind} change gives a new token`); seen.add(s.token);
      if (kind === 'asset') assert(s.stale.includes('build.js'), 'asset change rewrites build.js');
      assert.deepEqual(stamp(tmp, {check: true}).stale, [], `${kind}: stamped copy checks clean`);
      fs.writeFileSync(p, before); assert.equal(stamp(tmp).token, token, `${kind} reverted: back to the original token`);
    }
    for (const f of ['.DS_Store', 'assets/.DS_Store', 'assets/rifle/._rifle.json', '.b07-characters.js']) fs.writeFileSync(path.join(tmp, f), 'x');
    assert.equal(computeStamp(tmp).token, token, 'dot-files (Finder, AppleDouble, a test\'s temporary copy) never change the stamp'); assert.deepEqual(stamp(tmp, {check: true}).stale, []);
    fs.writeFileSync(path.join(tmp, 'environment.js'), fs.readFileSync(path.join(tmp, 'environment.js'), 'utf8') + ' ');
    assert.deepEqual(stamp(tmp, {check: true}).stale, ['index.html'], 'an edit without restamping is reported');
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: the start-up check runs in a Node vm with a scripted fetch/location; real browser caching (Chromium pane and Safari) is verified separately with a caching test server (roadmap B4).',
  'Import maps need Safari 16.4+, Chrome 89+ or Firefox 108+; older browsers ignore the map (modules unversioned) but still get the start-up check.']}, null, 2));
