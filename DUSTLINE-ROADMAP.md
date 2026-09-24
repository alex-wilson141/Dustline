# Dustline development tracker

This is the master backlog for improving the existing game. Preserve working features. Inspect the actual project before deciding what is missing. A menu label is not evidence that a feature works.

## Status rules

- UNVERIFIED: Requested or proposed; implementation has not been inspected.
- TODO: Confirmed missing.
- IN PROGRESS: Currently being implemented.
- BLOCKED: Needs a specific external dependency or decision; record it.
- DONE: Implemented and verified; record the evidence.
- DEFERRED: Deliberately postponed; record why.

Initial entries began UNVERIFIED. The 2026-09-23 inspection below now records individual findings; untested behavior remains UNVERIFIED. Original requirements should remain in scope. Suggested additions and proposed quantities/designs may be refined after inspection and playtesting.

For each milestone, record status, existing implementation, remaining work, verification, and blockers. Update this file after each task. Do not mark a milestone DONE while required checklist items remain incomplete. Track partial completion at item level.

## Known context

- Game title shown: Dustline — Broken Signal.
- Screenshot shows Story, Skirmish, Private Co-op, and four classes: Assault, Marksman, Support, Medic.
- Screenshot shows a mission involving a convoy route log, radio relay, and extraction.
- User reports rapid sprint rubberbanding, insufficient visual quality, and unclear or repetitive gameplay objectives.
- Updated inspection: Build 04 implements unlimited sprint and fixes two reproduced movement-timing defects. Current human play, GPU performance and live network play remain UNVERIFIED. Saves and a game-account backend are confirmed absent.
- 2026-09-23 human playtest (user, real browser, Build 04): sprint slowed and the view shook after a few seconds; MOV-01/M1.02 were reopened and the F3 overlay added. Later 2026-09-23 user playtest: "sprint jitter is gone in Safari on Build 04". M1 acceptance confirmed by the user; the specific cause was not isolated (no overlay dump was supplied).
- Build 05 user playtest (2026-09-23), verbatim: "fall direction is correct but every death plays the same animation; blood is too small and only visible up close; there is no blood on surfaces; the kill marker change is unwanted; a downed ally appears to end the mission. No stutter observed — frame rate held up in combat."
- Build 06 (local, 2026-09-23): corrections for that playtest — neutral hit marker plus text kill alert, larger pooled blood (headshots larger), persistent capped blood decals (co-op), six death variants, accurate mission-failure text; review fixes (co-op yaw, human-wound decals, buried surfaces, zoom, rest pose). Not published.
- Build 05 (local, 2026-09-23): M2 combat feel (blood + setting, directional flinches, authored falling deaths, hit sound/marker with headshots), co-op `impact` messages, PERF-01 auto-resolution fix. Not published.


> **Canonical tracker:** `DUSTLINE-ROADMAP.md` in this game project. Last updated **2026-09-23**, Build 06 local implementation (Git, local only). Build 04 source `9e603d65c97d982a2bf2a54887d27597fb24fc21` is the handoff baseline commit.
> **Current task scope (2026-09-23, Claude Code):** Build 06 combat-feel corrections from the Build 05 playtest (M2.01 marker/kill alert, M2.03 blood scale + decals, M2.04 death variants, mission-failure text for the ally-down report) plus the M2.05 measurement; breakable props investigated only (M5.09); the user's long-term plan filed as not started (section 15). Out of scope and untouched: physics, ragdoll, camera shake, balance, weapons, grenades, menu restructure, spawning.

## Provenance and future-task rules

- **ORIGINAL:** direct requests in the existing game conversation: first-person team combat in a fictional Afghanistan-like valley; more realistic visuals/mechanics; trackpad looking with hidden/captured cursor; four selectable loadouts; enterable buildings; richer routes; story and multiplayer; working reload/fire; animations; performance; a less crowded HUD and a way to leave. The latest direct M1 requirement is **unlimited sprint**: no stamina resource, meter, exhaustion, recharge delay, resource-based speed changes, jump restriction, aim penalty or class perk. Hold the sprint input with permitted movement to keep sprinting; retain the existing forward-input, aiming, crouching, firing, reload and healing gates. This supersedes any earlier stamina design or exhaustion/recovery acceptance plan.
- **PLAN:** future scope in the supplied roadmap and pasted milestone plan: expanded equipment/classes, new menu tabs, configurable bots, rooftop waves, progression/cosmetics, accounts/cloud saves and campaign/maps. These are tracked requirements for later bounded tasks, not authorization to implement all of them now. M1 is governed by the updated ORIGINAL requirement above.
- **SUGGESTION:** entries explicitly called “Suggested”/“Proposed” in the master roadmap. In conflicts, the master roadmap's provisional status wins: the exact eight-class roster/roles, operation names, three-by-six mission count, 15–25-minute target and environment list are not verified or immutable designs. Do not silently convert them into original requirements.
- **SETUP:** the user's initial inspection/tracker request. Mixed labels preserve original scope while identifying later additions.
- After **every development task**, read this file first, preserve current working features and Broken Signal story content, work on only the selected milestone and necessary prerequisites, then update affected item statuses/evidence and append a progress-log row: date, source revision, files/features changed, checks and results, unverified acceptance, remaining work, exact blockers and next task.
- `DONE` means the named scope was checked; a code test is not a claim of visual quality, real networking or human playtesting. Checkbox `[x]` is reserved for DONE. For partial items, retain an allowed status and state the completed subpart plus remaining work. At this handoff, M1 code work is complete and human acceptance is UNVERIFIED; no checklist feature remains IN PROGRESS. DEFERRED preserves scope and records why it is postponed. A missing feature is TODO; do not invent an external BLOCKED state just because it is not built yet.
- Do not replace established lore with the pasted plan's proposed occupied-city premise without an explicit story decision. Keep Kohar Valley, Viper squad, the relief convoy, route log, relay and extraction.
- Desktop screen/audio-access testing was stopped after the user objected. M1 verification uses headless code checks; no desktop recording was requested. Gameplay does not need screen recording, microphone or camera permission. Leave real pointer capture/visual feel UNVERIFIED unless tested through an acceptable method or confirmed by the user.

## Project baseline and evidence register

**Project:** the current repository root.
**Live game:** https://dustline-mountain-front.smart-heron-4139.chatgpt.site/  
**Technology:** static HTML/CSS and JavaScript ES modules; bundled Three.js **r169** with custom rendering, X/Z collision, AI/pathfinding, mission loop and WebRTC. No React, build step, physics engine, dedicated gameplay server or save backend was found. The GitHub handoff adds a private ES-module `package.json` with test commands only; it has no dependencies. `dist/` is the authored runtime as well as the static hosting directory; do not assume it is disposable generated output. It is approximately 16 MB on disk.

| Evidence | What was inspected / result |
|---|---|
| E1 — project | Git tracked-file inventory, `README.md`, `.openai/hosting.json`, `dist/index.html`, and `dist/three.module.js:6`; clean starting checkout at the commit above. No applicable AGENTS.md found in checked ancestors/project. |
| E2 — modes/UI | `dist/index.html`; `game.js` `setClass`, `setMode`, `updateDeploy`, `start`, `pause`, `goMenu`, `reset`, keyboard/pointer handlers. Three real mode paths and four class configurations; not the future multi-tab shell. |
| E3 — story/results | `game.js` `interact`, `advanceStory`, `missionTick`, `hudObjective`, `finish`, `radio`. Hardcoded route-log recovery, 25-second uncontested relay accumulation, 5-second extraction; both humans must extract in co-op. Skirmish uses 45 seconds. No campaign clock deadline despite briefing prose; no checkpoints/rewards. |
| E4 — networking | `dist/network.js` `PeerSquad` and `game.js` `receive`/`networkTick`: manual offer/answer codes, real data channel, host-driven AI/health/mission, guest actions and remote positions, snapshots about every .08s, disconnect/pause handling. Three AI allies and seven enemies remain. |
| E5 — movement, updated Build 04 | `game.js` `blocked`, `move`, `frame`, `stepSimulation`, input/reset handlers; `timing.js`; `viewmodel.js`. Unlimited sprint retains normalized input, per-axis X/Z collisions, analytic ground height and existing combat gates. Simulation steps are no larger than 1/60s, with at most .25s catch-up per rendered frame. FOV/recoil/weapon pose use time-based damping; bob fades when stopping, weapon base position no longer accumulates bob/recoil, and jump integration is consistent across step sizes. No stair/platform/mantle controller was added. Historical .05s cap and resource-threshold oscillation are reproduced in T7. |
| E6 — combat/classes/bots | `dist/combat.js`; `game.js` `shoot`, `hitScan`, `reload`, `tickAI`, `sound`, healing, effect cleanup. Primary hitscan plus four loadouts, headshot threshold, per-class damage/armor/speed, self-dressings, LOS/A*, three squad orders. No multi-slot equipment, grenades, bot ammo/reload or cover planner. |
| E7 — art/performance | `dist/environment.js`, `characters.js`, `viewmodel.js`, `optimization.js` and renderer setup. Twelve building definitions with doors/windows/furnishings; one valley with side routes/cover. PBR photographs/HDR and adapted rifle model; procedural human rigs/hands/props. Static batching, bounding boxes, cached shadows, adaptive DPR and throttled HUD/AI exist. |
| E8 — licenses | `dist/credits.html`, `THREE-LICENSE.txt`, bundled assets. Credits record Poly Haven ground/plaster/brick/HDR and OpenGameArt M4A1 as CC0; Three.js is MIT. Unused legacy rough-plaster maps remain bundled. Recheck license provenance when importing new assets. |
| E9 — absence inventory | Inspected all authored runtime modules, HTML and project tree; searches for save/profile/auth/checkpoint/unlock/equipment/wave/difficulty systems matched no implementation beyond current run state, labels/descriptions and listed systems. No auth SDK, local persistence, database bindings or server routes. |
| E10 — sprint-slowdown mechanisms (2026-09-23) | `game.js` `frame`/`stepSimulation`/`applyQuality`/`move`, `timing.js`. Mechanisms that can change apparent speed, FOV or resolution during a held sprint: (1) **Auto render-scale ratchet** (`frame`, Auto only): every 5s of accumulated time, if the game's smoothed FPS < 42 the pixel ratio drops .15 (1.1 → .95 → .8 → floor .75) and never rises again during the session (menu reselection resets it); each drop resizes the canvas. (2) **.25s cap** (`timing.js`, all modes): discards simulation time only for a single frame > 250ms; frames up to 250ms are substepped at ≤1/60s with no time loss. (3) **Sprint gate** (all modes): Shift + W with no aim/crouch/held trigger/reload/dressing; losing it drops 6.1 → 3.5 m/s × class and FOV target 76 → 70 together. (4) Class, dressing (.45) and aim (.68) multipliers. (5) FOV target: aim zoom / 76 sprint / 70, damped. (6) Wall sliding in `move`. (7) Head bob ~1.9 Hz, visible as judder at low FPS. (8) Substep count scales with frame time; each substep runs player, viewmodel, all actor animation and AI tick, so slow frames cost more CPU (possible feedback loop). Found, not fixed: the smoothed FPS driving (1) is a per-frame 4% EMA of *uncapped* frame time, so one long frame (e.g. 1s) holds it under 42 for roughly 40 frames; the 5s timer also accumulates in the menu, so the first check can run on the first playing frame. Preview observation: game-smoothed FPS read 4.8 while measured FPS was a steady 60 after a page reload. At a 60 Hz display, 16.7ms frames alternate 1 and 2 substeps (ceil rounding). None of this is yet tied to the user's symptom. |
| E11 — hit/death propagation before M2 (2026-09-23) | `game.js` `hitScan`, `shoot`, `tickAI`, `receive`, `networkTick`; `characters.js` `animate`. Solo: player hits are real raycasts (headshot = hit > 1.45m above feet, 110 damage); kills `kills++` and set an instant `rotation.z = π/2` plus +.2m; surface hits make dust. Bot hits are chance-based (no ray/hit point); ally deaths roll and stand up after 15s. Host: same, plus guest `shot` messages raycast on the host, replying with a bare `hit`. Guest: received only that bare `hit` and 12.5 Hz snapshots whose HP forced `rotation.z = π/2` every packet; no hit events, tracers or dust (even for its own shots). Build 05 resolves the guest gap with host-sent `impact` messages (NET-03). |
| E12 — why a downed ally "ended" the mission (2026-09-23) | Step A workflow (two independent agents, real `tickAI` headless). Only 6 `finish()` callers: local player death, co-op human teammate (remote avatar) death, skirmish win, extraction win, connection close, host `end`. **No AI-ally path**: 18 × 240 s real-AI runs with 50 natural ally deaths, 0 failures; the skeptic found no counterexample. Both death cases printed "A squad member was lost…", so the player's own death read as an ally's. When an ally drops, its attacker retargets the player (measured 9→0 hits on the ally, 0→6 on the player). The 15 s "stand-up" teleports the ally to the regroup point ((index−1)·4, 65) behind the start, not where it fell. Build 06 names the victim ("You were killed." / "Your co-op teammate was killed…", guest gets its own point of view); AI rule unchanged. |
| E13 — breakable props feasibility (2026-09-23) | Investigation only; see M5.09. 14 candidates (10 crates, 4 market stalls with 72 fruit + 12 trays). Constraints: props merged by `batchStatic` (cannot hide individually), static shadow map (refresh per break), 2D `blocked()` solids, cached nav grid (0–2 cells per prop), host-authoritative co-op, `reset()` has no world restore, terrain raycasts ~3.6 ms. Prototype of option B (spheres vs analytic terrain + AABBs, rolling, sleep): 72 fruit settle in 2–3 s at 0.08 ms/step. |
| E14 — decal surfaces (2026-09-23) | 271 occluders: terrain mesh (64,800 tris, ~3.7 ms per downward ray — excluded from decals), 96 wall segments, lintels, sills, roofs, 12 floor slabs (terrain covers 57–100% of each), furniture, low walls, sandbag covers, brick walls, 10 crates, 4 counters, truck bodies, relay box; all unrotated/unscaled boxes so a face is the world AABB. A wall is within 2.5 m behind only ~2–4% of outdoor hits (29% indoors), so floor splats behind the victim carry the effect outdoors. Floor height uses the exact rendered terrain triangle (`terrainAt`, ≤1.5e-7 m vs mesh raycast). |
| B1 — M2.05 blood/decal frame cost (2026-09-23, Build 06) | Real game code and Kohar Valley scene in the Claude app's Chromium pane on the user's MacBook Pro M1 (ANGLE Metal), AC power, drawing buffer 1584×990 (1440×900 × 1.1 Auto), 5 targets at 15–40 m, synthetic 60 FPS clock, GPU timer queries + 1-px readPixels sync, ABBA Blood on/off, 2 × 480 frames per arm. Blood-on arm starts with decals at the 40 cap. **40 decals, no hits:** +1 draw call, GPU +0.009 ms. **8.6 hits/s (solo Assault):** 289 live particles, +4 draw calls, GPU +0.057 ms, whole frame +0.05 ms. **22.5 hits/s (co-op):** 762 particles, GPU +0.067 ms, frame +0.06 ms. **47.6 hits/s (stress):** 1,216 particles, GPU +0.069 ms (p95 +0.083), frame +0.03 ms. First hit after idle +0.3 ms (Build 05: 4–6 ms program-recompile hitch). Real automatic fire: Blood on vs off indistinguishable (noise ~0.25 ms). Headless CPU: spray 6 µs, decal placement 29 µs, ring add <1 µs, pool update ~11 µs/step. Build 05 comparison (Step A): ~0.57 draw calls per hit/s, +0.2 ms at 47.6 hits/s. Not measured: Safari, long sessions, lower-end GPUs. Scripts: scratch `build06/bench/dl-bench6.js`. |
| H1 — hosting check | Setup Sites metadata on 2026-09-23: active, live version 3, access mode **public**. This is visitor access, not game-account auth. M1 corrected README's stale private-Site paragraph; no hosting-policy change is required. Build 04 publication is not yet recorded here. |

