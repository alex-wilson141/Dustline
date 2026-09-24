# NOW — DUSTLINE current state

_Updated 2026-09-23. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 05, local only (Git, no remote; the public Site still runs its earlier build).

**Done:** M1 unlimited sprint, accepted by the user ("sprint jitter is gone in Safari on Build 04").
M2 combat feel in code: blood + Blood setting (on by default), .22 s directional flinch, authored falling deaths
with direction and slide (no ragdoll), hit tick + stronger marker with red headshot / larger kill variants.
Co-op: host sends `impact` per character hit and surface hit; `hit` reply carries head/kill; snapshots no longer
force the sideways roll. PERF-01 fixed (median-based Auto resolution, no checks in menu/pause, recovers upward).

**Checks:** T8 34/34, T9 24/24, T10 3/3, T11 10/10 (all headless). Not verified: how blood, flinches and falls look,
the hit sounds, real GPU behaviour of Auto resolution, and any live WebRTC co-op on Build 05.

**Waiting on:** the user's Build 05 playtest, solo plus two browsers on one Mac for co-op (checklist in the roadmap's
"Recommended next task").

**Next development task after that:** fix only evidence-backed Build 05 problems, then M2.02 damage-direction indicator.

**Intentional, do not change:** only player kills count (KILL-01). Allies stand up again after 15 s.

**Filed, not started:** M7.10 continuously spawning enemies that patrol and reposition.

**Commands:** `node tests/test-sprint-m1.mjs`, `node tests/test-framefire-m1.mjs`, `node tests/test-diagnostics-m1.mjs`,
`node tests/test-combatfeel-m2.mjs` (`node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at
`~/.cache/codex-runtimes/.../node/bin/node` works). Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:** never reintroduce stamina; preserve story, four classes, weapon balance, bots, co-op, pointer controls;
`dist/` is source; both co-op players on the same build; no desktop screen/audio recording; do not publish to the
public Site without an explicit request.
