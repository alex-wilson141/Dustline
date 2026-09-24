# NOW — DUSTLINE current state

_Updated 2026-09-23. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 04 (unlimited sprint, no stamina) + F3 diagnostic overlay (local only, not published).

**Open problem:** human playtest in a real browser: *"Sprinting is fine for a few seconds, then I slow down and the view shakes."*
MOV-01 and M1.02 are reopened as UNVERIFIED. Headless T8/T9 still pass (34/34, 24/24), so the cause is
probably in something the tests cannot see (frame pacing, auto resolution, input, perception).

**Candidate mechanisms (roadmap E10):** Auto render-scale ratchet (every 5 s, FPS < 42 → lower, never back up);
.25 s cap (only frames > 250 ms lose time); sprint gate (aim/crouch/trigger/reload/dressing cut speed and FOV together);
substep CPU cost growing as FPS drops. Found, not fixed: PERF-01 (auto-quality FPS average is thrown off by single hitches).

**Waiting on:** the user's F3 overlay dump from a real sprint, on Auto and on Performance graphics.
Procedure: roadmap → "Recommended next task".

**Next task after that:** read the numbers, tie the symptom to one mechanism, propose one bounded fix for approval.

**Filed, not started:** M7.10 continuously spawning enemies that patrol and reposition.

**Checks:** `node tests/test-sprint-m1.mjs`, `node tests/test-framefire-m1.mjs`, `node tests/test-diagnostics-m1.mjs`
(`node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/.../node/bin/node` works).

**Rules:** never reintroduce stamina; preserve story, four classes, combat, bots, co-op, pointer controls; `dist/` is source;
no desktop screen/audio recording; do not publish to the public Site without an explicit request.