### Running and reproducing checks

From the project root: `python3 -m http.server 8765 --directory dist`, then visit `http://localhost:8765/` in a browser supporting WebGL and pointer lock. Serve over HTTP; opening HTML as a file cannot load the modules. Deployment is Sites via `.openai/hosting.json`, project ID `appgprj_6ab34f9cda948191942d1ea5af14bb9f`; preserve its **public** audience unless asked otherwise. Record publication separately from local implementation and code verification.

M1 regression scripts now live in this project: run `node tests/test-sprint-m1.mjs` and `node tests/test-framefire-m1.mjs` from the project root. Both use `tests/sprint-harness.mjs` to execute the production game module with browser/rendering/network substitutes. Historical pre-M1 measured results are preserved in `tests/fixtures/sprint-before-m1.json`; they are evidence from base `07a6e8f`, not generated from current code. Older checks and the baseline reproduction script remain in the surrounding workspace at `../../work/`; from that workspace, run `node work/<script>.mjs`. Node used here: `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.

T1/T3–T5 record the setup checks on Build 03. T2 and T6 were rerun after the final M1 fire gate; T7–T9 record the M1 diagnosis and Build 04 regressions. Later reruns must record their own results rather than treating a past pass as current acceptance.

| Check recorded on 2026-09-23 | Result / limits |
|---|---|
| T1 `work/test-combat.mjs` | PASS, 15 scenarios: four classes, repeated fire/reload cycles at several tick sizes, low reserve, empty auto-reload, invalid dt. Verifies WeaponState, not combat feel. |
| T2 `work/audit-v3-code.mjs` | PASS, rerun after the final Build 04 fire gate: capture lifecycle/stale request races, pending co-op cleanup, brief active-AI walk/crouch/jump/fire/reload, pause freeze, reset/resume/leave, real rifle/character module loading, finite actor transforms and 15 runtime asset paths. DOM, WebGL renderer and pointer capture are mocked; local asset reads replace fetch. No browser, human playthrough, full objective completion or GPU measurements. Sustained sprint is checked separately in T8. |
| T3 `work/test-network-v3.mjs` | PASS: retired channels/peers cannot change current session; cancelled host/join cannot return stale codes. RTCPeerConnection is mocked; no packets sent, no live co-op retest. |
| T4 `work/test-characters.mjs` | PASS: 28 enemy/29 ally meshes, finite animation over 240 updates and unchanged outer transforms. Enemy height ~1.82m; ally bounding height ~2.05m includes marker. Tests the supplied character module; runtime integration also covered by T2. Not a visual animation review. |
| T5 `work/test-viewmodel.mjs` | PASS: actual rifle JSON loads magazine/charging handle; four class reload sequences finish with finite/reset transforms. Texture loading is stubbed, so no appearance claim. |
| T6 JavaScript syntax / patch checks | PASS after final M1 changes: JavaScript syntax checks, including `game.js`, `viewmodel.js`, new `timing.js` and the test scripts; `git diff --check` passes. |
| T7 historical reproduction | `work/reproduce-sprint-m1.mjs`, with recorded results copied to `tests/fixtures/sprint-before-m1.json` (base `07a6e8f`): the Build 03 loop switched run/walk 274 times in a 12-second held-sprint test at 60 FPS; its last four seconds cycled FOV ~71.73–72.73°. At 15 FPS, five wall-clock seconds advanced only 3.75 game seconds and walked 13.125m, versus 5s/17.5m at 30/60/120 FPS. Confirms two code defects; it does not prove these account for every perceived jitter on the user's computer. |
| T8 `tests/test-sprint-m1.mjs` | PASS, **34 checks** against production movement/input/camera/collision/message code: 60-second sprint at 15/30/60/120 FPS, all class multipliers, left/right Shift release/restart, turning/normalized diagonals, existing combat gates, repeated jumps, actual map wall stopping/sliding and ground slope, irregular/100–250ms frames, longer-stall cap, camera/weapon pose consistency, pause/reset, host/guest local movement and pose/snapshot handling, and no runtime/HUD/class stamina dependency. Harness substitutes DOM/WebGL/audio/assets transport and disables AI/mission completion; endurance checks use a clear lane, separate collision checks use existing solids. No visual feel, rendered FPS, real pointer capture or full mission claim. |
| T10 `tests/test-diagnostics-m1.mjs` (2026-09-23; rerun on Build 05: 3/3 plus the optional Build 04 baseline check PASS — player movement/camera/weapon trace unchanged by M2) | PASS, **4 checks**: overlay off by default and records nothing while off; a 1,046-frame scripted real-map trace (sprint, turns, wall, fire, aim, reload, jump, strafe, crouch, 15–120 FPS, .4s stall) is bit-identical with the overlay off and on; overlay reports substeps/cap discard/speed/gate/FOV correctly and K saves the dump. Rerun once with `DUSTLINE_BASELINE_GAME` pointing at the original Build 04 `game.js`: bit-identical to it as well (optional 4th check). Mocked DOM/WebGL/transport; real F3 key handling was checked separately in the in-app preview menu (toggle on/off, K dump, `saved()`), not in live gameplay. |
| T11 `tests/test-combatfeel-m2.mjs` (2026-09-23, Build 05) | PASS, **10 checks**: solo body hit → blood (mist + spray), no dust, flinch in the shot direction ending < .25s with the outer transform untouched and the target still hittable; headshot kill → head+kill marker, `head` sound, kill counted, no π/2 roll, fall over time ending ~90° with slide along the shot; Blood off suppresses blood for player and bot hits while flinches and dust remain; bot hits in both directions react along shooter→target and a downed ally stands up unchanged; host path (guest shots, bot hits, host player hit, guest-avatar hit) reacts on the host and emits 5 correct `impact`s plus `hit` {head,kill}; guest replays those host-produced messages in order → blood, flinch, fall, dust, marker/sound, host-avatar reaction, and later snapshots neither roll the body nor alter the in-progress fall; guest Blood off; 5 rounds × 7 kills: every death completes, all ≥140 effect geometries/materials disposed, scene child count constant, reset stands everyone up; AutoQuality: 60 FPS steady, isolated 3s hitches ignored, sustained 30 FPS steps to .75 floor, recovers after two fast windows to the Auto max, 42–55 FPS holds; in game: no sampling in menu, pause or host pause, Performance fixed. Mutation check: forcing the snapshot roll, ignoring the Blood setting, dropping `impact` sends, or averaging instead of median each make T11 fail. Mocked DOM/WebGL/audio/transport: appearance and real WebRTC not verified. |
| T12 `tests/test-combatfeel-m3.mjs` (2026-09-23, Build 06) | PASS, **16 checks**: kill alert text-only with no marker class/text/style change on kill (CSS selectors pinned to `#hit`, `#hit.head`, `#killalert`), only for your own kills, cleared on reset; blood sizes/counts vs Build 05 and head > body through the real hit path; headshot rule pinned (1.45 → upper, 1.4501 → head, horizontal shots 38 vs 110 damage); zoom keeps sprites in proportion; wall decals on the face plane, floor decals on the exact terrain, no overhang on box faces, never on surfaces buried under the ground, instance matrices match records; cap 40, oldest retired first, zero BufferGeometry/Material created over 260 hits, cleared by reset and menu; Blood off suppresses spray and decals and hides existing ones; host sends decals regardless of its own setting, guest replays identical decal sets including human wounds; death variant table, real-hitScan kills choose the right variant, distinct poses, spin direction, fall away from the shooter at six facings through the real path and at 12 directions × 4 zones, bodies rest within −7/+20 cm of the ground (falls dip ≤ 20 cm); guest uses the host's yaw so both peers play the same death; seeded `rand()` untouched (Blood on/off identical real-AI outcome); one or all AI allies down never end the mission and regroup at 15 s at the regroup point; failure text names the victim for solo, host and guest. **Mutation check: 42 deliberate breakages, 42 caught** (18 original + 23 from the review + 1 re-run after strengthening). Mocked DOM/WebGL/audio/transport. |
| T11 update (Build 06) | Three adaptations, assertions otherwise unchanged: blood counted from the pooled particle stats (no per-hit objects any more); the kill-marker assertions became kill-alert assertions (user asked for the marker change to be removed); impact count now separates the new decal-only `t:'guest'` message; tracer-only object count. |
| T9 `tests/test-framefire-m1.mjs` | PASS, **24 checks** against production frame/input/receive code: Assault/Support/Medic in solo/host/guest retain one automatic shot per rendered frame while full .25s movement and timers advance; immediate click/cooldown/reload behavior stays intact; eight guest slow-frame shots replayed into host at simulated .25s intervals are all accepted. Prevents backfilled shot bursts introduced by substepping. Message transport is an in-memory collector/replay, not WebRTC, packet latency or jitter. Very low FPS still reduces automatic firing cadence as before. |

