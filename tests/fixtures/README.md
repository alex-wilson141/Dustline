# Historical movement baseline

`sprint-before-m1.json` records headless measurements of `dist/game.js` from
pre-Milestone-1 commit `07a6e8f4f9bbac0c4b5519916a1aed4248687ea4` on
2026-09-23. Rendering, input capture, audio, AI and mission completion were
substituted to isolate local movement.

Holding forward + Shift produced 274 run/walk switches in 12 seconds at 60 FPS
as the old stamina value repeatedly crossed its threshold. The old 50 ms frame
cap also simulated only 3.75 seconds of travel during 5 wall-clock seconds at
15 FPS. These are recorded code measurements, not a browser performance test.

The current regression suite in `../test-sprint-m1.mjs` instead requires
uninterrupted sprint and equal elapsed travel across tested frame rates. The
historical JSON is evidence only and is not loaded by the game or the tests.
