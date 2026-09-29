# DUSTLINE — Operation Broken Signal (Build 21)

**Play:** https://alex-wilson141.github.io/Dustline/ (desktop browser, Safari or Chrome). Source: https://github.com/alex-wilson141/Dustline

A desktop browser first-person squad combat prototype in a fictional arid mountain valley. Photographed PBR building surfaces and environmental lighting, a detailed rifle model with moving magazine and charging handle, articulated soldiers, enterable buildings, interconnected side routes, four classes, story objectives and experimental two-player private co-op. Geometry remains simplified; this is not a photorealistic commercial game.

## Maps (Build 21)

Kohar Valley is described in `dist/map-kohar.js`: the ground, the edges, the navigation grid, what is built and where, the starts, the objectives, the enemy posts and routes and the Ambush arena. The game builds its world from the active map (`dist/maps.js`). Kohar Valley is the only map; nothing about it changed when it moved into data (`tests/test-mapdata-b21.mjs` compares it with Build 20 number for number). A second map is planned.

## Modes

- **Story:** recover the route log in the western field office with E; restore the relay by clearing its perimeter and holding for 25 seconds; reach the eastern courtyard and stay for 5 seconds.
- **Skirmish:** clear the relay and hold it for 45 seconds.
- **Ambush (solo):** alone, survive escalating waves in the west district; no AI squad, every kill and every risk is yours. There is no win, only how long you last. Kills earn points (headshots more): press E at a barricade to open the next area, or at a weapon crate to buy one of the four class rifles or refill it. Stay inside the striped line; five seconds outside ends the run. From wave 5, choose between waves: X extracts and banks your points, V stays for a bigger bank. Dying banks nothing. Not available during a co-op session.
- **Private co-op (experimental):** two human players with AI squad support in the story mission. Each chooses a class. Both must reach extraction. A teammate's loss fails the operation; downed AI squadmates never do.

## Classes

| Class | Weapon | Magazine / reserve | Reload | Equipment |
|---|---|---|---|---|
| Assault | MK4 | 30 / 180 | 2.45s | Balanced armor, 2 dressings |
| Marksman | MK4 DMR | 20 / 100 | 3s | Semi-auto, magnified optic, 2 dressings |
| Support | MK4 automatic rifle | 75 / 225 | 5.1s | Heavy armor, slower movement, 1 dressing |
| Medic | MK4 CQB | 30 / 120 | 2.15s | Faster movement, 5 dressings |

## Controls

Move a finger on the trackpad, or move a mouse, to look. Deploy in a full desktop browser and allow the page to capture the pointer. The cursor is hidden only after capture succeeds and is restored in menus. If an embedded preview cannot capture it, the mission stays paused and offers a copyable game link. There is no edge-limited fallback. Playing does not require screen recording, microphone or camera access.

- WASD: move
- Left click: fire; hold for automatic weapons, click each shot for Marksman
- F / right click / two-finger click: toggle aiming
- Shift + forward: sprint indefinitely; aiming, crouching, firing, reloading or applying a dressing still interrupts sprint
- C: toggle crouch
- Space: jump
- R: reload
- E: collect the story route log
- H: apply a field dressing; movement slows and shooting cancels treatment (Ambush: B buys a magazine and N a dressing at a crate)
- Q: cycle squad orders (advance, follow, hold)
- P: pause and free the cursor without leaving full screen; P again resumes. Esc is the browser's own key: it frees the cursor and leaves full screen, and the game pauses and offers a FULLSCREEN button to go back
- L: leave the mission and return to class selection
- M: show or hide the tactical map, squad list and control guide (Ambush: the full-screen map)
- F3 (fn+F3 on Mac keyboards): diagnostic overlay, off by default; while it is shown, K dumps the last 60 s of frame/movement measurements to the browser console

