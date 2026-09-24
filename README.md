# DUSTLINE — Operation Broken Signal (Build 04)

A desktop browser first-person squad combat prototype in a fictional arid mountain valley. Photographed PBR building surfaces and environmental lighting, a detailed rifle model with moving magazine and charging handle, articulated soldiers, enterable buildings, interconnected side routes, four classes, story objectives and experimental two-player private co-op. Geometry remains simplified; this is not a photorealistic commercial game.

## Modes

- **Story:** recover the route log in the western field office with E; restore the relay by clearing its perimeter and holding for 25 seconds; reach the eastern courtyard and stay for 5 seconds.
- **Skirmish:** clear the relay and hold it for 45 seconds.
- **Private co-op (experimental):** two human players with AI squad support in the story mission. Each chooses a class. Both must reach extraction. A teammate's loss fails the operation.

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
- Escape / P: pause and free the pointer
- L: leave the mission and return to class selection
- M: show or hide the tactical map, squad list and control guide

Cover blocks bullets and movement. There is no automatic health regeneration. AI teammates regroup after being downed. Enemy positions are not revealed on the map. Friendly fire is disabled.

## Co-op setup

The hosted Site is public, so both players can open the game link without a game account. Co-op sessions still use privately exchanged connection codes. Each player should refresh to the same build before connecting.

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

## Movement update (Build 04)

Sprint has no resource meter, exhaustion or recharge delay. All four classes retain their existing movement multipliers; none had a resource-based perk to replace. Jumping and aim sway no longer depend on an energy resource.

Slow frames are simulated in steps no larger than 1/60 second and rendered once, preserving travel time through 250 ms frames. Longer stalls deliberately simulate at most 250 ms to avoid sudden large movement; this does not make very low rendering rates visually smooth. Camera FOV and weapon pose use time-based damping, and movement bob fades when stopping.

## Regression checks

From the project root, with Node.js installed:

```sh
node tests/test-sprint-m1.mjs
node tests/test-framefire-m1.mjs
```

These run 34 movement and 24 firing checks against the game code: sustained sprint, existing action restrictions, class speeds, collisions, camera transforms, varied frame timing, and simulated host/guest messages. Rendering, pointer capture and network transport are mocked; these checks do not establish browser performance, visual feel or live co-op reliability. Automatic weapons keep their existing limit of one firing attempt per rendered frame, including during slow frames.

Read and update `DUSTLINE-ROADMAP.md` after each development task. It records verified changes, remaining playtests and the next bounded milestone.