**Measured code-only baseline (T2, this run):** 682 scene meshes, 167,500 triangles, 228 shadow-casting meshes, 198 collision solids, 271 raycast occluders. These are traversed scene inventory, not visible frame draw calls. CPU microbenchmarks: one LOS query ~0.031ms, AI tick ~0.019ms, route to office ~0.203ms. Short synthetic runs vary with machine load and are not gameplay/FPS targets. Current GPU FPS, frame-time percentiles, device load, full-route playtime and long-session memory remain **UNVERIFIED**.

### Original requirements: preserve verified foundations

| Requirement | Status and checked scope | Remaining acceptance |
|---|---|---|
| First-person team game in fictional mountain-valley setting | DONE for existing implementation: E2/E6/E7 and T2 show first-person camera/combat, Viper AI squad and Kohar Valley; real co-op code is E4. | Overall realism and team-game quality remain open. |
| Trackpad look, hidden cursor, unrestricted yaw | DONE for code lifecycle: mouse relative deltas only with pointer lock; yaw has no clamp; loss/denial pauses, T2 verifies state/cursor gates. | Real continuous turning in target browser is UNVERIFIED. Embedded preview previously denied lock; do not restore edge-limited invisible cursor fallback. |
| Select a class and different loadout when deploying | DONE for four existing variants: E2/E6 and T1. | New weapon families/extra classes are later PLAN scope. |
| Enterable buildings and routes beyond one straight alley | DONE for code geometry inventory: twelve buildings, open front/back door gaps, furnished interiors and side streets/market/cover (E7). | Full collision/navigation walkthrough remains UNVERIFIED. |
| Story and multiplayer | DONE for implemented foundation/inspection: E3/E4; original content preserved. | Full mission completion and current live co-op remain UNVERIFIED; no claim of matchmaking/PvP. |
| Fire again after reload | DONE: T1 repeated cycles and T2 integrated post-reload state pass. | Preserve these regressions while changing combat. |
| Unlimited sprint with no resource restriction or related interface/perks | DONE: Build 04 code scope (E5/T8/T9) and user playtest acceptance 2026-09-23: "sprint jitter is gone in Safari on Build 04". No runtime or HUD stamina state; existing class multipliers and aim/fire/reload/crouch/heal interruptions unchanged. | Live co-op movement is tracked under M11.09/QA-01. |
| Reload/jump/crouch animation, realistic people/guns/buildings | TODO: animation/model code exists and T2/T4/T5 pass finite-state checks. | Visual quality/photorealism is not complete; M5. |
| Less lag and a less crowded HUD | TODO: renderer/AI optimizations and M-toggle tactical details exist (E7/E2). | Current responsiveness/readability needs observed play. |
| A way to leave | DONE for code behavior: P/Esc pause, L leave, menu buttons; T2 confirms pause/reset/leave and capture-release state. | Target-browser UX remains part of M6 verification. |

### Open issues and dependencies

| ID | Status | Evidence / next action |
|---|---|---|
| MOV-01 | DONE — user playtest acceptance 2026-09-23 | Earlier observation, verbatim: "I played Build 04 in a real browser. Sprinting is fine for a few seconds, then I slow down and the view shakes." Later user report: "sprint jitter is gone in Safari on Build 04". The stamina threshold oscillation (T7) is removed and T8/T9 pass. The earlier symptom's specific cause was not isolated (no F3 dump supplied); candidate PERF-01 is now fixed. Reopen with an F3 dump if it returns. |
| MOV-02 | DONE for frame-time handling/code regression | T7 reproduced the old `.05s` cap losing 25% of simulation time at 15 FPS. E5/T8 now process at most 1/60s per simulation step, preserving movement through .25s frames and bounding longer stalls at .25s. Camera/weapon damping and separate base pose reduce frame-rate-dependent offsets. T9 preserves one automatic firing attempt per rendered frame and rejects no normally spaced replayed guest shots. This does not make very low rendering rates visually smooth; GPU/real-network acceptance is pending. |
| NAV-01 | TODO | Collision/navigation are planar; jumping changes camera/vertical offset, not a 3D stair/platform collision system. Required prerequisite for rooftop routes; do not scope a whole vertical-map rebuild into the sprint fix. |
| AI-01 | UNVERIFIED | Cached LOS may outlive a target moving behind cover before the next shot. Reproduce/tighten in combat/bot task; do not claim tested shots through walls. |
| NET-02 | TODO | Remote jumping is not represented in transmitted pose: `player.y` stays at ground height while `jumpY` changes camera height. Local jump exists, but synchronized teammate jump visuals need work. |
| DOC-01 | DONE | README now correctly describes public visitor access, private exchanged co-op codes, Build 04 unlimited sprint, existing interruption rules, timestep limits and project-local regression commands. H1 public access was reconfirmed before publication. |
| PERF-01 | DONE (code, Build 05); no stutter in the user's Build 05 playtest | `AutoQuality` in `optimization.js`: median frame time over 5 s of active play, no sampling in menus/pause/host pause, steps down below 42 FPS and back up after two windows above 55 FPS. Verified by T11. |
| NET-03 | DONE (code, Build 05/06); live WebRTC UNVERIFIED | Build 06 adds to `impact`: `zn` (hit zone), `ry` (victim yaw at the hit, so the guest picks the same death), `dc` (decal `[x,y,z,nx,ny,nz,size,roll]`, rounded to 1e-4 and applied identically by host and guest), and a decal-only `{t:'guest', p, dc}` for hits on the guest's own avatar. The host's `end` reason is written from the guest's point of view. Build 05: Host is authoritative for character hits and sends `{type:'impact', t, p, d, head, kill}` per hit: `t` = non-remote actor index 0–9, `'host'` (host player, shown on the guest's teammate avatar) or `'surface'` (dust, `p` only). The `hit` reply now carries `head` and `kill`. Snapshots keep HP authority but no longer set `rotation.z`; the guest starts a kill's fall on the impact and treats HP ≤ 0 as dead. Guest-avatar hits are not echoed (first-person). Mixed builds degrade: a Build 04 guest ignores `impact` and still rolls; a Build 05 guest of a Build 04 host shows a default backward fall with no blood. Both players must run the same build (README/CLAUDE.md). T11 replays host-produced messages; no live two-browser test. |
| KILL-01 | DONE — intentional, do not change (re-confirmed by the user for Build 06) | Only player hitscan kills increment `kills` (solo player, host player and guest shots via the host). Ally-bot kills deliberately do not count. Confirmed by the user 2026-09-23; this is not a bug to "fix". |
| PERF-02 | TODO — found, not fixed (measured) | Hit and line-of-sight rays test all 64,800 terrain triangles whenever they point downward (no BVH): ~3.7 ms per ray headless; `hitScan` ~6.2 ms per shot. In the Chromium pane on the M1, frames containing a player shot reach ~17.5 ms p95 (7.4 ms otherwise), i.e. over the 60 Hz budget on shot frames; AI `visible()` rays cause headless p95 13.7 ms / p99 24 ms spikes. The user saw no stutter in Safari, so confirm with the F3 overlay (CPU sim ms while firing) before fixing. Likely fix: keep the terrain out of ray lists and use the analytic `terrainAt` march for terrain hits. |
| AI-02 | TODO — found, not fixed | Enemy spawn (12,−17) in `reset()` lies inside the low wall at (11,−17): `blocked()` is true there and that enemy never moves (verified 120 s with real AI). |
| NET-04 | TODO — found, not fixed | `PeerSquad` treats RTCPeerConnection state `disconnected` (often transient) as final and ends the co-op mission; `receive()` accepts an `end` message without checking the sender's role (a guest can end the host's mission). |
| HUD-01 | TODO — found, not fixed | The co-op teammate has no row or health in the squad HUD, and the guest's HUD can still show a few HP when the host's `end` arrives (no own-death state on the guest). Build 06 end text now says who died. |
| QA-01 | UNVERIFIED | Current real pointer capture, GPU performance, complete story/skirmish and live co-op acceptance remain pending. Screen/audio permission is not a game requirement; do not re-request desktop recording merely to test. |
| NET-01 | BLOCKED for reliable relay-dependent connections only | No TURN relay/service credentials. Direct Google-STUN peer connections are implemented; success across restrictive NAT/firewalls is not guaranteed. This does not block solo or all co-op testing. |
| SAVE-01 | TODO | No local save/profile schema. M9 is prerequisite for checkpoints/progression and later cloud sync. |
| AUTH-01 | TODO | No chosen/configured authentication provider or save backend. Choose/integrate one during M11, then record exact required account/credential setup. Do not claim credentials are currently blocking code that has not been designed. |
| ART-01 | TODO | Characters/hands/props remain procedural; no pending external asset delivery. Select suitably licensed replacements within the visual milestone; do not call current graphics photorealistic. |

**Supplied checklist classification:** 120 items; DONE: 17, TODO: 62, IN PROGRESS: 0, BLOCKED: 0, DEFERRED: 24, UNVERIFIED: 17 (updated 2026-09-23 for M1.02, M2.03, M2.04, M2.05). User-added items are counted separately: M5.09, M7.10 and section 15 (F.01–F.09). These counts exclude the supplemental original-requirement/issue tables and the user-added M7.10 (TODO, 2026-09-23). No whole gameplay milestone is marked complete.

## 0. Inspect and establish the baseline — UNVERIFIED

- [x] **M0.01 · DONE · SETUP** — Identify engine/framework, project structure, run instructions, and relevant checks.
  - Existing / verification / remaining: E1: inspected the static ES-module project, Three.js r169, entry point, run instructions and existing checks; see baseline below.
- [x] **M0.02 · DONE · SETUP** — Inventory working, partial, missing, and broken features against this tracker.
  - Existing / verification / remaining: All 120 supplied checklist items classified below; implemented portions are recorded separately from gaps and playtest uncertainty.