Cover blocks bullets and movement. There is no automatic health regeneration. AI teammates regroup after being downed. Enemies patrol, take cover, pop up to shoot and reposition; reinforcements arrive out of sight in limited numbers per stage. Enemy positions are not revealed on the map. Friendly fire is disabled.

## Co-op setup

The hosted Site is public, so both players can open the game link without a game account. Co-op sessions still use privately exchanged connection codes. **Both players must run the same build** (the menu shows the build number). Builds 05–07 add host-sent hit, crouch and respawn data for blood, blood splats, reactions, deaths and wall dust; mixing builds still connects but shows those effects incorrectly. Refresh both players before connecting.

1. Both players choose **Private co-op** and a class.
2. Host chooses **Create host code** and sends the generated code to the teammate.
3. Teammate pastes it and chooses **Join with code**, then returns the answer code.
4. Host pastes the answer and chooses **Accept answer**.
5. Once connected, host chooses **Deploy squad**.

Setup contacts Google STUN. A direct connection shares network addresses with the other player. No camera or microphone is requested. Use codes only with a trusted teammate. The host must keep the game open; the mission pauses when the host pauses or leaves the game tab. If disconnected, return to mode selection and reconnect. Some networks cannot connect without a TURN relay, which this prototype does not include. There is no public matchmaking, dedicated server or cross-network reliability guarantee.

## Run locally

Serve `dist` with a static HTTP server, for example `python3 -m http.server 8765 --directory dist`, and visit http://localhost:8765. Opening HTML directly from disk will not load JavaScript modules. All graphics assets are bundled; only co-op setup needs the STUN service.

The rifle variants are fictional loadouts based on one M4A1 model. Character faces, equipment and many environment props remain procedural. Movement is animated, but this is not a commercial photorealistic simulator.

Graphics uses automatic resolution scaling by default; choose Performance to reduce resolution and disable shadows. Static scenery is batched, shadows are cached, and AI perception is staggered.

Graphics assets are CC0 from Poly Haven and OpenGameArt; see `dist/credits.html`. Three.js r169 is MIT licensed (`dist/THREE-LICENSE.txt`).

## Co-op: one connection, and revive (Build 20)

- **Connect once.** When a mission ends, L brings both of you back to the menu, still connected. The host chooses STORY, SKIRMISH or AMBUSH and deploys again; no new codes. Only DISCONNECT, or a lost connection, ends the session.
- **Down is not dead.** In co-op a player whose health runs out is down for 30 seconds. Stand within 2 m and hold E for 4 seconds to bring them back with 40 health. While you revive you cannot fire, stab or throw.
- **The mission ends when both of you are down at once.** A player who is not revived in time is out: in Ambush for the rest of the run, in Story and Skirmish the operation fails.
- **Your shots still hurt your teammate**: the rifle's damage less their armor, and far more to the head, which is now as small a target as an enemy's.

## Equipment (Build 19)

- **Z · sidearm.** Every class carries an M9 beside its rifle. It is in your hand in under half a second, which is what it is for: when the rifle runs dry in a fight, change instead of reloading. 26 a hit up close, weaker past 12 m.
- **T · knife.** Without changing weapons. It reaches 2.3 m; two thrusts from the front, one from behind.
- **G · throw.** Hold to take the item in hand, release to throw. A fragmentation grenade's 3.5 s fuse runs from the moment you take it in hand: hold it to shorten its flight, not to the end. **Tab** changes the item.
- **Fragmentation:** deadly within 2 m, nothing beyond 8 m, stopped by walls. It does not spare you or your teammate.
- **Smoke:** a 5 m cloud for 14 seconds. Nobody sees through it, the enemy included.
- **Flash:** blinds whoever is looking at it, for up to 4.5 seconds. Look away.
- **Story and Skirmish** hand out two fragmentation grenades, one smoke and one flash at every deployment. **In Ambush** you buy them at the crates (1, 2, 3), and B buys a magazine for the weapon in your hand.

## Fair co-op (Build 18)

