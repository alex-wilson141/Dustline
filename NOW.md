# NOW — DUSTLINE current state

_Updated 2026-09-23. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 06, local only (Git, no remote; the public Site still runs its earlier build). Both co-op players must run Build 06.

**Done in code (Build 06, from the user's Build 05 playtest):**
- One subtle neutral hit marker (red for headshots); kills show a brief text-only "ENEMY DOWN" alert, only for your own kills.
- Larger, darker pooled blood that reads at 15–40 m; headshots clearly bigger; stays in proportion when zoomed.
- Persistent blood splats on the wall/solid behind the target or the ground just behind; cap 40, oldest first; cleared on restart; identical for host and guest.
- Six death variants by hit zone and direction, always falling away from the shooter and resting on the ground.
- Downed AI allies never ended the mission (verified); the end screen now names who was killed.
- M2.05 measured: blood + splats cost < 0.1 ms/frame on the M1 (Chromium pane), +4 draw calls, no per-hit allocation.

**Checks:** T8 34/34, T9 24/24, T10 3/3, T11 10/10, T12 16/16 (headless); 42/42 deliberate breakages caught.
Not verified: Safari appearance/cost, live WebRTC co-op on Build 06, human feel of the falls.

**Waiting on:** the user's Build 06 playtest (checklist in the roadmap's "Recommended next task").

**Next development task after that:** fix evidence-backed Build 06 issues; if F3 shows shot-frame spikes, PERF-02
(terrain raycasts in hit/LOS, measured ~17.5 ms p95 on shot frames in Chromium).

**Found, not fixed:** PERF-02, AI-02 (enemy spawn inside a wall), NET-04 (transient disconnect ends co-op; `end` not
role-checked), HUD-01 (no teammate row; guest has no own-death state).

**Filed, not started:** M5.09 breakable props (investigated; option B recommended, decisions listed), M7.10 continuous
spawning/patrols, and the long-term plan in roadmap section 15 (modes/maps, progressing story, Ambush survival on
Kohar Valley, private lobbies before 5v5, 5v5 BLOCKED on servers/accounts/matchmaking/anti-cheat, ranked DEFERRED,
shared bot difficulty, firing range, objective variety). SAVE-01 is a prerequisite for story/Ambush progression.

**Intentional, do not change:** only player kills count (KILL-01). Allies regroup at the start after 15 s.

**Commands:** `node tests/test-sprint-m1.mjs`, `test-framefire-m1`, `test-diagnostics-m1`, `test-combatfeel-m2`,
`test-combatfeel-m3` (`node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at
`~/.cache/codex-runtimes/.../node/bin/node` works). Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:** never reintroduce stamina; preserve story, four classes, weapon balance, bots, co-op, pointer controls;
`dist/` is source; cosmetic effects never use the seeded rand(); no desktop screen/audio recording; do not publish to
the public Site without an explicit request.
