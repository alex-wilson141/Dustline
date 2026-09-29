# NOW — DUSTLINE current state

_Updated 2026-09-29. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build 19 is LIVE** (pushed 2026-09-29). **Build 20 is committed locally and NOT pushed.** Pushing publishes; wait for the user's word.

**First two-player playtest (user and a friend, 2026-09-29, live build).** Four findings: kicked from the lobby when a game ends; enemy bullets "10 each"; a precision-rifle "body shot" on a teammate did 99; no revive. Build 20 answers them.

**Build 20 in short: co-op fixes and revive.**
- **The session stays.** Nothing but DISCONNECT or a lost connection ends it. After a mission, L by either player brings both back to the same menu, still connected; the host deploys again without codes. It was broken in Story co-op (always) and by the mode tabs; Ambush kept the session only after a finished run.
- **Skirmish for two** exists now. Before, choosing Skirmish while connected disconnected you.
- **Revive:** a player whose health runs out in co-op is down, not dead. The teammate holds E within 2 m for 4 s; the downed player has 30 s and stands up with 40 health. The reviver cannot fire, stab or throw. The mission ends when both are down at once. Not revived in time: in Ambush dead for the run, in Story and Skirmish the operation fails.
- **Friendly fire, the head:** a player's head is now as narrow as an enemy's. The 99 was a head hit on a Marksman (110 × 0.9), counted because the shape was shoulder-wide to the top. A body hit on a Marksman is 70.2.
- **Enemy damage: unchanged, as intended.** 12 to 22 a hit before armor: 8.6 to 20.9 by class, 7 to 9 hits to kill.
- **Safari (B16), measured at last:** 3.2 to 3.6 ms a frame at wave 20 with no throwables, with four smoke clouds around, and standing inside smoke; p99 6 to 8 ms; 60 Hz held. Smoke costs nothing measurable.
- **Faults the new tests found, fixed:** the host leaving an Ambush run told the guest both players went down; a guest who had left was pulled to the end screen.
- **Checks:** 23 suites, 226 checks, all pass (headless). T30 is new (10 checks); 55 deliberate breakages caught.
- **Not verified:** any of it between two homes. The connection in the tests is a stand-in.

**Decisions for the user (Build 20):**
- Revive: 4 s to revive, 30 s to wait, 40 health afterwards.
- Should being hit interrupt a revive? It does not.
- Friendly-fire damage itself (rifle damage × armor, 110 to the head) is unchanged. Lower it?
- Push Build 20, and when.

**Build 19 in short: equipment** (live).
- **Sidearm (Z):** every class carries an M9 beside its rifle. In hand in .45 s, 26 a hit, weaker past 12 m, 15 rounds. Rifles are unchanged.
- **Knife (T):** without changing weapons. 2.3 m, 65 from the front, a kill from behind, once every .8 s.
- **Throwables (G, hold to cook a frag; Tab changes the item):** fragmentation (170 within 2 m to nothing at 8 m, walls stop it, you are not spared), smoke (5 m, 14 s, nobody sees through it, enemies included), flash (blinds whoever is looking at it). Two of each at most.
- **Per mode:** Story and Skirmish hand out 2 frag, 1 smoke, 1 flash and three sidearm magazines at every deployment. In Ambush you start with the sidearm and one spare magazine and buy the rest at crates: 1 frag 300, 2 smoke 200, 3 flash 250, and B buys a magazine for the weapon in your hand (sidearm 30). Prices rise with the wave like the others.
- **Co-op:** the host decides everything; the guest's knife, throws, draws and reloads are judged by what the guest saw and counted from when the guest began them.
- **Fault found by the new tests and fixed:** the crate prompt named the rifle when the sidearm was in hand.
- **Safari:** measured in Build 20 (B16): smoke costs nothing measurable.
- **Checks:** 22 suites, 216 checks, all pass (headless). T29 is new (14 checks); 97 deliberate breakages caught.
- **This build was interrupted by a power loss** and resumed after a recovery check found the work intact.

**Decisions for the user (Build 19):**
- The keys: Z, T, G, Tab, and 1 2 3 at crates. All in one place (`KEYS`) if you want others.
- The sidearm's damage (26) and the prices (300 / 200 / 250).
- Whether your own grenade should hurt your teammate as much as it hurts you (it does).

**Standing decisions (user, 2026-09-28):**
- **Ambush never has AI squadmates, in any configuration.** The only teammate there is ever a real player.
- **Co-op must be fair between host and guest.** Neither may gain from which machine hosts.