- **Ambush has no AI squad, ever.** Your only teammate there is a real player. The AI squad box is for Story and Skirmish.
- **Shots are judged by what you saw.** Whoever hosts, aim at the enemy, not ahead of it: the game judges each shot against the picture its shooter had, up to 300 ms back.
- **Same rifle, same speed.** The guest's fire rate, reload and dressing take as long as the host's, also on a slow or uneven connection.
- **Enemies are shared.** Each wave sends the same number of enemies after each of you, wherever you stand.
- **Pause together.** Either player's P holds the mission for both, and a run starts when both are in.
- **When you are down** the camera follows your teammate and stays out of walls.

## AI squad: your choice (Build 17)

- **The box:** "AI squad" in the settings row, beside Audio and Blood, in Story and Skirmish. Each mode remembers its own choice. Untouched, both have their three squadmates.
- **Story or Skirmish without the squad:** the missions are built for four, and a line under the briefing says so. They can be completed alone, but nobody else draws fire.
- **Co-op:** the host's choice applies to both players, and the guest's box shows it. Your teammate is always the real player.
- **Extracting in co-op:** a player who is down banks alongside the survivor who extracts.

## Ambush co-op (Build 16)

- **Two real players, no AI squad.** Connect as below, then the host chooses AMBUSH and presses DEPLOY BOTH PLAYERS. Both players must be on Build 16.
- **Points are yours.** Your kills earn your points. A barricade either of you clears is open for both. Rifles (E), magazines (B) and dressings (N) are bought from your own points, for yourself.
- **Going down.** A player who is killed, or who stays five seconds outside the striped line, is down and watches the teammate. The run ends when both are down.
- **Extracting** (from wave 5, between waves) takes both players pressing X. V by either player, or the timer, keeps both in. A player who is down has no vote; since Build 17 that player banks alongside the survivor.
- **Waves for two.** While both are up, waves are half as large again, with up to 12 hostiles alive at once. Prices, points and enemy accuracy and damage are the solo values. Solo Ambush is unchanged.
- **Your teammate wears blue**, with a blue marker overhead that shows through walls. Your shots hurt your teammate, in Story co-op as well.
- **Records.** Solo and co-op personal bests are kept separately, in this browser only.
- **Connection.** A short interruption holds the mission for up to 15 seconds and resumes. If the connection is lost for good, the host plays on alone and the guest's run ends.

## Connecting for co-op (Build 15)

1. **Host:** choose Private co-op, press CREATE HOST CODE, wait for the code to appear, press COPY CODE and send the whole code to your teammate. It starts with `DUSTLINE:H:`.
2. **Teammate:** paste it, press JOIN WITH CODE, then COPY CODE, and send the answer back. It starts with `DUSTLINE:A:`.
3. **Host:** paste the answer and press ACCEPT ANSWER. Keep both pages open and do not reload in between.

Line breaks and spaces added by a chat app do no harm. If a code arrives cut short or changed, the game says so and by how much. If the codes are right and the game says your networks could not reach each other, that is a network limit: the game connects players directly and has no relay server. Both players must be on the same build.

## Ambush map and markings (Build 14)

- **One map:** press M in Ambush for a full-screen, north-up map of the whole arena: open and closed areas, standing barricades with their prices (amber if you can buy them now, grey if you cannot reach them yet), weapon crates with the rifle each sells, the arena edge, the houses, and a white arrow for where you are and where you face. Labels never overlap. The game keeps running while the map is open; M closes it.
- **Markings in the world:** a barricade you can buy has amber paint on its timber section, a painted board with the price and a lit lantern. A crate has a green paint band, a board with its rifle's name and a lantern, lit once its area is open.
- **Less on screen:** the Build 13 waypoint lines, area list and signal masts are gone, and Ambush has no minimap. Story and Skirmish keep their M panel.
- **Four rifles, four crates:** CQB in the courtyard, carbine in the field office yard, DMR in the west lane, automatic rifle in the north houses. The crate of the rifle you hold sells none.
- Prices, points and the difficulty curve are unchanged.

