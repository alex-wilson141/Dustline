# NOW — DUSTLINE current state

_Updated 2026-09-24. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 10, local only (Git, no remote; the public Site still runs its earlier build). Reload the page once after updating (the menu says BUILD 10).

**Done in Build 10: Ambush playtest fixes**
- **Enemies advance:** Ambush enemies (`ambushPlan`, role `ambush` only) move up to their own spot 7 m from you. Seeing you inside the wave's fight range (26 m at wave 1, narrowing to 14 m) they stop and fire for 2.5–4 s, then move up again; on the way they may duck for under a second into cover that gains ground. Within 7 m they stand and fight. Fire cadence, hit chance and damage are unchanged.
- **Failsafes:** no 3 m of progress for 8 s → push straight in until within 6 m. No 1 m of movement for 3 s while on the move → step to the nearest navigable spot and re-route (AMB-04, a corner-grinding stall found by the new checks and fixed). No progress for 30 s while unseen → withdrawn and sent again.
- **One direction per wave:** spawns lie within 40° of a bearing chosen from where you stand (widened after repeated misses, never last wave's); the radio says "Wave n inbound from the south-west", the HUD shows "from SW".
- **Chest-high walls:** the four brick walls in and around the arena are 1.2 m in Ambush (kept out of the static batch), 1.7 m and the original geometry in Story/Skirmish. Standing you see and fire over them; crouched you are hidden and your shot stops at the wall. Standing enemies see a standing player, not a crouched one.
- **Menu label BUILD 10.** Story and Skirmish enemy behaviour is identical to Build 09 sample for sample (T20 replays a 200 s trace recorded from `21abfb6`).
- **Report only (E23):** what terrain height variation would take (everything derives from `groundY`; collision and navigation are planar; slope rule, per-corner placement, pathing risk, measured raycast cost) and how to vary the ground surface with bundled assets only (vertex colours, canvas macro map, shader detail layer, instanced clutter). Nothing built.
- **Safari frame time at wave 20, all areas open (B7):** main-thread frame work 3.3 ms mean, p99 7–8 ms, worst 9 ms; rAF interval 16.7 ms mean, p99 18 ms, worst 20 ms over 1200 clean frames at 60 Hz (Safari 18.5, M1, 1584×902, 3–6 enemies alive). Within budget (11 ms / 16.7 ms). GPU time is not measurable in Safari; Safari throttles rAF to ~8 fps when another window covers it, so measure with Safari in front.

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3, T19 9, T20 8 — all pass (headless, 147 checks). 22/22 deliberate breakages of the Build 10 code caught (20/22 on the first run; one check strengthened, one equivalent mutant replaced).
Not verified: human feel of the advance and the walls, wave pacing and difficulty in play; live WebRTC.

**Next:** playtest Build 10 in Safari (checklist in the roadmap's "Recommended next task"), then M2.06 option 2 (hybrid ragdoll), unless the playtest calls for an Ambush phase 2 first.

**Filed, not started (2026-09-24):**
- M2.07 wallbanging (bullets through thin cover with reduced damage).
- M3.10 distinct weapon models per class rifle (free assets only).
- M5.10 terrain height variation and ground-surface variety (findings in E23).
- F.10 Ambush without the AI squad (solo, or real players only).
- F.11 Ambush co-op (open: points shared or per player; does one death end the run).
- F.12 short join codes: needs a small server holding the connection description and issuing a short key — the same infrastructure as lobbies (F.04) and more-than-two-player sessions; after F.11.

**Found, not fixed:**
- AI-06: the corner grinding fixed for Ambush (AMB-04) can in principle affect Story/Skirmish enemies; not seen in the traces, and fixing it changes the Story trace.
- AMB-01: spawn pressure is limited by the out-of-sight rule in open areas.
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
- Story/Skirmish AI stays trace-identical (T20); Ambush-only fixes live in `ambushPlan`/`ambushDirector`, never in the shared movement code.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04, ambush-b09 and ambush-b10. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Do not publish to the public Site without an explicit request.
