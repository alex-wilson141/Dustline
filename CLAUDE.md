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

Build 04 was published on 2026-09-23. It removes sprint stamina entirely and
fixes reproduced stamina-threshold oscillation and slow-frame movement timing.
Never reintroduce exhaustion, recharge delays, stamina gates or a stamina HUD.
Keep current class speeds and combat interruption rules. No stamina-based class
perk existed to replace. Do not add stairs or mantling without a separate request.

Preserve Kohar Valley, Viper squad, the convoy route log, relay and extraction;
the four classes; combat and reload behavior; bots; experimental co-op; and
pointer capture, pause and leave controls.

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
```

The last checked Build 04 source passed 34 movement and 24 firing checks. These
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
