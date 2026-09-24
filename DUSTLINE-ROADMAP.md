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


> **Canonical tracker:** `DUSTLINE-ROADMAP.md` in this game project. Last updated **2026-09-23**, Build 04 local implementation, based on source commit `07a6e8f4f9bbac0c4b5519916a1aed4248687ea4` (Build 03).
> **Current task scope:** M1 unlimited sprint, movement stability, focused regressions and documentation. Implementation and code checks are complete; human feel and live co-op acceptance remain UNVERIFIED. This source is prepared for the existing public Site; its successful Sites deployment record identifies the published revision. Local checks alone do not verify a deployed browser session. The earlier setup-only inspection is retained in the progress log.

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
| Unlimited sprint with no resource restriction or related interface/perks | DONE for Build 04 code scope: E5/T8/T9; no runtime or HUD stamina state remains, jump and aim sway have no resource dependency, and sprint stays active with allowed input. Existing class speed multipliers are unchanged; none had a stamina-based perk to replace. | Real camera feel, rendered performance and live co-op remain UNVERIFIED; existing aim/fire/reload/crouch/heal restrictions still apply. |
| Reload/jump/crouch animation, realistic people/guns/buildings | TODO: animation/model code exists and T2/T4/T5 pass finite-state checks. | Visual quality/photorealism is not complete; M5. |
| Less lag and a less crowded HUD | TODO: renderer/AI optimizations and M-toggle tactical details exist (E7/E2). | Current responsiveness/readability needs observed play. |
| A way to leave | DONE for code behavior: P/Esc pause, L leave, menu buttons; T2 confirms pause/reset/leave and capture-release state. | Target-browser UX remains part of M6 verification. |

### Open issues and dependencies

| ID | Status | Evidence / next action |
|---|---|---|
| MOV-01 | DONE for reproduced code cause/removal; human symptom acceptance UNVERIFIED | Historical `stamina > 1` with 17/s drain and immediate 10/s recovery caused 274 run/walk changes in a 12s test at 60 FPS (T7). Build 04 removes the resource and all dependent speed/jump/sway/HUD behavior rather than adding new thresholds; T8 verifies sustained sprint and transitions. Human play must still check whether any other jitter remains. |
| MOV-02 | DONE for frame-time handling/code regression | T7 reproduced the old `.05s` cap losing 25% of simulation time at 15 FPS. E5/T8 now process at most 1/60s per simulation step, preserving movement through .25s frames and bounding longer stalls at .25s. Camera/weapon damping and separate base pose reduce frame-rate-dependent offsets. T9 preserves one automatic firing attempt per rendered frame and rejects no normally spaced replayed guest shots. This does not make very low rendering rates visually smooth; GPU/real-network acceptance is pending. |
| NAV-01 | TODO | Collision/navigation are planar; jumping changes camera/vertical offset, not a 3D stair/platform collision system. Required prerequisite for rooftop routes; do not scope a whole vertical-map rebuild into the sprint fix. |
| AI-01 | UNVERIFIED | Cached LOS may outlive a target moving behind cover before the next shot. Reproduce/tighten in combat/bot task; do not claim tested shots through walls. |
| NET-02 | TODO | Remote jumping is not represented in transmitted pose: `player.y` stays at ground height while `jumpY` changes camera height. Local jump exists, but synchronized teammate jump visuals need work. |
| DOC-01 | DONE | README now correctly describes public visitor access, private exchanged co-op codes, Build 04 unlimited sprint, existing interruption rules, timestep limits and project-local regression commands. H1 public access was reconfirmed before publication. |
| QA-01 | UNVERIFIED | Current real pointer capture, GPU performance, complete story/skirmish and live co-op acceptance remain pending. Screen/audio permission is not a game requirement; do not re-request desktop recording merely to test. |
| NET-01 | BLOCKED for reliable relay-dependent connections only | No TURN relay/service credentials. Direct Google-STUN peer connections are implemented; success across restrictive NAT/firewalls is not guaranteed. This does not block solo or all co-op testing. |
| SAVE-01 | TODO | No local save/profile schema. M9 is prerequisite for checkpoints/progression and later cloud sync. |
| AUTH-01 | TODO | No chosen/configured authentication provider or save backend. Choose/integrate one during M11, then record exact required account/credential setup. Do not claim credentials are currently blocking code that has not been designed. |
| ART-01 | TODO | Characters/hands/props remain procedural; no pending external asset delivery. Select suitably licensed replacements within the visual milestone; do not call current graphics photorealistic. |

