# NOW — DUSTLINE current state

_Updated 2026-09-25. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 11, local only (Git, no remote; the public Site still runs its earlier build). Reload the page once after updating (the menu says BUILD 11).

**User playtest of Build 10 (2026-09-25):** wave 7 reached, no stuck enemies, the mode works. Remaining problem: the player outpaced the difficulty (every area open and everything bought within a few waves; points piled up; later waves longer, not harder). Build 11 answers that.

**Done in Build 11: Ambush difficulty and economy**
- **Alive cap rises with the wave:** 4 at waves 1–2, one more every two waves, 12 from wave 17 (was 7 from wave 7). Arrivals every .8 s from wave 13 (was 1.2). Counts per wave, accuracy and damage unchanged. Ambush has a pool of 20 enemy actors: the 7 Story soldiers plus 13 attached only while Ambush is played; Story, Skirmish and co-op still see exactly 7 enemies and 10 local actors.
- **Ammunition costs points:** B at any weapon crate buys one magazine for the rifle you hold, into the reserve up to the rifle's limit. Price = 6 points per 100 hp the magazine can deal, × (1 + 0.1 per wave after the first), capped at ×2.5 from wave 16: carbine 70 → 180, CQB 70 → 160, DMR 100 → 240, automatic rifle 160 → 400. A rifle bought at a crate comes with three magazines (one loaded, two in reserve), so re-buying a rifle is never cheaper than magazines. The half-price full refill is gone; your class rifle still starts full.
- **Clearer purchases:** the crate prompt shows "E · BUY MK4 DMR · 1000 PTS · 3 MAGAZINES", then the rifle's real numbers with the difference from yours ("78 DMG (+40) · 200 RPM (−371) · 20-RD MAG (−10) · SEMI · 3.0 S RELOAD (+0.5)"), then the magazine line with price and reserve. Everything is read live from the weapon data.
- **Personal best:** the summary ends with "Personal best: wave 9 · 3000 banked · NEW BEST WAVE" (first run: "First run recorded: …"). Stored in the browser only (`dist/records.js`, one localStorage key `dustline.ambush.best`, the project's first persistent data), written only on improvement; missing, blocked or corrupt storage just leaves the line out.
- **Found and fixed on the way (AMB-06):** with more enemies, three slow-arrival causes showed up: spawns whose only route was a 90 m detour around a closed barricade (now skipped), enemies zigzagging between a sideways cover spot and their route (cover must lie on the route), and the push failsafe treating a detour as no progress (route progress now counts). Filed, not fixed: AMB-05 (with the route filter about 70 % of arrivals come from inside the announced 40° sector, the rest from a widened one).
- **Safari frame time at wave 20, all areas open, 12 alive (B8):** main-thread frame work 3.7 ms mean, p99 8–9 ms, worst 10 ms; rAF interval 16.7 ms mean, p99 18 ms, worst 19 ms over 1800 clean frames at 60 Hz (Safari 18.5, M1, 1584×902, 11.6 enemies alive on average, 12 at most, 358 draw calls). Within budget (11 ms / 16.7 ms); +0.4 ms over Build 10's B7. GPU time is not measurable in Safari; keep Safari in front while measuring.

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3, T19 9, T20 8, T21 6 — all pass (headless, 153 checks). 22/22 deliberate breakages of the Build 11 code caught (20/22 on the first run; one check strengthened, one equivalent mutant replaced).
Not verified: difficulty and economy in play, prompt readability in combat, real Safari localStorage (normal and private windows), live WebRTC.

**Decisions for the user (playtest):** is 12 at once the right ceiling; do magazine prices bite at the right waves; is the three-magazine rifle rule fair; is B the right key for ammunition.

**Next:** playtest Build 11 in Safari (checklist in the roadmap's "Recommended next task"), then M2.06 option 2 (hybrid ragdoll).

**Filed, not started:** M2.07 wallbanging; M3.10 distinct weapon models; M5.10 terrain height variation (E23); F.10 Ambush without the AI squad; F.11 Ambush co-op; F.12 short join codes (after F.11).

**Found, not fixed:**
- AMB-05: the announced spawn sector loosens when its side is walled off (about 70 % inside 40°).
- AI-06: the corner grinding fixed for Ambush (AMB-04) can in principle affect Story/Skirmish enemies; not seen in the traces.
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
- Enemy fire formulas (cadence, hit chance, damage) and weapon stats.
- The relay no-go rule during capture.
- Ambush enemies always know where you are while they fight (siege design).
- Story/Skirmish AI stays trace-identical (T20/T21); Ambush-only fixes live in `ambushPlan`/`ambushDirector`/`ambushPool`, never in the shared movement code; the extra enemy actors never stay attached outside Ambush.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04, ambush-b09, ambush-b10 and ambush-b11. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Do not publish to the public Site without an explicit request.