- [x] **M0.03 · DONE · SETUP** — Verify what Story, Skirmish, and Private Co-op actually do.
  - Existing / verification / remaining: E2/E3: inspected actual mode handlers and objective state machine, not just labels. Story and co-op use route-log → relay → extraction; Skirmish uses a 45-second relay hold. Full playthrough remains UNVERIFIED.
- [x] **M0.04 · DONE · SETUP** — Establish whether multiplayer is real networked play, bots, or an unfinished interface.
  - Existing / verification / remaining: E4/T3: real RTCPeerConnection data-channel implementation with host simulation, guest inputs and snapshots, plus AI bots. It is experimental two-human co-op, not matchmaking or competitive multiplayer.
- [ ] **M0.05 · UNVERIFIED · SETUP** — Record current performance and a short playable baseline.
  - Existing / verification / remaining: CPU/scene baseline and T2 simulated gameplay are recorded above; M1 sustained-sprint code checks pass T8. Current browser/GPU FPS and a human-played full mission remain unmeasured.
- [x] **M0.06 · DONE · SETUP** — Identify asset, authentication, hosting, and other external dependencies.
  - Existing / verification / remaining: E1/E4/E8/H1: bundled graphics and Three.js; browser WebGL/pointer capture/audio; Sites public hosting; Google STUN for co-op; no game-account or save backend. TURN is absent.
- [x] **M0.07 · DONE · SETUP** — Select the next bounded milestone; avoid rebuilding completed systems.
  - Existing / verification / remaining: Selected M1 sprint stability; its code scope is now complete under the updated unlimited-sprint requirement. Next bounded work is M1 target-browser/live co-op playtest acceptance, preserving story, four classes and co-op.

## 1. Movement stability — DONE (user acceptance 2026-09-23; M1.04 stairs/mantling DEFERRED by scope)

**Current ORIGINAL requirement:** sprint indefinitely while Shift + forward is active and existing movement/combat rules permit it. There is no stamina meter, exhaustion, recharge delay or stamina-based speed change. Preserve aiming, firing, reload, crouch, healing, story, four classes, bots, co-op and pointer controls. Do not add stairs, mantling or unrelated features. Code implementation is complete; the milestone remains UNVERIFIED until human camera/movement feel and supported live co-op acceptance are checked.

- [x] **M1.01 · DONE · ORIGINAL** — Implement unlimited sprint and fix the reproduced sprint/timing causes.
  - Existing / verification / remaining: T7 reproduced the former `>1` stamina threshold oscillation and `.05s` frame cap. E5/T8 remove all runtime resource dependencies and the meter/style/text, keep sprint active indefinitely, and process movement in bounded substeps. All four speed multipliers are unchanged; no stamina class perk existed to replace. T9 prevents substeps from backfilling automatic shots and preserves click/reload/cooldown behavior. This marks the confirmed code causes and requested removal complete, not a claim that every perceived jitter is eliminated.
- [x] **M1.02 · DONE · ORIGINAL/PLAN** — Verify camera stability and walk/sprint transitions.
  - **Accepted 2026-09-23 by user playtest:** "sprint jitter is gone in Safari on Build 04". Earlier the same day it was reopened: User observation, verbatim: "I played Build 04 in a real browser. Sprinting is fine for a few seconds, then I slow down and the view shakes." Diagnosis only so far: E10 lists candidate mechanisms and the F3 overlay (T10) records per-frame FPS, frame time, substeps, cap discard, render scale/pixel ratio, sprint gate, target and measured speed and FOV. Awaiting overlay numbers from a real sprint.
  - Earlier record: DONE code subpart: T8 checks release/restart, direction changes, combat gates, finite camera poses, equal-time FOV/weapon positions, bob settling and pause/reset. FOV/recoil and weapon roll/pitch use time-based damping; independent weapon base pose avoids accumulated offsets. Human feel, trackpad turning while sprinting, rendered frame pacing and live co-op motion/latency remain UNVERIFIED. No screen/audio recording was requested.
- [x] **M1.03 · DONE · ORIGINAL/PLAN** — Verify the scoped movement code: jumping, diagonal speed, walls, slopes and varying frame rates; stairs excluded.
  - Existing / verification / remaining: T8 passes 34 headless production-code checks, including 60 seconds at 15/30/60/120 FPS, all classes, diagonal normalization/turning, repeated jumps, existing wall stopping/sliding, ground slope, irregular frames, .1–.25s stalls, longer-stall cap, and host/guest pose/snapshot handling. T9 adds 24 combat-timing checks. Clear-lane endurance substitutes colliders; separate wall/slope checks use production geometry. These verify code behavior, not GPU FPS, an exhaustive corner/navigation sweep or actual WebRTC. Human acceptance remains M1.02/QA-01; remote jump visuals remain NET-02.
- [ ] **M1.04 · DEFERRED · ORIGINAL/SUGGESTION** — Preserve crouching; defer new stairs, mantling and associated routes.
  - Existing / verification / remaining: Existing crouch gate, damped height and reset behavior are retained and code-tested in T2/T8. New stair/platform/mantle traversal remains absent and is explicitly outside the user's M1 scope; defer that work to a separately authorized navigation task (NAV-01). Human crouch feel stays in M1.02 acceptance.

## 2. Combat feel and feedback — TODO (Build 06: M2.03, M2.04 and M2.05 DONE; M2.01 hit-confirmation subpart done; M2.02 open)

- [ ] **M2.01 · TODO · ORIGINAL/PLAN** — Improve aiming, recoil, reload timing, muzzle effects, and hit confirmation.
  - Build 06 correction (user playtest): the kill-specific marker change is removed. One subtle neutral marker (26 px, off-white, light shadow) for any hit; headshots tint it red; kills add a small text-only "ENEMY DOWN" alert under the crosshair for 1.6 s with a plain .25 s opacity fade (no flashing or scaling), only for your own kills (guest via the `hit` reply). Reset clears marker and alert. T12.
  - Build 05 subpart DONE (code): hit confirmation. Two-tone `head` / single `confirm` triangle tick (respects the Audio toggle); marker enlarged (34px, bold, shadowed), red for headshots and scaled on kills, shown immediately. Guest gets the same via the extended `hit` reply (T11). Aiming, recoil, reload timing and muzzle polish untouched and still need playtest-driven work; weapon balance unchanged.
  - Existing / verification / remaining: E6/T1/T2/T5: ADS, recoil, fire cadence, magazine reloads, muzzle light/flash and hit marker exist; reload completion is verified. Further feel/timing polish needs playtesting; do not replace the working WeaponState.
- [ ] **M2.02 · TODO · PLAN** — Add clear damage direction and restrained, adjustable camera shake.
  - Existing / verification / remaining: E6: non-directional red vignette and recoil exist. No attacker-direction indicator or camera-shake adjustment.
- [x] **M2.03 · DONE · PLAN** — Add brief hit splatter and a blood-effects setting.
  - Build 06 (user playtest: "blood is too small… no blood on surfaces"): blood is now pooled in `dist/effects.js` (three fixed Points pools + one InstancedMesh; no per-hit allocation, constant draw calls, empty pools hidden). Body hit: 30 droplets + 6 back-spatter + 5 mist sprites (.62 m); headshot: 54 + 10 + 7 larger sprites (1.0 m); sideways spread .75–.93 m (body) and 1.3–1.8 m (head) after .25 s, vs ~.3 m in Build 05. Emitted 15 cm toward the shooter so the torso does not hide it; dark linear colours so it does not glow; sprite size follows zoom. Persistent decals: a wall/solid up to 2.5 m behind along the shot, else the floor 0.35–1.15 m behind (higher of the exact terrain triangle and any floor/table/cover top); oriented to the surface, clamped inside box faces, never on surfaces buried under the ground; head decals larger; cap **40**, oldest retired first; cleared by mission reset and the menu. Every character hit including the human players leaves the same decal on both peers via the co-op `impact` message. The Blood checkbox suppresses spray and decals at spawn and hides existing ones when turned off. T12, B1; browser screenshots checked at 6 m and 15–40 m (Chromium pane). Safari appearance unverified.
  - Build 05: every character hit (players and ally bots on enemies, enemies on allies, the co-op teammate avatar; not the local first-person view) spawns a dark mist (.24s) and a 10-droplet gravity spray (.35s), both disposed by the existing effect loop; cosmetic randomness uses `Math.random`, not the seeded gameplay RNG. "Blood" checkbox beside Audio, on by default, read at spawn time for local and replayed hits. T11 verifies spawning, suppression, co-op replay and disposal; appearance is not yet playtested.
  - Existing / verification / remaining: E6: surface-impact dust exists; no character blood splatter or blood setting.
- [x] **M2.04 · DONE · ORIGINAL/PLAN** — Add directional hit reactions and natural falling/death animations or supported ragdolls.
  - Build 06 (user playtest: "every death plays the same animation"): six authored variants chosen deterministically by body location and shot direction relative to the victim's facing: headshot → **collapse** (legs give way), front chest → **stagger** (steps back, arms up, falls backwards), chest from behind → **pitch** (buckles, falls forward), chest from the side → **spin** (turned by the impact), abdomen → **doubleover**, legs → **crumple** (drops to the knees first). All tilt toward the shot direction, so the body always ends away from the shooter; durations .75–.95 s. As the body reaches the ground it settles into a flat rest pose lifted by its thickness on the grounded side, so limbs and rifle stay on the ground (Build 05 sank up to 0.77 m). Hit zones: head > 1.45 m (unchanged headshot rule), upper > 1.0, lower > .72, legs. Guests receive zone and victim yaw in the impact. No physics or ragdoll. T12.
  - Build 05 (`characters.js` `react`/`reset`/`state`): non-lethal hits push the torso and rig away from the shooter for .22s, visual only (outer transform, AI and hitboxes unaffected). Kills play an authored fall: the rig pivots at the feet toward the shot direction with accelerating rotation over .62s, a slide of .22–.60m (stronger for headshots), and a .2s settle bounce; the instant π/2 roll and +.2m lift are removed. Bot hits use chest height and shooter→target direction, never headshots. Allies still stand up instantly at the 15s regroup (unchanged). No physics/ragdoll. T11 verifies direction, timing, completion, co-op replay and snapshot non-interference; visual quality needs playtest.
  - Existing / verification / remaining: E6/E7: limbs blend toward a downed pose, but game logic immediately rolls the whole actor by π/2. No directional hit reaction, momentum fall or ragdoll.
- [x] **M2.05 · DONE · PLAN** — Bound body/effect lifetimes and check performance.
  - Build 06: measured (B1) — blood + decals cost 0.03–0.07 ms per frame of GPU/whole-frame time on the user's M1 at 8.6–47.6 hits/s, +4 draw calls total, no per-hit allocation, no recompile hitch; lifetimes bounded (particles ≤ 1 s, decals capped at 40, bodies bounded by 7 enemies until reset). Limits: Chromium pane, not Safari; no long-session soak. The dominant combat frame cost is PERF-02 (terrain raycasts), not effects.
  - Build 05 subpart: blood effects are bounded (.24s/.35s) and T11 shows no geometry/material or scene growth over 5 × 7 kills with reset. GPU cost of blood under sustained automatic fire and long-session memory remain unmeasured.
  - Existing / verification / remaining: E6: tracers expire after .05s and dust after .32s; expired effect geometry/materials are disposed and reset clears them. Enemy bodies remain until reset but count is bounded by seven enemies. No long-session memory/performance measurement.

## 3. Weapons and equipment — TODO