**Supplied checklist classification:** 120 items; DONE: 13, TODO: 64, IN PROGRESS: 0, BLOCKED: 0, DEFERRED: 24, UNVERIFIED: 19. These counts exclude the supplemental original-requirement/issue tables. No whole gameplay milestone is marked complete.

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

## 1. Movement stability — UNVERIFIED

**Current ORIGINAL requirement:** sprint indefinitely while Shift + forward is active and existing movement/combat rules permit it. There is no stamina meter, exhaustion, recharge delay or stamina-based speed change. Preserve aiming, firing, reload, crouch, healing, story, four classes, bots, co-op and pointer controls. Do not add stairs, mantling or unrelated features. Code implementation is complete; the milestone remains UNVERIFIED until human camera/movement feel and supported live co-op acceptance are checked.

- [x] **M1.01 · DONE · ORIGINAL** — Implement unlimited sprint and fix the reproduced sprint/timing causes.
  - Existing / verification / remaining: T7 reproduced the former `>1` stamina threshold oscillation and `.05s` frame cap. E5/T8 remove all runtime resource dependencies and the meter/style/text, keep sprint active indefinitely, and process movement in bounded substeps. All four speed multipliers are unchanged; no stamina class perk existed to replace. T9 prevents substeps from backfilling automatic shots and preserves click/reload/cooldown behavior. This marks the confirmed code causes and requested removal complete, not a claim that every perceived jitter is eliminated.
- [ ] **M1.02 · UNVERIFIED · ORIGINAL/PLAN** — Verify camera stability and walk/sprint transitions.
  - Existing / verification / remaining: DONE code subpart: T8 checks release/restart, direction changes, combat gates, finite camera poses, equal-time FOV/weapon positions, bob settling and pause/reset. FOV/recoil and weapon roll/pitch use time-based damping; independent weapon base pose avoids accumulated offsets. Human feel, trackpad turning while sprinting, rendered frame pacing and live co-op motion/latency remain UNVERIFIED. No screen/audio recording was requested.
- [x] **M1.03 · DONE · ORIGINAL/PLAN** — Verify the scoped movement code: jumping, diagonal speed, walls, slopes and varying frame rates; stairs excluded.
  - Existing / verification / remaining: T8 passes 34 headless production-code checks, including 60 seconds at 15/30/60/120 FPS, all classes, diagonal normalization/turning, repeated jumps, existing wall stopping/sliding, ground slope, irregular frames, .1–.25s stalls, longer-stall cap, and host/guest pose/snapshot handling. T9 adds 24 combat-timing checks. Clear-lane endurance substitutes colliders; separate wall/slope checks use production geometry. These verify code behavior, not GPU FPS, an exhaustive corner/navigation sweep or actual WebRTC. Human acceptance remains M1.02/QA-01; remote jump visuals remain NET-02.
- [ ] **M1.04 · DEFERRED · ORIGINAL/SUGGESTION** — Preserve crouching; defer new stairs, mantling and associated routes.
  - Existing / verification / remaining: Existing crouch gate, damped height and reset behavior are retained and code-tested in T2/T8. New stair/platform/mantle traversal remains absent and is explicitly outside the user's M1 scope; defer that work to a separately authorized navigation task (NAV-01). Human crouch feel stays in M1.02 acceptance.

## 2. Combat feel and feedback — TODO

- [ ] **M2.01 · TODO · ORIGINAL/PLAN** — Improve aiming, recoil, reload timing, muzzle effects, and hit confirmation.
  - Existing / verification / remaining: E6/T1/T2/T5: ADS, recoil, fire cadence, magazine reloads, muzzle light/flash and hit marker exist; reload completion is verified. Further feel/timing polish needs playtesting; do not replace the working WeaponState.