## Ambush solo and purchase clarity (Build 12)

- **Solo, for good:** no AI squadmates in Ambush, ever. Story and Skirmish keep their squad. The waves were rebalanced for one player: two enemies at once at waves 1–2, one more every two waves, nine from wave 15; arrivals no faster than one per second.
- **Five magazines:** a rifle bought at a crate comes with five magazines (the automatic rifle four, its reserve holds three drums).
- **Dressings for sale:** press N at any crate to buy a field dressing (150 points at wave 1, rising with the waves to 380; the kit holds five). Use it with H.
- **Plain-words prompts:** at another rifle's crate the prompt says what changes in two phrases, such as "MORE DAMAGE · SLOWER FIRE", worked out from the rifle's real numbers; your own kit (reserve, dressings, B and N prices) sits below a blank line.
- **Keys you can see:** the dressing count in the vitals panel carries an H keycap in play (it used to appear only with the map), the squad panel shows Q, and crate lines show E, B and N.

## Ambush difficulty and economy (Build 11)

- **More enemies at once:** four at wave 1, one more every two waves, twelve from wave 17 (it was seven from wave 7). Waves get harder, not just longer. Accuracy and damage are unchanged.
- **Ammunition costs points:** at any weapon crate press B to buy one magazine for the rifle you hold. The price follows how much damage a magazine can deal and rises with the wave, from 70 points for a carbine magazine at wave 1 to 180 from wave 16 (DMR 100 → 240, automatic rifle 160 → 400). Your reserve cannot exceed the rifle's limit. A rifle bought at a crate comes with three magazines.
- **Clearer purchases:** the crate prompt shows the rifle's damage, rate of fire, magazine size, fire mode and reload time, with the difference from the rifle you hold, and the magazine line with its price and your reserve.
- **Personal best:** the end-of-run summary shows your best wave and best bank, kept in this browser (no account, no server). It updates only when you beat it; if the browser blocks storage the line is simply absent.

## Ambush playtest fixes (Build 10)

- **Enemies come to you:** they walk in from one direction per wave (the radio and objective text name it), stop briefly to fire once you are in range, and keep moving up until they stand and fight about 7 m away. They duck into cover only where it gains ground. An enemy that stops making progress pushes straight in after 8 s; one grinding on a corner is nudged free after 3 s; one out of sight for 30 s without progress is withdrawn and sent again. Their accuracy, damage and rate of fire are unchanged.
- **Chest-high walls:** the four brick walls in and around the arena are 1.2 m tall in Ambush only. Standing, you see and shoot over them; crouched behind one you are hidden from standing enemies and your own shots stop at the wall. In Story and Skirmish they stay full height.
- **Checked:** 15 waves with 300 arrivals and no stall in the headless checks; Story and Skirmish enemy behaviour is identical to Build 09 sample for sample. Human feel is still to be playtested.

## Ambush mode (Build 09)

- **Where:** the west district of Kohar Valley, using the existing houses, walls and the field office. You start in the courtyard west of the house; three sandbag barricades open the field office yard, the west lane and the north houses. Each area has one weapon crate.
- **Waves:** each wave is larger and more aggressive than the last. Enemies arrive faster, move in sooner and take cover closer; their accuracy and damage are unchanged. They always walk in from out of sight beyond the line.
- **Measured cost:** about 7 ms per frame in Safari on a MacBook Pro M1 at wave 20 with every area open.
- **Setting:** stays fictional; future maps are not tied to real conflicts.

## Combat polish and map density (Build 08)

