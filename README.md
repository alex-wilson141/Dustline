# DUSTLINE — Operation Broken Signal (Build 08)

A desktop browser first-person squad combat prototype in a fictional arid mountain valley. Photographed PBR building surfaces and environmental lighting, a detailed rifle model with moving magazine and charging handle, articulated soldiers, enterable buildings, interconnected side routes, four classes, story objectives and experimental two-player private co-op. Geometry remains simplified; this is not a photorealistic commercial game.

## Modes

- **Story:** recover the route log in the western field office with E; restore the relay by clearing its perimeter and holding for 25 seconds; reach the eastern courtyard and stay for 5 seconds.
- **Skirmish:** clear the relay and hold it for 45 seconds.
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
- H: apply a field dressing; movement slows and shooting cancels treatment
- Q: cycle squad orders (advance, follow, hold)
- P: pause and free the cursor without leaving full screen; P again resumes. Esc is the browser's own key: it frees the cursor and leaves full screen, and the game pauses and offers a FULLSCREEN button to go back
- L: leave the mission and return to class selection
- M: show or hide the tactical map, squad list and control guide
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

## Combat polish and map density (Build 08)

- **More varied deaths:** the fall now also depends on where on the torso a shot lands, how far off-centre it is and a per-kill value. A string of chest kills no longer plays the same fall: expect stepping back, doubling over, collapsing and, on shoulder or side hits, spinning. In co-op the host sends its choice so both players see the same death.
- **Bodies can be shot:** hitting a body shows blood and leaves a splat. It never counts as a hit, a kill or mission progress. Bodies sink into the ground after about 40 seconds, or sooner when more than five are lying.
- **Reinforcement waves:** reinforcements arrive two or three at a time from out of sight: 6 per stage in the first stage, 9 at the relay and 12 in skirmish. Their accuracy and damage are unchanged, and the mission can always be completed.
- **Busier village:** about 180 crates, barrels, tyres, sacks, pots, sandbag walls, concrete barriers, handcarts, fences and bits of debris, built from the game's existing materials. Solid ones block movement and bullets and give cover. Enemy routes, spawns and objectives were kept clear. On a MacBook Pro M1 (Chromium) this adds about 0.3–0.6 ms per frame.
- **After updating, hard-reload the page** (Safari Option+Cmd+R, Chromium Cmd+Shift+R). A browser can otherwise keep some older game files. The menu should say BUILD 08.

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
```

These run 34 movement, 24 firing, 3 diagnostics, 26 combat-feel, 12 enemy-behaviour, 6 terrain-raycast equivalence, 11 pause/fullscreen and 5 Build 08 scenario checks against the game code. The Build 08 scenarios cover death variety, shootable corpses and their clean-up, reinforcement waves and navigation around the new props. The combat-feel checks cover blood, splats, reactions, death variants, the kill alert, mission-failure text and cleanup in solo, host and guest paths, plus the Auto resolution rules. The earlier suites cover sustained sprint, existing action restrictions, class speeds, collisions, camera transforms, varied frame timing, and simulated host/guest messages. Rendering, pointer capture and network transport are mocked; these checks do not establish browser performance, visual feel or live co-op reliability. Automatic weapons keep their existing limit of one firing attempt per rendered frame, including during slow frames. The diagnostics check confirms a scripted gameplay trace is identical with the F3 overlay off and on.

Read and update `DUSTLINE-ROADMAP.md` after each development task. It records verified changes, remaining playtests and the next bounded milestone.