- [ ] **M2.02 · TODO · PLAN** — Add clear damage direction and restrained, adjustable camera shake.
  - Existing / verification / remaining: E6: non-directional red vignette and recoil exist. No attacker-direction indicator or camera-shake adjustment.
- [ ] **M2.03 · TODO · PLAN** — Add brief hit splatter and a blood-effects setting.
  - Existing / verification / remaining: E6: surface-impact dust exists; no character blood splatter or blood setting.
- [ ] **M2.04 · TODO · ORIGINAL/PLAN** — Add directional hit reactions and natural falling/death animations or supported ragdolls.
  - Existing / verification / remaining: E6/E7: limbs blend toward a downed pose, but game logic immediately rolls the whole actor by π/2. No directional hit reaction, momentum fall or ragdoll.
- [ ] **M2.05 · UNVERIFIED · PLAN** — Bound body/effect lifetimes and check performance.
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

## Recommended next task

**Next: finish M1 human playtest acceptance.** The unlimited-sprint implementation and scoped code regressions are complete. Verify whether the reported jitter remains in a full desktop browser that supports pointer capture, and check real co-op movement if a teammate is available. Keep M1.02, QA-01 and whole M1 UNVERIFIED until those observations exist. A remaining symptom must be reproduced and tied to evidence before another code change; do not reintroduce stamina or start the next backlog milestone automatically.

Specific player checks:

1. Refresh both clients to Build 04 after publication. In solo, hold **W + Shift for at least 60 seconds** along a route with room to move, turning to stay on the route. Sprint must not slow periodically or show an energy meter.
2. Release/repress Shift several times, turn left/right while running, and alternate W, W+A and W+D. Check for camera/FOV snaps, sideways jolts or faster diagonal travel. Try the existing slope and run into/along a wall; stopping at a wall is expected, reversing or shaking in place is not.
3. While holding forward/Shift, aim, fire, reload, crouch and apply a dressing if injured. Each existing action should interrupt sprint; sprint should resume when its restriction ends. Jump after a long run, pause/resume, then leave/redeploy.
4. If a teammate is available, refresh both clients, exchange fresh co-op codes and compare sustained movement, direction changes, wall contact and firing/reloading. Report which player hosts, each browser, whether only the remote character jitters, and any ammo rollback. Remote teammate jump height is a known unfinished visual (NET-02).
5. If lag remains, compare Auto and Performance graphics and report browser/device, mode, class, location, action and whether the whole view stutters or only speed/FOV changes. Headless 15/30/60/120 FPS tests passed; actual GPU frame pacing has not been measured. Frames beyond 250ms intentionally discard excess simulation time, and extremely low render rates still reduce automatic-fire cadence.

Do not request desktop screen/audio recording. If no human or live co-op result is available, retain UNVERIFIED acceptance. Stairs and mantling remain out of scope.

Copy-ready next-task prompt:

> Read `DUSTLINE-ROADMAP.md`. Continue only M1 acceptance for the existing Build 04 unlimited-sprint implementation. Review my playtest observations, verify sustained sprint, release/restart, turning/diagonals, wall contact, camera/FOV, existing combat interruption rules, pause/resume and supported live co-op. Keep unlimited sprint with no stamina system. If jitter remains, reproduce the specific symptom and make only an evidence-supported fix; preserve story, four classes, combat, bots, co-op and pointer controls. Reuse the project regression tests and distinguish headless checks from real gameplay/network observations. Do not add stairs, mantling or other backlog features, and do not request desktop screen/audio recording. If human feel or live co-op cannot be checked, leave those items UNVERIFIED. Update the tracker with exact observations, any changes/tests, remaining issues and the next bounded task.

## Progress log

