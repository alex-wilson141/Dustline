# NOW — DUSTLINE current state

_Updated 2026-09-24. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 09, local only (Git, no remote; the public Site still runs its earlier build). Reload the page once after updating (the menu says BUILD 09).

**Done in Build 09: Ambush mode, phase 1 (F.03)**
- **Mode:** a third tab (AMBUSH, solo; greyed out during co-op). It is a wave-survival run in the west district of Kohar Valley, built only from existing geometry and bundled materials. Rooftops were ruled out in Step A: nothing can stand on a roof, and adding stairs would need a separate request (E22).
- **Arena:** four areas. The courtyard with house B1 is the start; the field office yard (750), west lane (1000) and south houses (1250) open by buying their barricades with E. A yellow-and-black striped line with red-capped posts marks the edge. Five seconds outside, with a red countdown, ends the run.
- **Points:** kills +100, headshots +150 (squad kills earn nothing). Spend them on barricades and at the weapon crates: the four class rifles with unchanged stats for 500–1250, or a refill for half price.
- **Waves:** 6, 8, 10 … up to 40 enemies. Up to 7 are alive at once, arrivals get faster, and aggression rises; accuracy and damage never change. Spawns are always unseen, 35 m+ away and outside the arena.
- **Ending a run:** death ends it at once with a summary (waves survived, kills, points earned; nothing banked). A downed squadmate regroups inside the arena after 15 s. From wave 5 a 10 s choice: X extracts and banks points × (1 + 0.25 per extra wave); V, or the timer running out, stays.
- **Frame budget in Safari at wave 20,** with all areas open: 6.9 ms mean, 99th percentile 12–13 ms (budget: 11 ms / 16.7 ms).

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3, T19 9 — all pass (headless). 30/30 deliberate breakages of Ambush caught (3 checks strengthened after the first run).
Not verified: human feel, difficulty and edge readability in play; live WebRTC.

**Next:** playtest Ambush in Safari (checklist in the roadmap's "Recommended next task"), then M2.06 option 2 (hybrid ragdoll), unless the playtest calls for an Ambush phase 2 first.

**Found, not fixed:**
- AMB-01: spawn pressure is limited by the out-of-sight rule in open areas (5.5 of 7 alive at wave 20).
- AMB-02: one ~80 ms frame when the Ambush scenery is first drawn.
- AI-05: allies still check only the three nearest enemies.
- PORT-01: Windows CRLF clones fail T13/T17.
- Existing: AI-03, NAV-02, NET-04, HUD-01, TEST-07.

**Decisions on file:**
- The setting stays fictional: environment variety is wanted, but no maps tied to real conflicts.
- Free assets only (Rocketbox + Mixamo).
- Keep the six prop materials.
- Hybrid ragdoll after Ambush.

**Intentional, do not change:**
- Only player kills count (KILL-01); corpse hits never count.
- Allies regroup after 15 s.
- Enemy fire formulas.
- The relay no-go rule during capture.
- Ambush enemies always know where you are while they fight (siege design).

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04 and ambush-b09. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/.../node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Do not publish to the public Site without an explicit request.
