# NOW — DUSTLINE current state

_Updated 2026-09-24. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build:** 08 plus a cleanup, local only (Git, no remote; the public Site still runs its earlier build). Both co-op players must run the same build. After updating, **reload the page once**: an ordinary reload replaces a Build 08 page Safari may still hold. From then on, stale files cannot mix.

**Done in this cleanup:**
- **DEPLOY-01, stale cached files:** fixed with versioned URLs rather than no-cache headers, because the servers we use cannot be relied on to send headers.
  - Every module and asset URL carries a hash of its contents (an import map in `index.html`, plus `assetURL()` from `dist/build.js`).
  - The page starts the game only after confirming it is the build the server has now.
  - Verified in Safari 18.5 and Chromium with a caching test server: the old scheme went stale or mixed under all 5 caching policies, the new one loaded only the current build.
  - After editing `dist/`, run `node tools/stamp-build.mjs`; the cache test fails until you do.
- **AI-04, enemy turned away mid-fight:** three causes, all fixed.
  - Enemies only sight-checked the three nearest possible targets, so nearer hidden allies made you invisible.
  - A 6 s sight timer ended the fight while you were alive and near, and the search ended in patrol.
  - Heard shots made the enemy flip between fighting and patrolling every frame.
  - Now an engaged enemy keeps its foe while it is alive and within 60 m, and hunts you instead of patrolling.
- **Frame budget** under sustained combat on this M1 at 1584×990 is met in both browsers:
  - Safari 18.5: 7.2–7.5 ms mean, 99th percentile 11–12 ms.
  - Chromium: 7.8–8.1 ms mean, 99th percentile 11.5–12 ms.
  - Budget: under 11 ms mean, under 16.7 ms 99th percentile.
- **Decisions filed:**
  - The six prop materials are kept.
  - No money on assets: only the free route (Microsoft Rocketbox, MIT, with Mixamo) remains under M5.03/M5.04.
  - Hybrid ragdoll (M2.06 option 2) chosen, to be built after Ambush.
  - **Ambush (F.03) is the next milestone.**

**Checks:** T8 34, T9 24, T10 3, T11 10, T12 16, T13 12, T14 6, T15 11, T16 5, T17 6, T18 3 — all pass (headless). 25/25 deliberate breakages of the two fixes caught.
Not verified: human feel of the new engagement, Safari back/restored-tab loads, live WebRTC.

**Next:** a short playtest of the cleanup (checklist in the roadmap's "Recommended next task"), then scope Ambush mode (F.03).

**Found, not fixed:**
- AI-05: allies still check only the three nearest enemies.
- PORT-01: Windows CRLF clones fail T13/T17.
- DEPLOY-01 limits: the server ignores `?v=`, so reload after a pull while the page is open; a CDN that drops query strings would break it.
- Existing: AI-03, NAV-02, NET-04, HUD-01, TEST-07.

**Filed, not started:** Ambush (F.03, next), M2.06 option 2 hybrid ragdoll (after Ambush), M5.03/M5.04 free-route characters and hands, M5.09 breakable props, section 15 long-term plan.

**Intentional, do not change:** only player kills count (KILL-01); corpse hits never count. Allies regroup at the start after 15 s. Enemy fire formulas. The relay no-go rule during capture.

**Commands:** `node tests/test-<name>.mjs` for sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01 and engage-ai04. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/.../node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- Cosmetic effects never use the seeded `rand()`; no terrain-mesh raycasts.
- No desktop screen/audio recording.
- Do not publish to the public Site without an explicit request.
