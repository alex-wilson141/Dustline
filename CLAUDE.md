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

Build 18 (local, 2026-09-28): Ambush fairness and cleanup. **Standing decisions: Ambush never has AI squadmates, in any
configuration (the only teammate there is a real player); co-op must be fair between host and guest.** `squadWanted()` is
false in Ambush whatever is stored or sent; do not add an Ambush key to `squadPref`. Anything that judges, pays, spawns, times
or shows must treat the two players alike: check it from both sides (T28 does). Shots are judged against what the shooter saw
(`rewind`, `viewTime`; cap `NETVIEW.cap` 300 ms; the guest's picture is the straight line between the last two snapshots at
`viewAt()`, drawn by `netDraw`; do not bring back smoothing toward the newest snapshot, the host cannot reproduce it). The
guest's rifle is counted by `remoteFire` (one shot per fire interval, banked up to the cap), its reload and dressing from when
the guest began them (`sinceSent`). Each wave's arrivals are dealt equally by count (`amb.sent`), each from the wave's
direction as its own player sees it (`amb.origins`), with fallbacks that never hold up the wave; an enemy changes player only
when its own is down. Either player's pause holds the mission (`hold`, `matePaused`). Found, not fixed: AI-07 (dead enemies
keep attack tokens); fixing it changes solo difficulty and the traces, so only on request.
Build 17 (local, 2026-09-28; its Ambush part removed in Build 18): the AI squad is the player's choice in Story, Skirmish
and Story co-op (`squadPref` in `game.js`, the box `#squad-ai`). Untouched it is on. `squadActive` is what the
mission was deployed with; read it, never the box and never the mode, to decide whether squadmates exist. In co-op the host's
choice governs (`squad` in the `mode` and `start` messages, `hostSquad` on the guest); the co-op teammate (`remote`) is a real
player and is never attached, detached or replaced by this. `reset()` must keep attaching the squad before the actors are
reset and detach afterwards: the reset draws seeded random numbers per actor, and solo Ambush must replay Build 15. At a
co-op extraction a downed player banks alongside the survivor (user decision); both down or a player who left banks nothing.
Build 16 (local, 2026-09-28): Ambush co-op, two real players (F.11). A networked mission is Story co-op (`mode==='coop'`) or
an Ambush run started while connected (`amb.coop`); use `net()`, `hosting()`, `guesting()`, `ambCoop()`, never `mode==='coop'`
alone, for anything that sends or receives. The host owns waves, spawns, barricades, both players' points (`amb` is the local
player's, `amb.mate` the teammate's) and every hit; the guest sends `pose`, `shot`, `buy`, `vote` and applies `ambushApply`.
User decisions, do not change without a request: points per player, barricades shared, crate purchases individual; one player
down spectates and the run ends only when both are down. Built on top: extracting takes both choices (`ambushVote`), co-op waves use `waveSpec(n, 2)` (`AMBUSH.coop`) only while both are up. **Solo Ambush must stay identical
to Build 15** (`abb41c9`; T26 replays it): every co-op branch must leave the solo path reading the same `player` object and
drawing the same random numbers. Personal bests use two keys (`BEST_KEY`, `BEST_KEY_COOP`). The co-op teammate is
`soldier('ally',3,'mate')`: blue, with an unlit marker drawn over everything, in every co-op mode. Friendly fire is on in co-op
through one body box and one damage rule for both players (`friendlyHit`, `friendlyDamage`); the teammate's meshes are never in
the hit test. AI-03 is fixed: enemies fire at the teammate with the host's chance, crouch factor and damage (T13 undoes exactly
those substitutions and compares with Build 06). NET-04 is fixed: `disconnected` holds the session for `graceTime` and the
mission is held on both pages while `peer.unstable`. A two-instance headless test, a two-tab test and a two-browser test on one
machine cannot show what two networks or two people do: say so.
Build 15 (local, 2026-09-28): COOP-01, the co-op handshake. Connection codes are
`DUSTLINE:<H|A>:<length>:<payload>:<checksum>` (`makeCode`/`readCode` in `dist/network.js`); pasted
codes go through `PeerSquad.submit`, which acts on the kind of code, not on the button; every
rejection has its own reason and message (never a generic one), and a connection that fails after a
correct exchange is reported as a network failure (no TURN relay, NET-01). Keep invisible characters
in source as written-out escapes. A two-tab test on one machine cannot show a cross-network failure:
say so whenever co-op is reported as verified.
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
(T20 replays it; re-record only from the Build 09 source `6560f7a` with `--record`). All Build 10
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
intentional; hitting a teammate never counts or pays). Co-op: the host is authoritative for hits and sends `impact`
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
node tests/test-coop-handshake.mjs
node tests/test-ambush-coop-b16.mjs
node tests/test-squad-b17.mjs
node tests/test-fair-b18.mjs
```

`dist/diagnostics.js` is the F3 measurement overlay. It must stay read-only: gameplay
must be bit-identical with it off or on (checked by the diagnostics test). Read
`NOW.md` for the current task state.

The last checked Build 18 source passed 34 movement, 24 firing, 3 diagnostics,
10 + 16 combat-feel, 12 enemy, 6 terrain-equivalence, 11 pause/fullscreen, 5 Build 08
scenario, 6 file-versioning, 3 enemy-engagement, 9 Ambush, 8 Build 10, 6 Build 11, 6 Build 12, 3 Build 13, 5 Build 14, 6 co-op handshake, 13 Ambush co-op, 8 squad-toggle and 8 fairness checks (202 in 21 suites). These
mock rendering, pointer capture and network transport. Human camera/movement
feel, GPU frame pacing and live WebRTC acceptance remain UNVERIFIED. Do not
request desktop screen/audio recording. Label tests honestly and never treat
headless results as a real gameplay or network playtest.

## Hosting and portability

The repository is https://github.com/alex-wilson141/Dustline (public, branch `main`, remote
`origin`). The live game is https://alex-wilson141.github.io/Dustline/ , served by GitHub Pages
from `dist/` as the site root. **Every push to `main` publishes**: `.github/workflows/pages.yml`
runs `node tools/stamp-build.mjs --check` and every `tests/test-*.mjs` suite, and deploys only if
all pass. So: never push a build the user has not asked to release, stamp before committing, and
keep the suites green. The site lives under the path `/Dustline/`: keep every URL in `dist/`
relative. Commits use the GitHub no-reply address (repo-local `user.email`); never put the user's
personal email, local user name or absolute home paths in tracked files. Commit IDs were rewritten
on 2026-09-27; the old-to-new table is in the roadmap (H2).

The earlier public Site https://dustline-mountain-front.smart-heron-4139.chatgpt.site/ is a
separate, older deployment; repository access does not publish to it. Assets are bundled; co-op
setup uses Google STUN and has no TURN relay. The game has no account, database or save backend
(the Ambush personal bests, solo and co-op, are browser storage only).

Historical `work/` checks mentioned in the roadmap belong to the original
workspace and are not in this transfer. The two current regression suites above
are included and portable. Use this repository root in a new checkout.