- **More varied deaths:** the fall now also depends on where on the torso a shot lands, how far off-centre it is and a per-kill value. A string of chest kills no longer plays the same fall: expect stepping back, doubling over, collapsing and, on shoulder or side hits, spinning. In co-op the host sends its choice so both players see the same death.
- **Bodies can be shot:** hitting a body shows blood and leaves a splat. It never counts as a hit, a kill or mission progress. Bodies sink into the ground after about 40 seconds, or sooner when more than five are lying.
- **Reinforcement waves:** reinforcements arrive two or three at a time from out of sight: 6 per stage in the first stage, 9 at the relay and 12 in skirmish. Their accuracy and damage are unchanged, and the mission can always be completed.
- **Busier village:** about 180 crates, barrels, tyres, sacks, pots, sandbag walls, concrete barriers, handcarts, fences and bits of debris, built from the game's existing materials. Solid ones block movement and bullets and give cover. Enemy routes, spawns and objectives were kept clear. On a MacBook Pro M1 (Chromium) this adds about 0.3–0.6 ms per frame.
- **Enemies stay in the fight:** an enemy that is fighting you keeps at it while you are alive and nearby. If you duck out of sight it holds, takes cover or moves up to find you instead of wandering back to its patrol, and it no longer loses track of you when your squad is closer to it than you are. It gives up only if you get far away (about 60 m) or its target is down.
- **No stale files:** every game file's address carries a fingerprint of its contents, and the page checks on start-up that it is the build the server has now. A browser can no longer combine cached older files with new ones (checked in Safari 18.5 and Chromium). After updating from an earlier build, reload once; from then on it is automatic.

## Enemies and performance update (Build 07)

- **Enemies move:** five patrol routes across the valley and two guard the relay. When they spot you (or hear shots nearby) they run to cover, crouch behind low walls, rise briefly to shoot and move again when hit. Their accuracy, damage and rate of fire are unchanged, and at most three shoot at the same target at once.
- **Reinforcements:** killed enemies are replaced later from out of sight, at least 35 m from any player, in a limited number per mission stage. The relay can always be captured and extraction reached.
- **Stuck enemy fixed:** spawn and route points are checked against the walls, and enemies route around thin walls instead of into them.
- **Faster shots and sight checks:** the terrain is now tested only where a ray actually crosses it, with identical results; heavy combat frames dropped from about 15–22 ms to about 10 ms on a MacBook Pro M1 (Chromium).
- **Pause keeps full screen:** use P to pause and resume. Esc still leaves full screen in every browser; the pause panel explains this and can re-enter full screen.

## Combat feel update (Build 06)

Changes after the Build 05 playtest:

- **Hit feedback:** one small neutral marker for every hit (red for a headshot). A kill no longer changes the marker; a brief "ENEMY DOWN" text appears under the crosshair instead, only for your own kills.
- **Blood:** a larger, darker spray and mist that read at normal combat range; headshots are clearly bigger. Blood stays in proportion when you aim or use the Marksman optic.
- **Blood splats:** a hit leaves a splat on a wall or solid close behind the target, or on the ground just behind it. Splats stay until there are 40 on the map (the oldest go first) or the mission restarts. In co-op both players see the same splats.
- **Deaths:** six authored falls chosen by where and from which side a character is hit: head, chest from the front, from behind, from the side, stomach, or legs. Every fall goes away from the shooter and ends lying on the ground. This is animation, not physics or ragdolls.
- **Mission failure:** the end screen now says who was killed. The mission fails only if you or your co-op teammate is killed. Downed AI squadmates regroup behind the start after 15 seconds and never end it.
- **Blood setting:** unticking Blood removes sprays and splats (including ones already on screen); hits still react.

Measured cost on a MacBook Pro M1 (Chromium): blood and splats together add under 0.1 ms per frame, even under heavy fire.

## Combat feel update (Build 05)