**Build 18 in short: Ambush fairness and cleanup.**
- **Ambush squad option removed.** The AI squad box stays for Story, Skirmish and Story co-op; in Ambush it is not shown. The three open items that came with it are confirmed gone (SQUAD-02).
- **Shots (PVP-01):** every shot is judged against what its shooter was looking at. Cap: 300 ms, which covers about 105 ms each way. A claimed firing position more than 1.7 m off is replaced by the host's.
- **Guest's rifle, reload and dressing:** as fast as the host's on a delayed or jittery connection.
- **Sight:** enemies look for the guest at the height they use for the host, standing or crouched.
- **Arrivals:** each wave is dealt equally to the two players at any distance apart; never more than one apart in tests from 3 m to 70 m.
- **Pause and start:** either player's P holds the mission for both; the run waits until the guest is in.
- **Spectator camera:** stops short of walls, roofs and props.
- **Not equal and not changed:** if the host leaves, the guest's run ends (needs host migration); only the host deploys; the guest sees its own health a snapshot later.
- **Found, not fixed (AI-07):** dead enemies keep their attack tokens, so living enemies sometimes stand without firing. Every mode, both players alike. Fixing it changes solo difficulty and the traces.
- **Safari:** **NOT measured** (B13, B14). The bench window could not be brought in front of Safari's other window, so it never drew a frame. The Build 17 squad configuration it was meant to measure no longer exists. Host simulation alone, in Node: 0.16 ms mean per frame at wave 20.
- **Checks:** 21 suites, 202 checks, all pass (headless). T28 is new (8 checks).

**Decisions for the user (Build 18):**
- The cap: 300 ms. Higher helps a guest on a slow connection and lets the host be hit further "around corners".
- AI-07: fix it (enemies fire more, solo Ambush gets harder, traces re-recorded) or leave it.
- Host leaving ends the guest's run: accept, or plan host migration.

**Live:** https://alex-wilson141.github.io/Dustline/ · repository https://github.com/alex-wilson141/Dustline (public). Every push to `main` goes live once the stamp check and all suites pass on GitHub. To publish: `node tools/stamp-build.mjs`, run the suites, commit, `git push`, watch the Actions tab (about three minutes), then both players reload.

**Build 17 in short: the AI squad is your choice in Story, Skirmish and Story co-op** (the Ambush part was removed in Build 18). Untouched: on. In co-op the host's choice governs. Alone you take about 57 % more damage at the relay; one line warns you. At a co-op extraction a downed player banks alongside the survivor.

**Build 16 in short: Ambush for two real players, never an AI squad.**
- **How to start:** connect as before (PRIVATE CO-OP, exchange codes), then the host picks AMBUSH and presses DEPLOY BOTH PLAYERS. The guest's page follows.
- **Who decides:** the host runs waves, spawns, barricades, both players' points and every hit. The guest sends its moves, shots, purchases and extract choice.
- **Points:** per player. A barricade either player clears is open for both. Rifles, magazines and dressings come from the buyer's own points.
- **Going down:** that player watches the teammate from behind and can do nothing else. The run ends when both are down.
- **The line:** five seconds outside puts only that player down.
- **Extract:** both must choose X. V by either player, or the timer, keeps both in. A downed player has no vote (and, since Build 17, banks alongside the survivor).
- **Two-player balance (only while both are up):** half as many hostiles again per wave, half as many again alive at once (up to 12), arrivals a third faster. Prices, points per kill and enemy accuracy, damage, fire rate, range and aggression are the solo values. A lone survivor is back on the solo curve.
- **Records:** solo and co-op bests are stored separately.
- **Teammate:** blue uniform and vest, blue marker overhead drawn over everything. In Story co-op too.
- **Friendly fire:** on in co-op, same damage whoever hosts.
- **NET-04 fixed:** a short interruption holds the mission on both pages for up to 15 s instead of ending it. In Ambush a lasting loss leaves the host playing alone.
- **AI-03 fixed:** enemies fire at the teammate exactly as at the host.
- **Solo is untouched:** solo Ambush replays Build 15 sample for sample; Story and Skirmish replay the Build 09 trace.

**Safari (B12), two-player Ambush, wave 20, 12 alive:** guest 3.0 ms mean, p99 5–6 ms; host 3.5–3.7 ms mean, p99 6–7 ms, worst 15 ms. Budget 11 ms / 16.7 ms. Both pages on one machine.

