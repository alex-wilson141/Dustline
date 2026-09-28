# NOW — DUSTLINE current state

_Updated 2026-09-27. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 14, **published**. Play: https://alex-wilson141.github.io/Dustline/ · Repository: https://github.com/alex-wilson141/Dustline (public). Every push to `main` goes live automatically once the stamp check and all suites pass on GitHub; a failing check publishes nothing. The menu says BUILD 14.

**Verified on the live site (H3):** the GitHub run passed all 17 suites and deployed; all 40 live files are byte-identical to local; every file is requested with its fingerprint; co-op connected between two browser tabs over the public URL; Safari opens the page. **Still to check by a person:** a mission played in Safari on the live URL, and co-op with a friend on another network (there is no relay server, so some networks cannot connect).

**Publishing a future build:** change, run `node tools/stamp-build.mjs`, run the suites, commit, `git push`. Watch the run under the repository's Actions tab (about three minutes). Tell co-op friends to reload so both are on the same build.

**User playtest of Build 13 (2026-09-27):** four signposts at once (waypoint lines, area list, minimap, masts) are clutter; the small M map is unreadable, its labels printed on top of each other; the masts look wrong in the valley. Goal: fewer and better signals, not none.

**Done in Build 14: Ambush map and signposting rework**
- **One full-screen map (M):** the whole arena north-up on a 1,000 × 1,600 canvas shown at 86 % of the screen height. Open areas green-grey, closed ones dark, each named with OPEN or CLOSED; standing barricades as thick lines with their price (amber: can be bought now; grey: not reachable yet); crates as squares with the rifle each sells and its price; the dashed arena edge; the houses; a white arrow at your position pointing where you look; a short legend. The game keeps running while it is open.
- **Labels cannot collide:** a layout made from the state alone places every label where it overlaps no other label, marker or barricade line and stays inside the canvas; text is drawn with its box as the width limit.
- **Markings in the world, on the objects themselves:** a barricade's timber section carries amber paint on the top rail, a painted price board and an oil lantern; a crate carries a green paint band, a board with its rifle's name and a lantern on a post. The lantern is lit while the thing can be bought. Colours match the map. No light sources are added (the glass is an unlit material).
- **Removed:** the signal masts, the HUD waypoint lines, the HUD area list, and the minimap in Ambush. Story and Skirmish keep their M panel.
- **Still guiding a new player:** "M · Map" in the session controls, the opening radio line, and one radio line per barricade the first time you can afford one you can reach.
- **Renamed:** area 4 is "North houses" (it lies north on the game's compass; AMB-08). One string to revert.
- **Unchanged:** every price, the points, the difficulty curve, solo play, Story and Skirmish.
- **Safari (B11):** with the full map open for all 1,800 measured frames: main-thread frame work 3.5 ms mean, p99 8–9 ms, worst 10 ms; rAF interval 16.7 ms mean, p99 18–19 ms at 60 Hz (Safari 18.5, M1, solo, wave 20, all areas open, 8.5 enemies alive on average). Within budget (11 ms / 16.7 ms). Real label widths measured in Safari: the widest is 97 % of its box, none spills. The map is shown at 441 × 705 px on the 1440 × 820 window; smallest lettering 11.5 px after the fonts were raised. Keep the display awake and Safari in front while measuring.

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3, T19 9, T20 8, T21 6, T22 6, T23 3, T24 5 — all pass (headless, 167 checks). T23 was rewritten to what still applies. 33/33 deliberate breakages of the Build 14 code caught (32 on the first run; one check strengthened).
Not verified: whether the map and the markings read well to a person in play, and whether a new player finds every barricade and crate; real Safari localStorage; live WebRTC.

**Decisions for the user:**
- Economy (E25, from Build 13): A bank the unspent balance, B steeper upkeep, C repeatable sinks, D lower income, E dearer one-time purchases. Recommended A, then B.
- Should the game pause while the map is open? It does not today.
- Keep "North houses" or return to the old name.
- Are the markings enough without any HUD pointer?

**Next:** playtest Build 14 (checklist in the roadmap's "Recommended next task"), decide the economy, then M2.06 option 2 (hybrid ragdoll).

**Filed, not started:**
- F.13 co-op means real players only in every mode including Story; Story missions are built for four, so fewer players will be harder; a difficulty option may be needed.
- F.14 friends-only PvP in private lobbies, including deathmatch. **Blocked by AI-03.**
- M2.07 wallbanging; M3.10 distinct weapon models; M5.10 terrain height variation (E23); F.11 Ambush co-op (real players only); F.12 short join codes (after F.11).

**Found, not fixed:**
- AMB-06 residue: a few unseen enemies per 300 arrivals are withdrawn and re-sent at the north-west corner of the courtyard.
- AMB-05: the announced spawn sector loosens when its side is walled off.
- AI-03: co-op guest hit chance higher than the host's (a PvP blocker).
- AI-06, AMB-01, AMB-02, AI-05, PORT-01, NAV-02, NET-04, HUD-01, TEST-07.

**Decisions on file:**
- Ambush signposting is the full map plus markings on the objects: no masts, no HUD waypoint lines, no HUD area list, no minimap in Ambush.
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
- Story/Skirmish AI stays trace-identical (T20–T24); Ambush-only code never leaks across modes.
- Every key hint reads `KEYS`; every Ambush marking and map element reads `ambushState()`; the map draws only what `mapLayout()` returns.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04, ambush-b09, ambush-b10, ambush-b11, ambush-b12, ambush-b13 and ambush-b14. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Pushing to `main` publishes: never push a build the user has not asked to release. The earlier chatgpt.site deployment is separate and untouched.
