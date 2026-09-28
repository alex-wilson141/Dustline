# NOW — DUSTLINE current state

_Updated 2026-09-27. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 13, local only (Git, no remote; the public Site still runs its earlier build). Reload the page once after updating (the menu says BUILD 13).

**User playtest of Build 12 (2026-09-27), solo:** wave 8, 99 kills, 11m10s. The difficulty curve is right: **confirmed good, do not change it.** Problems: the West lane barricade could not be found, so its crate (the DMR) was never reached; 13,350 points earned against about 3,000 spent.

**Step A facts (E26):** four rifles are for sale, one crate per area, none missing: CQB in the courtyard (500), carbine in the field office yard (750), DMR in the west lane (1,000), automatic rifle in the south houses (1,250). The crate of the rifle you hold sells none, so a run shows at most three. The rifle never seen was the DMR, behind the West lane barricade. Every purchase point can be walked to; it was a findability problem.

**Done in Build 13: Ambush navigation**
- **Signal masts:** 12 m masts with unlit crossed panels, amber over every barricade that can be bought now, green over every crate in an open area. Re-made from the live state at every purchase and reset; none outside Ambush. A mast's panel is in sight from 66–84 % of the standing points of the opened areas (not from beside a house wall or indoors).
- **Waypoint lines** under the objective: "BARRICADE ↗ 34 M · WEST LANE · 1000 PTS" (nearest barricade that can be bought now; "ALL AREAS OPEN" at the end) and "CRATE ← 12 M · MK4 CQB" (nearest crate in an open area). The arrow is relative to where you face; this covers the places a mast cannot be seen from.
- **Map (M):** standing barricades as lines with their price (amber: can be bought; grey: its area is not open yet), closed areas shaded and named, crates as squares (green open, grey closed), and an area list in place of the squad panel.
- **One source of state:** `ambushState()` feeds the masts, the waypoint lines, the map and the list.
- **Unchanged:** every price, the points, the difficulty curve, solo play, Story and Skirmish.
- **Safari frame time (B10):** main-thread frame work 3.7 ms mean, p99 8–9 ms, worst 10 ms; rAF interval 16.7 ms mean, p99 18 ms, worst 22 ms over 1800 clean frames at 60 Hz (Safari 18.5, M1, 1584×902, solo, wave 20, all areas open, 8.6 enemies alive on average, four masts, waypoint lines and the M map shown). Within budget (11 ms / 16.7 ms); about 0.25 ms over Build 12's B9. GPU time is not measurable in Safari.

**Economy report (E25, nothing changed):** income is 100 per kill and 150 per headshot kill; the run's 13,350 means 69 of 99 kills were headshots (135 a kill). Income per wave rises from about 810 to 2,700 by wave 8 and 5,400 from wave 18. One-time purchases total 6,500 at most; upkeep (magazines 70–180, dressings 150–380) took about 10 % of income because a 30-round magazine earns about 810 points and costs 70–120, and upkeep prices rise ×2.5 while income rises ×6.7. **The bank on extraction is points earned × multiplier, not the unspent balance, so spending never costs score.** Options: A bank the unspent balance; B steeper upkeep; C repeatable sinks; D lower income; E dearer one-time purchases. Recommended: A, then B tuned by playtest. **Needs your decision.**

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3, T19 9, T20 8, T21 6, T22 6, T23 5 — all pass (headless, 164 checks). 25/25 deliberate breakages of the Build 13 code caught on the first run.
Not verified: how the masts, waypoint lines and map read in play; real Safari localStorage; live WebRTC.

**Next:** decide the economy (E25), playtest Build 13 (checklist in the roadmap's "Recommended next task"), then M2.06 option 2 (hybrid ragdoll).

**Filed, not started:**
- F.13 co-op means real players only in every mode including Story; no AI squadmates in any co-op session. Story missions are built for four, so fewer players will be harder; a difficulty option may be needed.
- F.14 friends-only PvP in private lobbies, including deathmatch. **Blocked by AI-03** (the co-op guest is hit more often than the host; host-decided hits would make PvP unfair by default).
- M2.07 wallbanging; M3.10 distinct weapon models; M5.10 terrain height variation (E23); F.11 Ambush co-op (real players only); F.12 short join codes (after F.11).

**Found, not fixed:**
- Masts are hidden from 16–34 % of standing points (beside house walls, indoors); the waypoint line covers those.
- AMB-06 residue: a few unseen enemies per 300 arrivals are withdrawn and re-sent at the north-west corner of the courtyard.
- AMB-05: the announced spawn sector loosens when its side is walled off.
- AI-03: co-op guest hit chance higher than the host's (now a PvP blocker).
- AI-06, AMB-01, AMB-02, AI-05, PORT-01, NAV-02, NET-04, HUD-01, TEST-07.

**Decisions on file:**
- The solo Ambush curve (2 → 9 alive) is confirmed by play.
- Ambush is solo for AI purposes: no bot squad, ever; co-op means real players only (Ambush F.11, every mode F.13).
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
- Story/Skirmish AI stays trace-identical (T20–T23); Ambush-only code never leaks across modes.
- Every key hint reads `KEYS`; every Ambush marker, waypoint and map element reads `ambushState()`.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04, ambush-b09, ambush-b10, ambush-b11, ambush-b12 and ambush-b13. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Do not publish to the public Site without an explicit request.