- [ ] **M3.01 · TODO · PLAN** — Functional primary, secondary, melee, lethal, and tactical slots.
  - Existing / verification / remaining: E6: one class-specific primary only; no secondary, melee, lethal or tactical equipment slots.
- [ ] **M3.02 · TODO · ORIGINAL/PLAN** — Distinct weapon options with meaningful strengths and weaknesses.
  - Existing / verification / remaining: Four parameterized MK4 primary variants exist (E6/T1); proposed rifle/SMG/shotgun/LMG/precision families, two secondaries and two melee choices are absent. All current primary visuals share one adapted M4A1 model.
- [ ] **M3.03 · TODO · PLAN** — Reliable switching, ammunition, reloading, pickups, and melee range/cooldown.
  - Existing / verification / remaining: DONE subpart: primary ammunition/cooldown/reloading passes T1/T2. Switching, pickups, melee range and cooldown do not exist.
- [ ] **M3.04 · TODO · PLAN** — Frag grenades with readable throws, fuses, falloff, and cover interaction.
  - Existing / verification / remaining: No grenade entities, throw/fuse/explosion/damage-falloff or cover-aware blast code found in authored runtime modules (E9).
- [ ] **M3.05 · TODO · PLAN** — Flashbangs with distance/facing/visibility effects and reduced-intensity setting.
  - Existing / verification / remaining: No flashbang or distance/facing/visibility impairment model or reduced-intensity setting (E9).
- [ ] **M3.06 · TODO · PLAN** — Smoke that obscures player visibility and bot targeting.
  - Existing / verification / remaining: No temporary obscuring smoke or bot smoke-perception rule. Decorative atmospheric dust is not tactical smoke (E7/E9).
- [ ] **M3.07 · TODO · PLAN** — Grenade counts, resupply, sounds, and visual feedback.
  - Existing / verification / remaining: No grenade inventory, resupply, grenade audio or HUD counts (E9).
- [ ] **M3.08 · DEFERRED · SUGGESTION** — Suggested: limited attachment system with handling tradeoffs.
  - Existing / verification / remaining: Optional attachment customization postponed until weapon slots/options are implemented. Existing class optics/drum are fixed fittings, not an attachment system.
- [ ] **M3.09 · DEFERRED · SUGGESTION** — Suggested: firing range for testing equipment.
  - Existing / verification / remaining: No firing range. Optional separate range postponed until core movement/combat is stable; existing checks should be reused meanwhile.

## 4. Classes — TODO

- [ ] **M4.01 · TODO · PLAN** — Expand beyond the existing four classes.
  - Existing / verification / remaining: Exactly Assault, Marksman, Support and Medic exist (E6). More classes are absent; preserve these four. Eight is the attached plan target; exact roster/roles remain proposed in the master roadmap.
- [ ] **M4.02 · TODO · ORIGINAL/PLAN** — Give every class an implemented advantage, understandable tradeoff, and clear description.
  - Existing / verification / remaining: DONE subpart: all four have wired ammo/fire mode/reload/damage/speed/zoom/armor/bandage differences and UI descriptions (E6/T1). New-class advantages and full roster tradeoffs are pending.
- [ ] **M4.03 · TODO · PLAN** — Implement ability cooldowns, indicators, and supporting mechanics.
  - Existing / verification / remaining: Shared 3.2-second self-bandaging and weapon cooldown exist. No class signature abilities, teammate revive ability, ability cooldown HUD, spotting, repairs or ammo resupply (E6/E9).
- [ ] **M4.04 · UNVERIFIED · PLAN** — Verify balance and usefulness in solo, squad, and objective play.
  - Existing / verification / remaining: Configuration differences are inspected; actual solo, squad and objective usefulness/balance have not been playtested systematically.

Proposed eight-class roster: Assault, Medic, Support, Recon, Engineer, Breacher, Marksman, Heavy. Adapt existing classes rather than duplicating them. Proposed roles include weapon handling, healing/revives, ammunition, spotting, repairs/cover, close-range utility, precision, and protection respectively.

## 5. Visual benchmark — TODO

- [ ] **M5.01 · TODO · ORIGINAL/PLAN** — Polish one representative map before expanding the full roster.
  - Existing / verification / remaining: One Kohar Valley map exists. It has prior material/model improvements, but no accepted visual benchmark or current comparable playtest; user still requests greater realism.
- [ ] **M5.02 · TODO · ORIGINAL** — Improve lighting, shadows, materials, texture scale, geometry, cover, and landmarks.
  - Existing / verification / remaining: E7: HDR sky/environment, sun/static shadows, PBR ground/walls, cover, stalls, truck props and side routes exist. Photograph-like quality, material scale and landmark readability remain unverified and need focused polish.
- [ ] **M5.03 · TODO · ORIGINAL** — Improve character proportions, silhouettes, clothing, gear, and animation.
  - Existing / verification / remaining: E7/T4: modern procedural gear, 28/29 meshes per actor and articulated hips/knees/arms exist; finite poses verified. People remain procedural rather than photographic; silhouette/animation quality needs visual assessment.
- [ ] **M5.04 · TODO · ORIGINAL** — Improve first-person hands and weapons.
  - Existing / verification / remaining: E7/T5: licensed textured rifle, separate magazine/charging handle, class fittings and procedural gloved hands exist; all four reload transform sequences finish correctly. Hand contact, aim alignment and visual quality need playtesting.
- [ ] **M5.05 · UNVERIFIED · ORIGINAL/PLAN** — Maintain clear target visibility and cohesive art direction.
  - Existing / verification / remaining: No current visual comparison or target-visibility evaluation. Do not infer visual quality from working asset loaders.
- [ ] **M5.06 · UNVERIFIED · PLAN** — Add appropriate graphics options and compare performance before/after.
  - Existing / verification / remaining: DONE subpart: Auto, High, Performance modes and adaptive render scale are wired (E7); batching, cached shadows and staggered AI exist. GPU performance before/after is unmeasured; CPU microbenchmarks below are not FPS.
- [x] **M5.07 · DONE · PLAN** — Record asset licenses/attribution and unresolved asset needs.
  - Existing / verification / remaining: E8: inspected bundled license/credits and matching asset files. Three.js MIT; listed Poly Haven materials/HDR and OGA M4A1 credited CC0. Remaining needs: better character/hand art and map props, not a known unavailable license. Licensor pages were not re-audited this setup.
- [ ] **M5.08 · UNVERIFIED · PLAN** — Capture comparable before/after views where possible.
  - Existing / verification / remaining: Earlier user screenshots are qualitative references only. No matched camera/settings before/after captures. Desktop screen-access testing stays stopped per user preference.

- [ ] **M5.09 · TODO · ORIGINAL (user request 2026-09-23) · not started** — Breakable props (crates, fruit stalls, containers) whose contents fall and roll, without a physics engine.
  - Investigation only (E13). Options: **A** cosmetic break (hide prop, broken state, short ballistic debris; remove solid/occluder, re-check nav cells, one shadow refresh) ~3–4 dev-days; **B** A + lightweight custom kinematics for contents (spheres on the analytic terrain and box AABBs, rolling at v/r, friction, sleep, no body-body contact; host sends break id + seed, contents cosmetic) ~5–7 dev-days — **recommended**; **C** vendored physics library (cannon-es/Rapier/ammo) 10–15 dev-days, poor fit with the 2D collision/nav/co-op model; **D** pre-baked spill clips 4–6 dev-days, repetitive. Required regardless: make props hideable (instancing or per-prop vertex ranges instead of `batchStatic` merging), world restore in `reset()`, a co-op break message + snapshot bitmask, shadow refresh policy. "Containers" (barrels, jars) do not exist yet and would be new art.
  - Decisions needed before building: which props break; what breaks them (player bullets only? hits to break?); whether broken cover still blocks movement or LOS; contents cosmetic only (recommended) or pickups; how long contents persist; shadow refresh vs stale shadows; rendering approach.

## 6. Menus and onboarding — TODO

- [ ] **M6.01 · TODO · PLAN** — Home: quick launch, continue story, Ambush, recent unlocks.
  - Existing / verification / remaining: E9: a single deployment menu exists; no Home tab, Continue Story, Ambush launcher or recent-unlock panel.
- [ ] **M6.02 · TODO · PLAN** — Play: mode, map, difficulty, bots, and team settings.
  - Existing / verification / remaining: E2/E9: mode and class selection work in code. No map, difficulty, bot-count or team configuration.
- [ ] **M6.03 · TODO · PLAN** — Operations: briefings, missions, unlocks, and saved progress.
  - Existing / verification / remaining: A fixed story briefing exists; no Operations browser, mission unlocks or persisted operation progress (E2/E9).
- [ ] **M6.04 · TODO · ORIGINAL/PLAN** — Loadout: classes, weapons, attachments if implemented, and equipment.
  - Existing / verification / remaining: Four-class deployment selector exists; no dedicated Loadout tab, multi-slot equipment or attachment selection (E6/E9).
- [ ] **M6.05 · TODO · PLAN** — Locker: owned cosmetics, previews, and equipping.
  - Existing / verification / remaining: No owned cosmetic inventory, model preview/equip UI or Locker (E9).
- [ ] **M6.06 · TODO · PLAN** — Profile: level, statistics, achievements, and challenges.
  - Existing / verification / remaining: Only current-run kills/time exist; no persisted level, achievements, challenges or Profile tab (E9).
- [ ] **M6.07 · TODO · PLAN** — Separate Settings and Account controls.
  - Existing / verification / remaining: Sensitivity/audio/graphics/fullscreen controls are embedded in deployment. No separate Settings or Account controls (E9).
- [ ] **M6.08 · TODO · PLAN** — Explain every mode in plain language; label unavailable features honestly.
  - Existing / verification / remaining: Story/Skirmish briefings and experimental co-op/STUN/network caveats are present (E2/E4). M1 corrected the stale private-Site README wording (DOC-01) and documents unlimited sprint/interruption rules. Broader onboarding and future-mode explanations remain pending; unavailable modes must not look functional.
- [ ] **M6.09 · UNVERIFIED · ORIGINAL** — Verify launch, pause, return-to-menu, and navigation flows.
  - Existing / verification / remaining: DONE subpart: T2 verifies launch/capture success/failure, pause, resume, reset and leave state transitions. Browser navigation, sustained pointer capture and fullscreen on target hardware remain unverified.
- [ ] **M6.10 · DEFERRED · SUGGESTION** — Suggested: separate mode choice from Solo/With Friends where appropriate.
  - Existing / verification / remaining: Current co-op is a mode tab. Separating mission choice from Solo/With Friends postponed to the menu milestone; preserve existing hosting/joining behavior.
- [ ] **M6.11 · DEFERRED · SUGGESTION** — Suggested: short playable tutorial and deployment screen instead of an overcrowded home page.
  - Existing / verification / remaining: A briefing/deployment screen and compact optional tactical HUD exist (E2/E9). No playable tutorial; defer onboarding expansion until movement and match rules are stable.

## 7. Casual battles and bot behavior — TODO

- [ ] **M7.01 · TODO · ORIGINAL/PLAN** — Preserve configurable casual play against bots.
  - Existing / verification / remaining: Skirmish against fixed bots exists; map, bot count, team and difficulty options are absent. Preserve the current mode without claiming it is configurable (E2/E6).
- [ ] **M7.02 · TODO · PLAN** — Clear objectives, scoring, timers, victory/defeat, results, and rematch.
  - Existing / verification / remaining: Existing relay hold has progress, victory/defeat, kills/time result and restart handlers. No match-wide countdown, team score rules or spawn protection; menu-to-victory playthrough unverified (E2/E3).