| Date | Milestone/item | Change | Verification | Remaining work/blocker |
|---|---|---|---|---|
| Initial tracker | All | Captured original requests and proposed additions | Screenshot and conversation only; project not inspected | Establish actual implementation status |
| 2026-09-23 | Setup / all 120 items | Saved and classified the supplied roadmap at the game project root; added provenance, verified foundations, evidence register, issue/dependency list and bounded M1 prompt. Baseline source `07a6e8f4f9bbac0c4b5519916a1aed4248687ea4`; only `DUSTLINE-ROADMAP.md` created. No runtime, story, asset or deployment changes. | T1–T6 PASS with limits above; read-only hosting check H1 confirms public version 3; checklist preservation/classification checked. No browser/screen/live-network test. | Sprint symptom reproduction and fix next; current visual/full-mission/network acceptance remains unverified. Future scope stays queued/deferred as labeled. |
| 2026-09-23 | M1 / Build 04 local implementation; MOV-01, MOV-02, DOC-01 | Based on `07a6e8f4f9bbac0c4b5519916a1aed4248687ea4`. `game.js`, new `timing.js`, `viewmodel.js`, `index.html`, `style.css`, `README.md` and project tests: removed sprint resource and all dependent meter/jump/sway behavior; kept class multipliers and existing combat gates; added ≤1/60s simulation substeps capped at .25s, time-based camera/weapon damping, bob settling/reset and frame-driven automatic-fire gating. No stamina perk needed replacement. Added portable 34-check movement and 24-check frame-fire regressions plus historical baseline fixture; corrected public-access docs and this tracker. Story, classes, bots, co-op protocol and pointer controls preserved; no new traversal/assets/features. Publishing uses the existing public Site; consult its deployment record for the resulting source revision. | T7 reproduces historical threshold oscillation and lost frame time; T8 **34/34 PASS**; T9 **24/24 PASS**; T2 integrated active-AI/capture lifecycle/combat/reset/leave rerun PASS after final gate; final syntax and diff checks PASS. Uses headless/mocked rendering/input/transport; no desktop recording, human visual review, GPU measurement or live WebRTC acceptance. | M1.02 and whole M1 remain UNVERIFIED for human feel/live co-op; playtest instructions above are next. NAV-01 stairs/mantling remain deferred out of scope; NET-02 remote jump visuals remain TODO. No code blocker remains for unlimited sprint. Existing TURN limitation affects only relay-dependent networks. |
| 2026-09-23 | Repository / Claude handoff preparation | Added `CLAUDE.md` with portable run/test instructions, preservation rules and current verification limits; added `.gitignore` and a private ES-module `package.json` with a test command and no dependencies. Made project paths relative for the handoff. Prepared a complete GitHub transfer from Build 04 source `9e603d65c97d982a2bf2a54887d27597fb24fc21`, including source, bundled assets, tests and this tracker. Runtime unchanged. | Export inventory, secret-pattern scan and archive integrity checks; portable suites rerun 34/34 movement and 24/24 firing checks PASS on Node 24.19.0; no new gameplay claims. The transfer excludes original Sites-specific hosting configuration and Git metadata. | GitHub repository creation/upload awaits account connection. Planned repository name: `dustline`, private unless the user chooses otherwise. Existing public Site and its publishing access are unchanged. |
| 2026-09-23 | Claude Code handoff inspection / local launch (no milestone work) | Read `CLAUDE.md`, `README.md` and this tracker; inspected the project tree (`dist/` ~16 MB runtime, `tests/`, `package.json`). Added `.claude/launch.json` (local `python3 -m http.server 8765 --directory dist` preview config). No runtime, story, asset, test or hosting changes. The folder is not a Git repository in this checkout, so there is no source revision to cite; Build 04 files as transferred. | `node` is not on PATH on this Mac; used the existing `~/.cache/codex-runtimes/.../node` (v24.19.0). T8 `tests/test-sprint-m1.mjs` **34/34 PASS**; T9 `tests/test-framefire-m1.mjs` **24/24 PASS**; `node --check` PASS for all 11 `dist/*.js` modules. Local server started; the Claude desktop in-app preview loaded the deployment menu (Story/Skirmish/Private co-op, four classes, Build 04 label) with no console errors. Gameplay was not started; the embedded preview is not a pointer-capture/feel test. | M1.02, QA-01 and whole M1 remain UNVERIFIED pending human playtest in a full desktop browser (see Recommended next task). Suggested setup: install Node (e.g. `brew install node`) so the test commands work without the Codex path; initialize Git so later tracker rows can cite revisions. No new blockers. |
