# NOW — DUSTLINE current state

_Updated 2026-09-24. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 08, local only (Git, no remote; the public Site still runs its earlier build). Both co-op players must run Build 08 (new `impact`/snapshot fields). **Hard reload** before testing: browsers can mix cached older modules with the new `game.js` (DEPLOY-01).

**Done in code (Build 08):**
- Death variants (M2.06 option 0): the fall is chosen from zone, side, hit height, off-centre offset and a per-kill value. The host sends it so the guest plays the same death.
  - Face-on chest kills: stagger 38%, doubleover 34%, collapse 25% (Build 07: stagger 100%).
  - Bot kills: doubleover 39% at most (Build 07: stagger 70%).
- Corpses stay shootable: blood and splats only, never score, kills or mission. They sink away after 40 s, or oldest first beyond 5 lying. The guest mirrors this.
- Reinforcement waves: 2/3/3 per wave (stage 0/1/2), 3 in skirmish.
  - Budgets 6/9/6/12, alive caps 6/7/6/7, first wave at 20 s, waves 22–32 s apart.
  - Accuracy and damage unchanged; the mission stays completable.
- Map density: 183 props (83 solid cover or clutter) from bundled materials. Navigation is unchanged where it mattered.
  - Cost in Chromium on the M1: +6 draw calls, +0.6 ms on static views, +0.25 ms in combat.
  - All 7 enemies on screen: 8.7–9.2 ms per frame.
- Asset research for realistic characters and hands filed under M5.03/M5.04 (E19); nothing acquired.

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5 — all pass (headless). 23/23 deliberate breakages of the Build 08 behaviours caught (4 mutations rewritten to remove the real guard).
Not verified: Safari, live WebRTC, human feel of the deaths, wave difficulty, prop art.

**Waiting on:** the user's Build 08 playtest (checklist in the roadmap's "Recommended next task"); the M5.03/M5.04 asset-route decision (free Rocketbox + Mixamo vs about $100–250 paid vs AI generation).

**Found, not fixed:** DEPLOY-01 (stale module cache), AI-03, NAV-02, NET-04, HUD-01, TEST-07 (3 Build 07 behaviours unproven).

**Filed, not started:** M2.06 physics options 1–4, M5.09 breakable props, roadmap section 15 long-term plan.

**Intentional, do not change:** only player kills count (KILL-01); corpse hits never count. Allies regroup at the start after 15 s. Enemy fire formulas.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07,
perf02-b07, pausekeys-b07, build08. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at
`~/.cache/codex-runtimes/.../node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:** never reintroduce stamina; preserve story, four classes, weapon balance, enemy fire formulas, co-op, pointer controls;
`dist/` is source; cosmetic effects never use the seeded rand(); no terrain-mesh raycasts; no desktop screen/audio recording;
do not publish to the public Site without an explicit request.