- [ ] **M7.03 · TODO · SUGGESTION/PLAN** — Proposed starting modes: Team Deathmatch and Sector Control.
  - Existing / verification / remaining: No Team Deathmatch or named Sector Control. Existing single-relay Skirmish is a starting point, not proof that both proposed modes exist.
- [ ] **M7.04 · TODO · PLAN** — Bots navigate, use cover, reload, and pursue objectives.
  - Existing / verification / remaining: E6: grid A*, obstacle movement, ally advance/follow/hold and LOS targeting exist. Bots have no ammo/reload state or explicit cover selection; enemy patrol/engagement is not coordinated objective strategy. AI allies are not counted toward relay capture; only human players are.
- [ ] **M7.05 · TODO · PLAN** — Bots respect walls, smoke, flashes, and explosives.
  - Existing / verification / remaining: Walls affect navigation/LOS, but perception is cached for .13–.18s and not rechecked at every shot (E6): possible stale-visibility hits require reproduction. Smoke/flash/explosive systems are absent.
- [ ] **M7.06 · TODO · PLAN** — Difficulty varies reaction and behavior without unfair vision.
  - Existing / verification / remaining: No difficulty setting or selectable bot profiles. LOS is present; absence of unfair vision is not established by a full gameplay test.
- [ ] **M7.07 · DEFERRED · SUGGESTION** — Suggested enemy roles: rushers, marksmen, support, medics.
  - Existing / verification / remaining: No rusher/marksman/support/medic enemy roles. Postpone role expansion until basic bot combat/objectives are verified.
- [ ] **M7.08 · DEFERRED · SUGGESTION** — Suggested: readable silhouettes and audio cues for enemy roles.
  - Existing / verification / remaining: Teams use different cloth palettes and allies have markers; no role-specific silhouette/audio system. Depends on role implementation.
- [ ] **M7.09 · TODO · SUGGESTION** — Suggested squad commands: move, hold, regroup, focus fire, contextual assistance.
  - Existing / verification / remaining: DONE subpart: Q cycles advance/follow/hold with squad destination logic (E6). Point-to-move, focus fire and contextual assistance are absent; do not duplicate the working commands.

- [ ] **M7.10 · TODO · ORIGINAL (user request 2026-09-23)** — Continuously spawning enemies that patrol and reposition rather than holding fixed spots.
  - Existing / verification / remaining: Inspected `game.js` `reset`/`tickAI`: seven enemies spawn once at fixed points in `reset()`, never respawn after death, and idle-wander to a random point within ±4m of their spawn every 6–11s; on sighting a target they stop and fire in place. No spawner, wave pacing, wider patrol routes or tactical repositioning. Not implemented; must respect story pacing, relay capture rules, co-op host authority and performance. Overlaps M8 wave work; decide the relationship when this is scheduled.

## 8. Rooftop Ambush — TODO

- [ ] **M8.01 · TODO · PLAN** — Player and friendly teammates defend a rooftop against surrounding enemies.
  - Existing / verification / remaining: No rooftop defense mode/map or rooftop spawn; three friendly AI exist for current ground-level modes (E2/E7/E9).
- [ ] **M8.02 · TODO · PLAN** — Multiple reachable enemy approaches and reliable navigation.
  - Existing / verification / remaining: Current navigation is planar. Rooftop approaches require stairs/elevation links and a rooftop layout first (E5).
- [ ] **M8.03 · TODO · PLAN** — Full preparation → wave → completion → resupply loop.
  - Existing / verification / remaining: No preparation/wave/completion/resupply state machine (E9).
- [ ] **M8.04 · TODO · PLAN** — Increasing pressure through enemy variety and tactics.
  - Existing / verification / remaining: No wave director, escalating composition or tactical wave variation (E9).
- [ ] **M8.05 · TODO · PLAN** — Between-wave ammunition, healing, weapons, grenades, and defensive upgrades.
  - Existing / verification / remaining: No between-wave supplies, purchases or defensive upgrade system (E9).
- [ ] **M8.06 · TODO · PLAN** — Separate temporary run upgrades from permanent unlocks.
  - Existing / verification / remaining: Neither run-upgrade storage nor permanent unlock storage exists (E9).
- [ ] **M8.07 · TODO · PLAN** — Revives, wave/enemy counts, survival time, defeat, results, and restart.
  - Existing / verification / remaining: Current modes have results/reset and AI auto-regroup. No active teammate revive, wave/enemy HUD or Ambush survival/results flow (E6/E9).
- [ ] **M8.08 · TODO · PLAN** — Recover from unreachable enemies and stuck waves.
  - Existing / verification / remaining: Basic local unsticking exists in current bots; no wave reachability or stuck-wave recovery controller (E6/E9).
- [ ] **M8.09 · UNVERIFIED · PLAN** — Verify at least ten waves and bounded performance in longer sessions.
  - Existing / verification / remaining: No Ambush implementation exists to test. Ten-wave and long-session acceptance is pending, dependent on M8 implementation; no duration/performance claims.
- [ ] **M8.10 · DEFERRED · SUGGESTION** — Suggested: connected interiors and neighboring rooftops.
  - Existing / verification / remaining: Ground-level interiors exist. Connected neighboring rooftops are postponed until vertical navigation and the first Ambush loop work.
- [ ] **M8.11 · DEFERRED · SUGGESTION** — Suggested special events: power failure, breach, exposed supply drop.
  - Existing / verification / remaining: Power failures, breaches and exposed supply events postponed until the basic wave loop works.
- [ ] **M8.12 · DEFERRED · SUGGESTION** — Suggested: extract with run rewards or stay for higher risk/reward; permanent unlocks remain safe.
  - Existing / verification / remaining: Extract-or-stay reward choice postponed until run rewards and permanent progression are implemented; no such economy exists yet.

## 9. Persistent progression and Locker — TODO

- [ ] **M9.01 · TODO · PLAN** — Save XP, level, class unlocks, cosmetics, loadouts, challenges, and statistics.
  - Existing / verification / remaining: No localStorage, IndexedDB, save file/schema or persistent profile implementation in authored runtime code (E9). All current mission values reset in reset().
- [ ] **M9.02 · TODO · PLAN** — Reward supported modes with a clear, understandable progression schedule.
  - Existing / verification / remaining: No XP/reward schedule or reward-grant function; results only report kills/time (E3/E9).
- [ ] **M9.03 · TODO · PLAN** — Prevent duplicate completion rewards and accidental save loss.
  - Existing / verification / remaining: No completion IDs, idempotent reward ledger, save validation or backup/recovery because persistence is absent (E9).
- [ ] **M9.04 · TODO · PLAN** — Unlockable classes remain balanced alternatives; cosmetics do not grant power.
  - Existing / verification / remaining: All four classes are available immediately; no unlock economy or cosmetic power separation to implement/verify yet (E6/E9).
- [ ] **M9.05 · TODO · PLAN** — Earn, preview, equip, and see character/weapon skins during play.
  - Existing / verification / remaining: No earned skin inventory, cosmetic preview/equip pipeline or runtime skin selection (E9).
- [ ] **M9.06 · TODO · PLAN** — Verify progress survives restarting.
  - Existing / verification / remaining: Progress persistence cannot pass: reset/new page initializes the run; no save/load system exists (E9).
- [ ] **M9.07 · DEFERRED · SUGGESTION** — Suggested: reward healing, reviving, defending, and objectives alongside kills.
  - Existing / verification / remaining: Teamwork reward categories postponed to progression design after supported objective/heal/revive events exist.
- [ ] **M9.08 · DEFERRED · SUGGESTION** — Suggested: specific skill/teamwork challenges and weapon mastery rewards.
  - Existing / verification / remaining: Skill/teamwork challenges and weapon mastery postponed until base progression/reward integrity exists.

## 10. Story foundation and opening mission — TODO

- [x] **M10.01 · DONE · ORIGINAL** — Preserve and assess the current convoy/relay/extraction story content.
  - Existing / verification / remaining: E2/E3: inspected and preserved existing convoy/route-log/relay/extraction handlers, briefings, names and radio text. M1 changes movement/timing/interface documentation and leaves this story content intact. This marks preservation/assessment, not a verified polished full mission.
- [ ] **M10.02 · TODO · PLAN** — Reusable briefings, objectives, transitions, checkpoints, retries, and debriefs.
  - Existing / verification / remaining: Hardcoded stages, radio text, failure/restart and debrief exist. No reusable mission definition/checkpoint/retry-at-checkpoint system (E3/E9).
- [ ] **M10.03 · UNVERIFIED · ORIGINAL/PLAN** — Clear next-objective guidance and mission completion rules.
  - Existing / verification / remaining: E3: stage text, distance, tactical-map objective, interaction prompt and progress rules exist. Comprehension/repetition reported by user remains unresolved; no full mission playthrough this task.
- [ ] **M10.04 · TODO · PLAN** — Continue Story restores saved progress.
  - Existing / verification / remaining: No Continue Story UI or persisted checkpoint/mission state (E9).
- [ ] **M10.05 · TODO · PLAN** — Completion rewards and next-mission unlocks work reliably.
  - Existing / verification / remaining: No permanent completion rewards, next mission or unlock state (E9).
- [ ] **M10.06 · TODO · ORIGINAL/PLAN** — Complete and verify one polished opening mission before expanding.
  - Existing / verification / remaining: One opening mission has code, but polished pacing and full briefing-to-extraction success/failure verification are missing. Improve Broken Signal before expanding or replacing it.
- [ ] **M10.07 · DEFERRED · SUGGESTION** — Suggested: changing situations, optional rescues, alternate routes, and later consequences.
  - Existing / verification / remaining: Map has alternate ground routes; optional rescues, changing situations and lasting consequences postponed until the current mission is stable.
- [ ] **M10.08 · TODO · SUGGESTION** — Suggested: recurring named teammates with recognizable personalities and dialogue.
  - Existing / verification / remaining: Reed, Torres and Park are named; Reed/Command radio lines exist. Distinct recurring personalities and consequence-aware dialogue across missions are absent (E2/E3).

## 11. Accounts and online play — TODO

- [ ] **M11.01 · TODO · PLAN** — Real authentication using a suitable maintained service or existing backend.
  - Existing / verification / remaining: No game auth SDK, backend or auth API routes. Sites visitor access is hosting policy, not player authentication (E1/E9/H1). A provider/setup decision is a prerequisite, not a claimed service outage.
- [ ] **M11.02 · TODO · PLAN** — Sign-up, sign-in/out, sessions, and recovery where supported.
  - Existing / verification / remaining: No player sign-up/in/out/session/recovery flow (E9).
- [ ] **M11.03 · TODO · PLAN** — Guest play and explicit guest-progress transfer.
  - Existing / verification / remaining: Anonymous unsaved play is available now; guest profile persistence and transfer do not exist (E9/H1).
- [ ] **M11.04 · TODO · PLAN** — Per-account cloud saves and access controls.
  - Existing / verification / remaining: No save database/API, account ownership rules or cloud-save sync (E9).
- [ ] **M11.05 · TODO · PLAN** — Handle offline play, sync failures/conflicts, and account switching.
  - Existing / verification / remaining: No save queue, conflict resolution, account-switch isolation or offline cache. Locally served assets do not establish offline cloud-save behavior (E9).
- [ ] **M11.06 · UNVERIFIED · PLAN** — Verify isolated saves for two accounts and recovery in another session/device.
  - Existing / verification / remaining: Two-account and cross-device recovery tests cannot run before auth/cloud saves exist. No accounts or credentials were created.
