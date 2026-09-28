# DUSTLINE project handoff

Read `README.md` and `DUSTLINE-ROADMAP.md` before changing the game. The roadmap
is the master development tracker. Update it after every development task with
changes, checks actually performed, unverified behavior, blockers and next steps.
Work on one requested milestone at a time; do not implement the entire backlog.

## Project structure

- Static HTML/CSS/JavaScript using bundled Three.js r169; no npm install or build
  step is required. `dist/` contains the authored source and bundled assets. It
  is not disposable generated output.
- `dist/game.js`: input, movement, simulation, missions and co-op integration.
- `dist/combat.js`, `network.js`, `environment.js`, `characters.js`, and
  `viewmodel.js`: existing combat, networking, scenery and animation systems.
- `tests/`: portable Node.js headless regression checks and historical evidence.
- `tools/stamp-build.mjs`: stamps content hashes into `dist/index.html` (import map,
  stylesheet, start-up check) and `dist/build.js` (asset hashes). Run it after every
  change in `dist/`.
- `dist/credits.html` and `dist/THREE-LICENSE.txt`: bundled asset/library credits.

## Current state

Build 14 (local, 2026-09-27): Ambush map and signposting rework. One signpost instead of four: M in Ambush
opens the full-screen map (`ambushToggleMap`, `ambushDrawMap`), drawn only from `mapLayout()` in
`dist/ambush.js`, whose labels must never overlap, cover a marker or leave the canvas (T24). In the
world every standing barricade and every crate carries a marking from `buildMarking` (paint, painted
board, lantern lit while it can be bought), re-made from the state by `ambushMarkings`. Do not bring
back signal masts, HUD waypoint lines, a HUD area list or a minimap in Ambush. Story and Skirmish keep
their M panel (`body.tactical`). Area 4 is "North houses" (north on the HUD compass).
Build 13 (local, 2026-09-27): `ambushState(open, standing)` in `dist/ambush.js` is the one source for
where barricades, areas and crates stand and whether each is open, purchasable or locked; everything
that shows them reads it and must never keep its own copy. The solo difficulty curve (2 -> 9) is
confirmed by the user's playtest (wave 8, 99 kills, 11m10s): do not change it or any price without an
explicit request (economy options are in the roadmap, E25). Filed: co-op with real players only in
every mode (F.13); friends-only PvP (F.14), blocked until AI-03 is fixed.
Build 12 (local, 2026-09-25): Ambush solo and purchase clarity. **Ambush is permanently solo for AI purposes:
no bot squad, ever** (`ambushSquad(false)` in `ambushReset` detaches the three squadmates, `reset()` puts
them back at indices 0-2 for every other mode; future Ambush co-op means real players only). Solo cap
curve `min(aliveCeiling 9, 1+ceil(n/2))`, arrival floor 1 s, pool 16. Rifles bought at crates carry
`rifleMagazines` (5, clamped by `rifleMagazines(config)`), N buys a dressing (`dressingPrice`, kit
`dressingMax`), the crate prompt uses `weaponTradeoff` (plain words from live `CLASSES`). All action
keys live in `KEYS` in `game.js`; every hint must read it (T22 presses the shown key). The dressing
line in the vitals panel stays visible in play.
Build 11 (local, 2026-09-25): Ambush difficulty and economy. Alive cap `min(aliveCeiling, 3+ceil(n/2))`
(12 from wave 17) with `enemyPool` (20) Ambush-only enemy actors attached by `ambushPool(true)` in
`ambushReset` and detached at the start of every `reset()` (Story/Skirmish/co-op always see 7 enemies and
10 local actors; never let extras leak). Magazines (B key, `ambushBuyAmmo`, `magazinePrice`) replace
the half-price refill; a bought rifle gets `rifleMagazines`. Crate prompts come from `weaponCompare`
(live `CLASSES` values, never text). `dist/records.js` keeps the Ambush personal best in localStorage
(one key, guarded; the only persistent data). Spawn spots need a route ≤ `spawnMaxRoute`; cover must lie
on the route (`coverOnRoute`). Build 10 playtest: wave 7, no stalls, confirmed working.
Build 10 (local, 2026-09-24): Ambush playtest fixes. Ambush enemies run `ambushPlan` (role
`ambush` only): advance to a slot `holdRange` from the player, stop to fire inside the wave's
`fightRange`, brief cover only where it gains ground, push failsafe after `pushAfter` s without
progress, stuck watchdog (`stallTime`/`stallStep`, AMB-04), last-resort recycle after
`recycleAfter` s unseen. Waves arrive from one bearing (`sectorSpread`). The four `ARENA_WALLS`
are kept out of the static batch and lowered to `arenaWallHeight` (1.2 m) in Ambush only.
Story/Skirmish enemy behaviour must stay trace-identical to `tests/fixtures/story-skirmish-ai-b09.json`
(T20 replays it; re-record only from the Build 09 source `21abfb6` with `--record`). All Build 10
tunables live in `AMBUSH` in `dist/ambush.js`. Never touch the shared movement/stuck code to fix an
Ambush-only problem; keep fixes inside `ambushPlan`/`ambushDirector`.
Build 09 (local, 2026-09-24): Ambush mode phase 1, solo wave survival in the west
district (`dist/ambush.js` data and rules, `game.js` Ambush block). Four areas behind
purchasable barricades, weapon crates with the four class rifles (the weapon id `gunId`
is separate from the class only after a purchase), an out-of-bounds line with a 5 s
countdown, and a timed extract/stay choice from wave 5. Waves scale count, alive cap,
arrival rate and aggression only, never enemy accuracy or damage. Spawns must stay unseen,
35 m+ away and 6 m+ outside the open arena; Ambush geometry exists only in Ambush.
The setting stays fictional: maps must not be tied to real conflicts.
Build 08 (local, 2026-09-24): death variants chosen per kill and sent to the guest
(`dv`/`st`); enemy corpses shootable for blood only (never score, kills or mission) and
sunk after `corpseLife`/beyond `corpseMax` (`gn` snapshot mask); reinforcement waves
(`waveSize`); 183 props in `dist/village-props.js` (bundled materials only; solid props are
unrotated boxes kept clear of spawns, loops, entries and objectives). DEPLOY-01 (fixed):
every module and asset URL carries a content hash (import map + `assetURL()` from
`dist/build.js`), and `index.html` starts the game only when the served page has the same
build token. After editing anything in `dist/`, run `node tools/stamp-build.mjs` (the
cache test fails otherwise). Keep relative import specifiers plain (no `?v=`), load
assets only through `assetURL()`, and add no dynamic imports or workers without
extending the stamp. AI-04 (fixed): enemies sight-check every target in range (their foe
first) and stay engaged while their foe is alive and within `engageLeash`; do not reintroduce
the nearest-three limit for enemies or end an engagement on the sight timer alone.
Build 07 (local, 2026-09-24): enemies patrol, use cover and reposition, with bounded
reinforcements (`dist/enemy-ai.js` holds every tunable in `ENEMY_AI`, read live);
navigation matches collision and every placement is validated (AI-02); the terrain is
raycast only where a ray crosses it (PERF-02, proven identical); P pauses/resumes
without leaving fullscreen (Escape is the browser's key). Build 06 corrected combat
feel; Build 04 removed sprint stamina entirely and the user accepted M1 in Safari.
Never reintroduce exhaustion, recharge delays, stamina gates or a stamina HUD. Keep
current class speeds, weapon balance and combat interruption rules. Do not add
stairs or mantling without a separate request.

Preserve Kohar Valley, Viper squad, the convoy route log, relay and extraction;
the four classes; combat and reload behavior; bots; experimental co-op; and
pointer capture, pause and leave controls. Only player kills count (KILL-01 is
intentional). Co-op: the host is authoritative for hits and sends `impact`
messages (zone, victim yaw and decal included); snapshots own HP but must not set
death rotation. Both players must run the same build; change the menu build label
whenever co-op messages change. Cosmetic effects use Math.random, never the seeded
gameplay rand(); enemy AI decisions use its own seeded `aiRng`. Nothing may raycast the
terrain mesh directly (use `terrainRay`/`terrainAt`). Enemy fire cadence, hit chance and
damage (the fire block and `aiHit`) must stay unchanged unless explicitly requested.
Do not rebind Escape as pause: browsers exit fullscreen on Escape before the page sees it.

## Run and verify

From this directory:

```sh
python3 -m http.server 8765 --directory dist
```

Open `http://localhost:8765/` in a full desktop browser for gameplay. Opening the
HTML file directly will not load the modules. Browser pointer lock captures the
mouse/trackpad during play; it does not need desktop recording permissions.

With a current Node.js version (last verified with 24.19.0):

```sh
node tests/test-sprint-m1.mjs
node tests/test-framefire-m1.mjs
node tests/test-diagnostics-m1.mjs
node tests/test-combatfeel-m2.mjs
node tests/test-combatfeel-m3.mjs
node tests/test-enemies-b07.mjs
node tests/test-perf02-b07.mjs
node tests/test-pausekeys-b07.mjs
node tests/test-build08.mjs
node tests/test-cache-deploy01.mjs
node tests/test-engage-ai04.mjs
node tests/test-ambush-b09.mjs
node tests/test-ambush-b10.mjs
node tests/test-ambush-b11.mjs
node tests/test-ambush-b12.mjs
node tests/test-ambush-b13.mjs
node tests/test-ambush-b14.mjs
```

`dist/diagnostics.js` is the F3 measurement overlay. It must stay read-only: gameplay
must be bit-identical with it off or on (checked by the diagnostics test). Read
`NOW.md` for the current task state.

The last checked Build 14 source passed 34 movement, 24 firing, 3 diagnostics,
10 + 16 combat-feel, 12 enemy, 6 terrain-equivalence, 11 pause/fullscreen, 5 Build 08
scenario, 6 file-versioning, 3 enemy-engagement, 9 Ambush, 8 Build 10, 6 Build 11, 6 Build 12, 3 Build 13 and 5 Build 14 checks. These
mock rendering, pointer capture and network transport. Human camera/movement
feel, GPU frame pacing and live WebRTC acceptance remain UNVERIFIED. Do not
request desktop screen/audio recording. Label tests honestly and never treat
headless results as a real gameplay or network playtest.

## Hosting and portability

The existing public game is
https://dustline-mountain-front.smart-heron-4139.chatgpt.site/ . Repository access
does not grant permission or credentials to publish to that Site. Develop and
preview locally first; configure a GitHub-based deployment separately if asked.
Serve `dist/` as the site root. Assets are bundled; co-op setup uses Google STUN
and has no TURN relay. The game has no account, database or save backend.

Historical `work/` checks mentioned in the roadmap belong to the original
workspace and are not in this transfer. The two current regression suites above
are included and portable. Use this repository root in a new checkout.
