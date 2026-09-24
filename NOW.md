# NOW — DUSTLINE current state

_Updated 2026-09-24. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 07, local only (Git, no remote; the public Site still runs its earlier build). Both co-op players must run Build 07.

**Done in code (Build 07, from the Build 06 playtest):**
- Enemies patrol sector routes, two guard the relay; under fire they take cover (crouch behind low walls), peek to shoot, relocate when hit. Fire cadence, hit chance and damage unchanged; at most 3 shooters per target.
- Bounded reinforcements recycle dead enemies out of sight (budget per stage, alive cap, all tunable in `dist/enemy-ai.js`); relay capture and extraction stay completable.
- AI-02 fixed at the cause: validated placement for every spawn/regroup/reinforcement and navigation links that respect thin walls.
- PERF-02 fixed: exact terrain raycasting; heavy combat frame ~15–22 ms → ~10 ms in Chromium on the M1; game-logic CPU ~7–13 ms → ~0.7 ms.
- P pauses/resumes without leaving fullscreen; Escape is the browser's exit key (cannot be overridden in Safari).

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11 — all pass (headless). 31 deliberate breakages of Build 07 behaviours: first run 23 caught, 8 survived; targeted scenarios were then added for 5 of them (terrain-only line of sight, terrain/character tie, cover that must hide, cover never closer, relay leave rule), all now caught — 28/31 caught; 3 recorded as known unproven (TEST-07).
Not verified: Safari (Escape/fullscreen behaviour and frame cost), live WebRTC, human feel/difficulty of the new AI.

**Waiting on:** the user's Build 07 Safari playtest (checklist in the roadmap's "Recommended next task") and a decision on M2.06 death animations (option 0: 2–3 days; option 2 hybrid ragdoll: 8–10 days).

**Found, not fixed:** AI-03 (guest avatar hit chance asymmetry, frozen formulas), NAV-02 (two unreachable interiors; bushes/awnings don't block sight), NET-04, HUD-01.

**Filed, not started:** M2.06 ragdoll/hybrid deaths (investigated), M5.09 breakable props, roadmap section 15 long-term plan.

**Intentional, do not change:** only player kills count (KILL-01). Allies regroup at the start after 15 s. Enemy fire formulas.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07,
perf02-b07, pausekeys-b07 (`node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at
`~/.cache/codex-runtimes/.../node/bin/node` works). Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:** never reintroduce stamina; preserve story, four classes, weapon balance, enemy fire formulas, co-op, pointer controls;
`dist/` is source; cosmetic effects never use the seeded rand(); no terrain-mesh raycasts; no desktop screen/audio recording;
do not publish to the public Site without an explicit request.
