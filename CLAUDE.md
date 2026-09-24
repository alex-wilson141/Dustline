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
- `dist/credits.html` and `dist/THREE-LICENSE.txt`: bundled asset/library credits.

## Current state

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
```

`dist/diagnostics.js` is the F3 measurement overlay. It must stay read-only: gameplay
must be bit-identical with it off or on (checked by the diagnostics test). Read
`NOW.md` for the current task state.

The last checked Build 07 source passed 34 movement, 24 firing, 3 diagnostics,
10 + 16 combat-feel, 12 enemy, 6 terrain-equivalence and 11 pause/fullscreen checks. These
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
