# NOW — DUSTLINE current state

_Updated 2026-09-25. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 12, local only (Git, no remote; the public Site still runs its earlier build). Reload the page once after updating (the menu says BUILD 12).

**User playtest of Build 11 (2026-09-25):** the AI squad killed most enemies, so the difficulty curve never applied to the player; ammunition ran low by wave 3 while the squad fought; the crate stat line was unreadable in combat; the bandage key was not discoverable. Build 12 answers all four.

**Done in Build 12: Ambush solo and purchase clarity**
- **Ambush is solo, permanently:** no AI squad in Ambush, ever (AMB-07). The three squadmates are detached from the actor list and the scene while Ambush is played and put back at their original indices for Story, Skirmish and co-op. Any future Ambush co-op (F.11) means real players only.
- **Rebalanced for one player:** alive cap 2 at waves 1–2, one more every two waves, 9 from wave 15 (was 3 → 12 from wave 17 with the squad); arrivals no faster than one per second (was .8 s); wave sizes, accuracy and damage unchanged. A stationary bot with good aim reaches wave 4–5 on this curve (E24); a moving, buying human should do better. Knobs: `aliveCeiling` and the curve in `waveSpec`.
- **Five magazines** with a rifle bought at a crate, within the rifle's reserve (the automatic rifle four: its reserve holds three drums).
- **Dressings for sale:** N at any crate buys one field dressing, 150 points at wave 1 rising like magazines to 380 from wave 16; the kit holds five; used with H (+50 hp).
- **Plain-words prompt:** "E · BUY MK4 DMR · 1000 PTS · 5 MAGAZINES" / "MORE DAMAGE · SLOWER FIRE" / blank line / "YOUR MK4 CARBINE · RESERVE 120/180 · DRESSINGS 1/5" / "B · MAGAZINE (30 RDS) · 70 PTS   N · FIELD DRESSING · 150 PTS". The two phrases are the two largest differences (≥ 10 %) among damage, fire rate, magazine and reload, computed from the live weapon data; a fire-mode change counts half.
- **Keys you can see:** one `KEYS` map drives the bindings and every hint. The dressing count in the vitals panel shows an H keycap in play (it used to appear only with the map open); the squad panel shows a Q keycap; reload, extract/stay and crate lines read the same map.
- **Safari frame time, solo, wave 20 with all areas open (B9):** main-thread frame work 3.45 ms mean, p99 8 ms, worst 11 ms; rAF interval 16.7 ms mean, p99 18 ms, worst 22 ms over 1800 clean frames at 60 Hz (Safari 18.5, M1, 1584×902, 8.5 enemies alive on average, 9 at most, 457 draw calls). Within budget (11 ms / 16.7 ms); slightly under Build 11's B8. GPU time is not measurable in Safari; keep Safari in front while measuring.

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3, T19 9, T20 8, T21 6, T22 6 — all pass (headless, 159 checks). 24/24 deliberate breakages of the Build 12 code caught (23/24 on the first run; one equivalent mutant replaced).
Not verified: solo difficulty for a human, readability of the prompt and keycaps in play, real Safari localStorage, live WebRTC.

**Decisions for the user (playtest):** is the solo curve (2 → 9) hard but survivable; are 150-point dressings and a kit of five right; is N the right dressing key; is the automatic rifle's four magazines acceptable.

**Next:** playtest Build 12 solo in Safari (checklist in the roadmap's "Recommended next task"), then M2.06 option 2 (hybrid ragdoll).

**Filed, not started:** M2.07 wallbanging; M3.10 distinct weapon models; M5.10 terrain height variation (E23); F.11 Ambush co-op (real players only); F.12 short join codes (after F.11). F.10 (Ambush without the AI squad) is done: it is the only way Ambush plays.

**Found, not fixed:**
- AMB-06 residue: a few unseen enemies per 300 arrivals are still withdrawn and re-sent at the north-west corner of the courtyard (cover cycling on a slow detour); ≤ 2 % in T20.
- AMB-05: the announced spawn sector loosens when its side is walled off (about 75 % inside 40°).
- AI-06: the corner grinding fixed for Ambush (AMB-04) can in principle affect Story/Skirmish enemies; not seen in the traces.
- AMB-01: spawn pressure is limited by the out-of-sight rule in open areas.
- AMB-02: one ~80 ms frame when the Ambush scenery is first drawn.
- AI-05: allies still check only the three nearest enemies (Story/Skirmish).
- PORT-01: Windows CRLF clones fail T13/T17.
- Existing: AI-03, NAV-02, NET-04, HUD-01, TEST-07.

**Decisions on file:**
- Ambush is solo for AI purposes: no bot squad, ever; Ambush co-op means real players only.
- The setting stays fictional: environment variety is wanted, but no maps tied to real conflicts.
- Free assets only (Rocketbox + Mixamo).
- Keep the six prop materials.
- Hybrid ragdoll after Ambush.

**Intentional, do not change:**
- Only player kills count (KILL-01); corpse hits never count.
- Story/Skirmish allies regroup after 15 s (there are none in Ambush).
- Enemy fire formulas (cadence, hit chance, damage) and weapon stats.
- The relay no-go rule during capture.
- Ambush enemies always know where you are while they fight (siege design).
- Story/Skirmish AI stays trace-identical (T20–T22); Ambush-only fixes live in `ambushPlan`/`ambushDirector`/`ambushPool`/`ambushSquad`, never in the shared movement code; the extra enemy actors and the detached squad never leak across modes.
- Every key hint reads `KEYS`; never write a key letter into HUD text by hand.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04, ambush-b09, ambush-b10, ambush-b11 and ambush-b12. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Do not publish to the public Site without an explicit request.