**Checks:** 19 suites, 186 checks, all pass (headless). T26 is new (13 checks); 60 deliberate breakages caught.
Not verified: two people playing Build 16; two networks; whether the teammate reads as one in a firefight; the spectator camera near walls; the two-player difficulty; real interruptions.

**Decisions for the user (Build 16), still open:**
- Extract rule: both must choose (built). Alternatives: either player, or a majority vote with a timer.
- Two-player waves: 1.5 × hostiles and alive cap. Too easy or too hard is for the playtest.
- Friendly fire and the AI-03 fix also apply in Story co-op. Say if Story co-op should be left as it was.
- Returning to the menu after a finished Ambush run keeps the connection. Say if it should close.

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

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3, T19 9, T20 8, T21 6, T22 6, T23 3, T24 5, T25 6 — all pass (headless, 173 checks). T23 was rewritten to what still applies. 33/33 deliberate breakages of the Build 14 code caught (32 on the first run; one check strengthened).
Not verified: whether the map and the markings read well to a person in play, and whether a new player finds every barricade and crate; real Safari localStorage; live WebRTC.

**Decisions for the user:**
- Economy (E25, from Build 13): A bank the unspent balance, B steeper upkeep, C repeatable sinks, D lower income, E dearer one-time purchases. Recommended A, then B.
- Should the game pause while the map is open? It does not today.
- Keep "North houses" or return to the old name.
- Are the markings enough without any HUD pointer?

**Next:** decide on pushing Build 20 and play it together (checklist in the roadmap); then squad codes (F.12), so that connecting once takes a four-letter code (checklist in the roadmap's "Recommended next task"). Then the Build 14 playtest and the economy decision, then squad codes (F.12) or M2.06 option 2 (hybrid ragdoll).

**Filed, not started:**
- F.13 co-op means real players only in every mode including Story; Story missions are built for four, so fewer players will be harder; a difficulty option may be needed.
- F.14 friends-only PvP in private lobbies, including deathmatch. PVP-01 and AI-03 are fixed.
- F.15 1v1 deathmatch in a private lobby, an alternative to co-op, never a replacement. PVP-01 and AI-03 are fixed; what remains is listed in the roadmap.
- M2.07 wallbanging; M3.10 distinct weapon models; M5.10 terrain height variation (E23); F.12 short join codes (Step A reported, E27).

**Found, not fixed:**
- AMB-06 residue: a few unseen enemies per 300 arrivals are withdrawn and re-sent at the north-west corner of the courtyard.
- AMB-05: the announced spawn sector loosens when its side is walled off.
- AI-07: dead enemies keep attack tokens (every mode).
- REV-02: the downed player does not see their own body; nothing points to a downed teammate but the distance in the line; B14 still unmeasured.
- EQ-02: the guest sees its own throw a moment late; the teammate's figure always shows a rifle; enemies do not react to grenades; smoke's drawing cost is unmeasured.
- AI-06, AMB-01, AMB-02, AI-05, PORT-01, NAV-02, HUD-01, TEST-07.

**Decisions on file:**
- Ambush signposting is the full map plus markings on the objects: no masts, no HUD waypoint lines, no HUD area list, no minimap in Ambush.
- The solo Ambush curve (2 → 9 alive) is confirmed by play.
- Ambush never has AI squadmates (standing). The AI squad is the player's choice in Story, Skirmish and Story co-op; in co-op the host's choice governs; the co-op teammate is always a real player.
- Co-op is fair between host and guest (standing): anything that judges, pays, spawns or times must treat both alike.
- Ambush co-op: points per player, barricades shared, crate purchases individual; one player down does not end the run (user, 2026-09-28).
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
- Story/Skirmish AI stays trace-identical (T20–T24); Ambush-only code never leaks across modes; solo Ambush stays identical to Build 15 (T26).
- Co-op: the teammate is blue with a marker; friendly fire is on; enemies fire at both players alike.
- Every key hint reads `KEYS`; every Ambush marking and map element reads `ambushState()`; the map draws only what `mapLayout()` returns.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04, ambush-b09, ambush-b10, ambush-b11, ambush-b12, ambush-b13, ambush-b14, coop-handshake, ambush-coop-b16, squad-b17, fair-b18, equipment-b19 and revive-b20. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Pushing to `main` publishes: never push a build the user has not asked to release. The earlier chatgpt.site deployment is separate and untouched.