- [x] **M11.07 · DONE · SETUP/PLAN** — Document required external setup without presenting placeholders as working services.
  - Existing / verification / remaining: Dependencies and missing setup recorded below: no provider/database selected, no secrets installed; Google STUN co-op exists, TURN relay does not. No placeholder account service is represented as working.
- [x] **M11.08 · DONE · ORIGINAL** — Inspect and preserve existing multiplayer/co-op behavior.
  - Existing / verification / remaining: E4/T3: inspected real offer/answer data channels, host snapshots, guest commands, pause/disconnect paths and preserved code. Retired/cancelled connection regressions pass; live play remains separately unverified.
- [ ] **M11.09 · UNVERIFIED · ORIGINAL** — Verify supported hosting/joining, synchronized gameplay, and disconnect handling.
  - Existing / verification / remaining: Current-build real two-browser gameplay and external-network synchronization were not tested here. Prior Build02 same-device connection test was reported in task history; it is not current cross-network proof. T3 covers mocks only.
- [ ] **M11.10 · UNVERIFIED · ORIGINAL/PLAN** — Record whether competitive multiplayer is intended and implemented; clarify its scope before adding a new online mode.
  - Existing / verification / remaining: Implemented scope is two-player cooperative story plus bots; competitive PvP/matchmaking/server modes are absent. Original “team game/multiplayer” request does not settle competitive scope; clarify before adding it.

## 12. Campaign and map expansion — DEFERRED

Proposed scope, subject to playtesting: three connected operations, six missions each, targeting 15–25 minutes per mission. Duration must come from meaningful gameplay, not padded encounters. Proposed operation names: Blackout, Broken Line, Last Light. Preserve established lore where it works.

- [ ] **M12.01 · TODO · PLAN** — Write a connected mission roster with objectives, consequences, rewards, and dependencies.
  - Existing / verification / remaining: No multi-mission roster/dependency/reward plan. Preserve Broken Signal and Viper squad before designing a connected expansion.
- [ ] **M12.02 · TODO · PLAN** — Vary rescue, sabotage, escort, defense, recovery, and extraction.
  - Existing / verification / remaining: Current story uses recovery, relay defense/hold and extraction. Rescue, sabotage and escort mission systems are absent (E3).
- [ ] **M12.03 · DEFERRED · PLAN** — Build and verify one map at a time to the visual benchmark.
  - Existing / verification / remaining: Additional maps deliberately wait for M1 movement and M5 accepted single-map benchmark; expansion remains in scope.
- [ ] **M12.04 · DEFERRED · PLAN** — Build and verify one mission at a time to the opening-mission benchmark.
  - Existing / verification / remaining: Additional missions deliberately wait for a polished, checkpoint-capable opening mission (M9/M10); expansion remains in scope.
- [ ] **M12.05 · UNVERIFIED · PLAN** — Verify navigation, collision, sightlines, spawns, objectives, and performance on each map.
  - Existing / verification / remaining: T2 samples active frames and pathfinding only. No comprehensive current-map collision/spawn/sightline/objective reachability sweep, and no new maps exist.
- [ ] **M12.06 · TODO · PLAN** — Verify complete mission flows, checkpoint recovery, and subsequent unlocks.
  - Existing / verification / remaining: No checkpoints or subsequent mission unlocks. Existing mission complete playthrough remains unverified (E3/E9).
- [ ] **M12.07 · UNVERIFIED · PLAN** — Record measured playtime where possible.
  - Existing / verification / remaining: No measured human mission duration. The proposed 15–25 minutes is a target, not observed playtime.

Proposed environments, adaptable to current setting:
- [ ] **M12.08 · TODO · SUGGESTION** — City/village streets.
  - Existing / verification / remaining: Village streets already exist in Kohar Valley; inspect/polish and reuse them, rather than creating a duplicate city map by assumption (E7).
- [ ] **M12.09 · DEFERRED · SUGGESTION** — Rooftops.
  - Existing / verification / remaining: Roofs exist as architecture but are not a playable rooftop map. Needs vertical traversal/AI links and M8 scope.
- [ ] **M12.10 · DEFERRED · SUGGESTION** — Industrial depot.
  - Existing / verification / remaining: No industrial depot map; wait for benchmark and approved campaign plan.
- [ ] **M12.11 · DEFERRED · SUGGESTION** — Subway/tunnel network.
  - Existing / verification / remaining: No subway/tunnel map; compatibility with established valley setting must be decided during campaign planning.
- [ ] **M12.12 · DEFERRED · SUGGESTION** — Communications outpost.
  - Existing / verification / remaining: Current valley has a relay mast, not a separate communications-outpost map. Decide reuse/new-map need in campaign planning.
- [ ] **M12.13 · DEFERRED · SUGGESTION** — Coastal evacuation facility.
  - Existing / verification / remaining: No coastal evacuation map; wait for campaign plan and an explained transition from the existing setting.

Create an individual row for each approved mission here after the campaign plan is established; include status, map dependency, remaining work, and verification.

## 13. Sound and atmosphere — DEFERRED

- [ ] **M13.01 · DEFERRED · SUGGESTION** — Suggested: directional footsteps and identifiable nearby impacts.
  - Existing / verification / remaining: E6: procedural footsteps and hit noise exist without spatial panning; directional treatment postponed until core movement/combat checks.
- [ ] **M13.02 · DEFERRED · SUGGESTION** — Suggested: distinct indoor/outdoor weapon sound treatment.
  - Existing / verification / remaining: One synthesized weapon-sound treatment; no indoor/outdoor acoustics. Postpone until map/combat benchmark.
- [ ] **M13.03 · TODO · SUGGESTION** — Suggested: concise teammate callouts and subtitles.
  - Existing / verification / remaining: DONE subpart: brief text radio captions and squad-order notices exist (E2/E3). Positional/voiced teammate callouts and broader subtitle controls are absent.
- [ ] **M13.04 · DEFERRED · SUGGESTION** — Suggested: environmental ambience and quieter squad moments.
  - Existing / verification / remaining: No dedicated environment ambience or quiet-squad audio system; postpone to the atmosphere pass.
- [ ] **M13.05 · DEFERRED · SUGGESTION** — Suggested: combat-responsive music with suitable volume controls.
  - Existing / verification / remaining: No adaptive music or category volume controls; only a global audio toggle. Postpone until core play is stable.

## 14. Integration, balance, and completion — TODO

- [ ] **M14.01 · TODO · PLAN** — Verify menu → loadout → match → rewards → cosmetic equip → restart/save recovery.
  - Existing / verification / remaining: Current menu → class → mission → result/reset path is implemented; rewards, cosmetics and save recovery links are missing (E2/E9).
- [ ] **M14.02 · UNVERIFIED · PLAN** — Verify Story, casual battles, Ambush, and supported online/co-op flows.
  - Existing / verification / remaining: Brief source-level simulation covers current game; full Story/Skirmish/current co-op playthroughs pending and Ambush absent. Do not mark whole-game integration complete.
- [ ] **M14.03 · UNVERIFIED · PLAN** — Verify all classes, equipment, maps, mission transitions, and settings.
  - Existing / verification / remaining: Four weapon state configurations pass T1; this is not a full classes/equipment/maps/settings matrix, and most planned systems are absent.
- [ ] **M14.04 · UNVERIFIED · PLAN** — Check longer sessions for increasing memory use or performance loss.
  - Existing / verification / remaining: No long-session memory/GPU soak test. Short finite-pose and effect-cleanup checks do not establish long-term stability.
- [ ] **M14.05 · UNVERIFIED · PLAN** — Tune combat, difficulty, mission pacing, and rewards through observed play.
  - Existing / verification / remaining: No systematic observed-play balance/pacing study; rewards/difficulty variants are not implemented.
- [ ] **M14.06 · TODO · ORIGINAL/PLAN** — Resolve incomplete connections and major bugs before increasing scope.
  - Existing / verification / remaining: M1's reproduced sprint/timing code defects are fixed; finish human movement and live co-op acceptance before expanding scope, then address current combat and one mission. Preserve working features and avoid backlog-wide implementation.
- [x] **M14.07 · DONE · SETUP** — Record remaining limitations and external blockers honestly.
  - Existing / verification / remaining: Current limitations, evidence boundaries, missing systems and specific prerequisites are recorded in this tracker; update after every later task.

## 15. Long-term plan (user, 2026-09-23) — not started

Filed from the user's own plan (provenance **ORIGINAL**). Nothing here is implemented. Items restate or reshape earlier PLAN entries; where they differ, these user statements win. Build one bounded task at a time.

- [ ] **F.01 · TODO · ORIGINAL · not started** — Multiple game modes and multiple maps rather than one map every time. Relates to M7, M12 (maps built one at a time to the M5 benchmark).
- [ ] **F.02 · TODO · ORIGINAL · not started** — Story mode that progresses and carries meaning across missions, with mission difficulty scaling to the player's position in the story. **Depends on SAVE-01/M9** (nothing persists today) and on F.07 bot difficulty; relates to M10, M12.
- [ ] **F.03 · TODO · ORIGINAL · not started** — **Ambush mode**: wave-based survival in the style of CoD Zombies; progressively better weapons, healing and equipment earned during a run; **no win condition — the goal is survival duration**. Scope it to **reuse existing Kohar Valley geometry**, not new maps (this supersedes the rooftop-map assumption in M8; reconcile M8 when scheduled). Run-to-run progression depends on SAVE-01/M9; in-run upgrades do not. Relates to M7.10 (continuous spawning/repositioning) and M3 equipment.
- [ ] **F.04 · TODO · ORIGINAL · not started** — **Custom private lobbies**: invite friends, choose map and match settings. Achievable as an extension of the existing peer-to-peer co-op (NET-03/M11.09); **sequence before any 5v5 work**. Same-build requirement and the TURN limitation (NET-01) apply.
- [ ] **F.05 · BLOCKED · ORIGINAL** — **5v5 team modes** (deathmatch, zone control) with casual queues. **Blocker:** competitive 5v5 needs authoritative dedicated servers, player accounts (AUTH-01), matchmaking and anti-cheat; the current WebRTC peer-to-peer co-op (one host simulating, one guest) cannot support ten players or fair authority. Unblocks only after a server/backend decision.
- [ ] **F.06 · DEFERRED · ORIGINAL** — **Ranked** queue for 5v5. Deferred pending F.05 **and** a player population large enough to rank; do not build before both exist.
- [ ] **F.07 · TODO · ORIGINAL · not started** — **Configurable bot difficulty**, one system shared by story difficulty scaling (F.02) and Ambush wave scaling (F.03). Relates to M7.06.
- [ ] **F.08 · TODO · ORIGINAL · not started** — **Practice / firing range**. Supersedes the SUGGESTION M3.09 with a direct user request.
- [ ] **F.09 · TODO · ORIGINAL · not started** — **Objective variety** beyond the current relay-then-extract pattern. Relates to M12.02 and M10.

Dependencies and constraints (keep with the items): **SAVE-01 (save/profile system) is a prerequisite for story progression, unlocks and Ambush progression — nothing persists today.** F.05 is BLOCKED for the reason above, not a normal TODO. F.06 is DEFERRED pending player population. F.04 comes before F.05. F.03 reuses Kohar Valley.

## Recommended next task

**Next: user playtest of Build 06 (M2 acceptance), then PERF-02 if the F3 overlay confirms shot-frame spikes.** Build 06 changes the co-op messages again; both players must run Build 06.

Playtest checklist (full desktop browser, `http://localhost:8765/`, hard refresh; menu must show BUILD 06):