Character hits show brief blood (disable with the **Blood** setting next to Audio), push the target away from the shot for a fraction of a second, and kills play an authored fall in the direction of the shot instead of an instant sideways roll. This is animation, not physics or ragdolls. Your hits give a stronger marker and a short tick; headshots show a red marker and a two-tone tick. In co-op the host sends each hit to the guest, so both players see the same blood, reactions, deaths and wall dust. Weapon damage, accuracy, fire rates and reload times are unchanged. Only player kills count toward the kill total; bot kills deliberately do not.

Auto graphics now judges performance over 5 seconds of active play using the typical (median) frame time, ignores menus and pauses, is not lowered by a single hitch, and raises resolution again after sustained smooth play.

## Movement update (Build 04)

Sprint has no resource meter, exhaustion or recharge delay. All four classes retain their existing movement multipliers; none had a resource-based perk to replace. Jumping and aim sway no longer depend on an energy resource.

Slow frames are simulated in steps no larger than 1/60 second and rendered once, preserving travel time through 250 ms frames. Longer stalls deliberately simulate at most 250 ms to avoid sudden large movement; this does not make very low rendering rates visually smooth. Camera FOV and weapon pose use time-based damping, and movement bob fades when stopping.

## Regression checks

From the project root, with Node.js installed:

```sh
node tests/test-sprint-m1.mjs
node tests/test-framefire-m1.mjs
node tests/test-diagnostics-m1.mjs
node tests/test-combatfeel-m2.mjs
node tests/test-combatfeel-m3.mjs
node tests/test-enemies-b07.mjs
node tests/test-perf02-b07.mjs
node tests/test-pausekeys-b07.mjs
node tests/test-build08.mjs
node tests/test-cache-deploy01.mjs
node tests/test-engage-ai04.mjs
node tests/test-ambush-b09.mjs
node tests/test-ambush-b10.mjs
node tests/test-ambush-b11.mjs
node tests/test-ambush-b12.mjs
node tests/test-ambush-b13.mjs
node tests/test-ambush-b14.mjs
node tests/test-coop-handshake.mjs
node tests/test-ambush-coop-b16.mjs
node tests/test-squad-b17.mjs
node tests/test-fair-b18.mjs
node tests/test-equipment-b19.mjs
node tests/test-revive-b20.mjs
node tests/test-mapdata-b21.mjs
```

These run 34 movement, 24 firing, 3 diagnostics, 26 combat-feel, 12 enemy-behaviour, 6 terrain-raycast equivalence, 11 pause/fullscreen, 5 Build 08 scenario, 6 file-versioning, 3 enemy-engagement and 9 Ambush checks against the game code. The Build 08 scenarios cover death variety, shootable corpses and their clean-up, reinforcement waves and navigation around the new props. The combat-feel checks cover blood, splats, reactions, death variants, the kill alert, mission-failure text and cleanup in solo, host and guest paths, plus the Auto resolution rules. The earlier suites cover sustained sprint, existing action restrictions, class speeds, collisions, camera transforms, varied frame timing, and simulated host/guest messages. Rendering, pointer capture and network transport are mocked; these checks do not establish browser performance, visual feel or live co-op reliability. Automatic weapons keep their existing limit of one firing attempt per rendered frame, including during slow frames. The diagnostics check confirms a scripted gameplay trace is identical with the F3 overlay off and on.

After changing anything in `dist/`, run `node tools/stamp-build.mjs` to refresh the file fingerprints (the file-versioning check fails until you do).

Read and update `DUSTLINE-ROADMAP.md` after each development task. It records verified changes, remaining playtests and the next bounded milestone.

## Publishing

Every push to `main` publishes the game to https://alex-wilson141.github.io/Dustline/ through GitHub Actions (`.github/workflows/pages.yml`). Before anything goes live the workflow checks that the build stamp is current and runs every regression suite; if one fails, nothing is published and the previous build stays online. `dist/` is the site root. After changing anything in `dist/`, run `node tools/stamp-build.mjs`, run the suites, commit and push. Players get the new build on their next page load; both co-op players should reload so they are on the same build.