1. Solo Story, Assault, at 15–30 m: body shots show a dark-red cloud and spray you can see at that range; headshots a noticeably bigger one. Nothing should glow.
2. Kill a few enemies: the marker stays the same small neutral × (red only for headshots); "ENEMY DOWN" appears briefly under the crosshair as plain text.
3. Kill from different sides and body areas — head, chest from the front, from behind, from the side, stomach, legs — and check the falls look different and always go away from you. Bodies should lie on the ground, not in it.
4. Look where they fell: blood splats on the ground behind them, or on a wall if one was close behind. After ~40 hits the oldest splats disappear; restarting the mission clears them. Untick Blood: sprays and splats vanish; hits still react.
5. Let an ally go down: the mission continues; it reappears at the regroup point behind the start after 15 s. If the mission ends, the end screen should now say who was killed.
6. Scope in with the Marksman: blood should still look proportionate to the target.
7. Co-op (Safari + Chrome on this Mac): the guest sees the same splats and the same kind of fall as the host, including splats from either player being wounded.
8. With F3 on during sustained fire, note CPU sim ms on shot frames (PERF-02).

Copy-ready next-task prompt:

> Read `DUSTLINE-ROADMAP.md` and `NOW.md`. Here are my Build 06 playtest notes and F3 numbers: [paste]. Fix only evidence-backed Build 06 problems. If shot frames spike, do PERF-02 only: keep terrain out of hit/LOS raycasts using the analytic terrain, with tests proving identical hits and LOS. Preserve story, classes, weapon balance, bots, co-op and pointer controls; never reintroduce stamina.

## Progress log

| Date | Milestone/item | Change | Verification | Remaining work/blocker |
|---|---|---|---|---|
| Initial tracker | All | Captured original requests and proposed additions | Screenshot and conversation only; project not inspected | Establish actual implementation status |
| 2026-09-23 | Setup / all 120 items | Saved and classified the supplied roadmap at the game project root; added provenance, verified foundations, evidence register, issue/dependency list and bounded M1 prompt. Baseline source `07a6e8f4f9bbac0c4b5519916a1aed4248687ea4`; only `DUSTLINE-ROADMAP.md` created. No runtime, story, asset or deployment changes. | T1–T6 PASS with limits above; read-only hosting check H1 confirms public version 3; checklist preservation/classification checked. No browser/screen/live-network test. | Sprint symptom reproduction and fix next; current visual/full-mission/network acceptance remains unverified. Future scope stays queued/deferred as labeled. |
| 2026-09-23 | M1 / Build 04 local implementation; MOV-01, MOV-02, DOC-01 | Based on `07a6e8f4f9bbac0c4b5519916a1aed4248687ea4`. `game.js`, new `timing.js`, `viewmodel.js`, `index.html`, `style.css`, `README.md` and project tests: removed sprint resource and all dependent meter/jump/sway behavior; kept class multipliers and existing combat gates; added ≤1/60s simulation substeps capped at .25s, time-based camera/weapon damping, bob settling/reset and frame-driven automatic-fire gating. No stamina perk needed replacement. Added portable 34-check movement and 24-check frame-fire regressions plus historical baseline fixture; corrected public-access docs and this tracker. Story, classes, bots, co-op protocol and pointer controls preserved; no new traversal/assets/features. Publishing uses the existing public Site; consult its deployment record for the resulting source revision. | T7 reproduces historical threshold oscillation and lost frame time; T8 **34/34 PASS**; T9 **24/24 PASS**; T2 integrated active-AI/capture lifecycle/combat/reset/leave rerun PASS after final gate; final syntax and diff checks PASS. Uses headless/mocked rendering/input/transport; no desktop recording, human visual review, GPU measurement or live WebRTC acceptance. | M1.02 and whole M1 remain UNVERIFIED for human feel/live co-op; playtest instructions above are next. NAV-01 stairs/mantling remain deferred out of scope; NET-02 remote jump visuals remain TODO. No code blocker remains for unlimited sprint. Existing TURN limitation affects only relay-dependent networks. |
| 2026-09-23 | Repository / Claude handoff preparation | Added `CLAUDE.md` with portable run/test instructions, preservation rules and current verification limits; added `.gitignore` and a private ES-module `package.json` with a test command and no dependencies. Made project paths relative for the handoff. Prepared a complete GitHub transfer from Build 04 source `9e603d65c97d982a2bf2a54887d27597fb24fc21`, including source, bundled assets, tests and this tracker. Runtime unchanged. | Export inventory, secret-pattern scan and archive integrity checks; portable suites rerun 34/34 movement and 24/24 firing checks PASS on Node 24.19.0; no new gameplay claims. The transfer excludes original Sites-specific hosting configuration and Git metadata. | GitHub repository creation/upload awaits account connection. Planned repository name: `dustline`, private unless the user chooses otherwise. Existing public Site and its publishing access are unchanged. |
| 2026-09-23 | Claude Code handoff inspection / local launch (no milestone work) | Read `CLAUDE.md`, `README.md` and this tracker; inspected the project tree (`dist/` ~16 MB runtime, `tests/`, `package.json`). Added `.claude/launch.json` (local `python3 -m http.server 8765 --directory dist` preview config). No runtime, story, asset, test or hosting changes. The folder is not a Git repository in this checkout, so there is no source revision to cite; Build 04 files as transferred. | `node` is not on PATH on this Mac; used the existing `~/.cache/codex-runtimes/.../node` (v24.19.0). T8 `tests/test-sprint-m1.mjs` **34/34 PASS**; T9 `tests/test-framefire-m1.mjs` **24/24 PASS**; `node --check` PASS for all 11 `dist/*.js` modules. Local server started; the Claude desktop in-app preview loaded the deployment menu (Story/Skirmish/Private co-op, four classes, Build 04 label) with no console errors. Gameplay was not started; the embedded preview is not a pointer-capture/feel test. | M1.02, QA-01 and whole M1 remain UNVERIFIED pending human playtest in a full desktop browser (see Recommended next task). Suggested setup: install Node (e.g. `brew install node`) so the test commands work without the Codex path; initialize Git so later tracker rows can cite revisions. No new blockers. |
| 2026-09-23 | M1.02 / MOV-01 diagnosis (measurement only); M7.10 filed | Baseline Git commit of the Build 04 handoff, then: new `dist/diagnostics.js` (F3 overlay, off by default; live FPS, frame ms, substeps, .25s-cap discard, quality/render scale/pixel ratio/canvas, auto-check countdown, FOV, sprint on/off and blocking input, target and measured ground speed, CPU sim/render-submit ms; 60 s rolling history; K dumps a per-second summary, event list and per-frame CSV to the console and saves a copy at `dustlineDiag.saved()`). `game.js`: one import, a substep counter, and two `if(diagnostics.enabled)` read-only hooks in `frame` and `stepSimulation`. New `tests/test-diagnostics-m1.mjs`. README/CLAUDE.md note F3 and the third test; new `NOW.md`. Reopened MOV-01 and M1.02 with the user's verbatim playtest observation; E10 mechanism inventory; PERF-01 found-not-fixed; M7.10 continuous patrolling/respawning enemies added as TODO (not implemented). No movement, camera, combat, rendering, network, story, class or asset change; nothing pushed; public Site untouched. | T8 **34/34 PASS**, T9 **24/24 PASS** after final code; T10 **4/4 PASS** incl. 1,046-frame bit-identical trace vs original Build 04 `game.js` (overlay off and on); `node --check` PASS. In-app preview (menu state only): F3 shows/hides the panel, recording stops when off, K dumps and saves, no console errors. Pointer-locked gameplay with the overlay was not exercised by Claude. | Symptom still undiagnosed: needs the user's overlay dump from a real sprint (Auto and Performance). Decision pending on whether to fix PERF-01 once evidence exists. `node` is still not on PATH (Codex-bundled v24.19.0 used). |
| 2026-09-23 | M2 combat feel (M2.01 subpart, M2.03, M2.04), PERF-01, NET-03; M1 accepted | Build 05, local only. `characters.js`: `react`/`reset`/`state`, .22s directional flinch, authored .62s+.2s falling death with slide. `game.js`: `characterHit`/`characterFx`/`surfaceHit`/`applyImpact`/`confirmHit`/`blood`/`puff`; `aiHit` extracted from `tickAI` with identical `rand()` order; instant π/2 roll and +.2m removed from host and snapshot paths; `impact` messages and `hit` {head,kill}; `head`/`confirm` sounds; AutoQuality wiring. `optimization.js`: `AutoQuality`. `index.html`: Blood checkbox, BUILD 05 label. `style.css`: stronger marker. Harness: additive exports (typeof-guarded). New T11. README/CLAUDE.md: Build 05, same-build co-op note, Blood, T11. User decisions applied: impact protocol, blood on all character hits except own view, allies still stand at 15s, guest surface dust, kill counter unchanged (KILL-01 intentional). No weapon balance, camera shake, ragdoll, weapons, grenades, menu restructure or spawning changes; nothing pushed; public Site untouched. | T8 **34/34**, T9 **24/24**, T10 **3/3** (+ optional Build 04 baseline trace identical), T11 **10/10** PASS; 4 deliberate mutations each fail T11; `node --check` all modules; in-app preview menu: BUILD 05, Blood checkbox on, 34px marker, no console errors. M1 accepted from user report "sprint jitter is gone in Safari on Build 04". Claude did not play Build 05: appearance of blood/flinch/fall, audio and live WebRTC are UNVERIFIED. | User playtest of Build 05 (solo + two-browser co-op). Remaining M2: M2.01 aim/recoil/reload/muzzle polish, M2.02 damage direction, M2.05 performance measurement. |
| 2026-09-23 | Build 06: M2 corrections (M2.01 marker/alert, M2.03 blood + decals, M2.04 variants, M2.05 measured); E12 ally-down finding; M5.09 + section 15 filed | Local only. Step A workflow (5 agents): E12, E13, E14 and a measurement method. New `dist/effects.js` (pooled blood, 40-decal ring). `characters.js`: `hitZone`, six `DEATH_VARIANTS`, `deathVariant`, ground-aware rest pose. `game.js`: `terrainAt`, `fitDecal`, `decalFor`, `validDecal`, zone/yaw/decal in `impact`, decal-only guest-wound impact, kill alert, neutral marker, failure text naming the victim, reset clears marker/alert/blood, Blood checkbox hides existing blood, zoom-scaled sprites. `index.html`/`style.css`: `#killalert`, neutral marker, BUILD 06. Harness: per-instance document/window, printable class lists, more exports. New T12; T11 adapted (see T11 update). Adversarial review workflow (5 lenses + 5 verifiers): 20 confirmed findings fixed (co-op yaw desync, human-wound decal mismatch, buried floor slabs, zoom, rest-pose ground penetration, stale marker after reset, harness DOM aliasing, test gaps), 1 refuted (alert frozen during host pause is intended). Weapon balance, kill counting, ally regroup and story unchanged; nothing pushed; public Site untouched. | T8 **34/34**, T9 **24/24**, T10 **3/3** (+ Build 04 baseline trace identical), T11 **10/10**, T12 **16/16**; T12 stable over 6 runs, T11 over 3; **42/42 mutations caught**; `node --check` all modules; B1 measured in the Chromium pane on the M1 (AC power); screenshots of blood at 6 m and 15–40 m, decals, and six landed bodies; game page loads with no console errors. Not verified: Safari appearance/cost, live WebRTC, human feel of the falls. | User playtest of Build 06. Found, not fixed: PERF-02, AI-02, NET-04, HUD-01. M2.02 remains. |
