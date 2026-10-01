# DUSTLINE project handoff

Read `README.md` and `DUSTLINE-ROADMAP.md` before changing the game. The roadmap
is the master development tracker. Update it after every development task with
changes, checks actually performed, unverified behavior, blockers and next steps.
Work on one requested milestone at a time; do not implement the entire backlog.

## Project structure

- Static HTML/CSS/JavaScript using bundled Three.js r169; no npm install or build
  step is required. `dist/` contains the authored source and bundled assets. It
  is not disposable generated output.
- `dist/game.js`: input, movement, simulation, missions and co-op integration. Since Build 32 its body is one function,
  `dustline(PAGE)`, booted once per map; the file's last lines boot it for the page.
- `dist/combat.js`, `network.js`, `environment.js`, `characters.js`, and
  `viewmodel.js`: existing combat, networking, scenery and animation systems.
- `dist/equipment.js`: the sidearm, the knife and the throwables (Build 19).
- `dist/map-kohar.js`: Kohar Valley, map 1, as a description (Build 21). `dist/maps.js`: the maps and the active one.
- `dist/map-dehrun.js`, `dist/terraces.js`, `dist/GLTFLoader.js`, `dist/assets/dehrun/`: Dehrun Terraces, map 2 (Build 28: the
  whole town in grey-box round the look-slice block and the customs house; walked as a look map, played as Skirmish).
  Fetched only for the address `?map=dehrun`. `dist/space.js` (the body and its space) and `dist/navmesh.js` (the enemies'
  layered navigation) serve any map that brings a space.
- `tests/`: portable Node.js headless regression checks and historical evidence.
- `tools/stamp-build.mjs`: stamps content hashes into `dist/index.html` (import map,
  stylesheet, start-up check) and `dist/build.js` (asset hashes). Run it after every
  change in `dist/`.
- `dist/credits.html` and `dist/THREE-LICENSE.txt`: bundled asset/library credits.

## Current state

Build 34 (local, 2026-10-01): Ambush difficulty and movement fixes, after the user's playtest of Dehrun's Ambush (fun, far too
easy, all from one side). **A body in the air is not a walking body (`air` in `space.js` `move`; the game passes `air: !grounded`):
it is not set down a step (Build 28's rule put every moving jump back on the floor: a jump while moving rose 5 cm from Build 28 to
33) and it is given no step allowance (it drifted over a sill's edge and was pushed out on landing).** Do not remove `air` from
either line. The eye keeps `EYE_GAP` (.16 m) under what is over the body's middle. **Whatever is drawn at eye height where a
player walks must be in the body's space** (`markBox`: a barricade's board, paint and lantern; a crate's lantern post): the near
plane cuts anything nearer than about .12 m. **The ways in (`ambush.routes`, `WAYS`, `WAY_ORDER`, `ambushWay`): each arrival is
given a way in turn by the routes' shares, each player's arrivals taking their own turns (`amb.wayN[k]`), and follows that way's
own field (`ambushField(k, way)`: `ladders`, `vaults` 'none' | 'broken' | 'all', `shut` places of its own) until 12 m of way is
left (`NEAR_WAY`), then a path of its own.** One whose way is a window breaks the pane itself (`BREACH` in `vaultStep`).
`amb.came` and `amb.cameBy` count how each came (the bench reads them). One field is rebuilt a frame (`fieldJobs`). **Dehrun's
curve (`ambush.curve`): `cap` [2, 1] to `ceiling` 10, `count` 1.5, `gap` .6, `tokens` [3, 6] (one more may fire at a player from
those waves: `T.attackTokens` from `aiT()` in `assignTokens`; Kohar Valley's is 3 at every wave), `run` 6 m/s while more than `NEAR_WAY` is
left and the hostile sees nobody.** Kohar Valley names no curve and no routes; T44 compares its Ambush with Build 33 from its
commit and T43 with Build 32. **Leaving asks first (`leave()`, `LEAVING`, `#leaveask`): never call `goMenu()` from a key or a
button that a player can press in a mission; `leaving` tells the other player at the first press.** The knife is a profile
extruded and bevelled in `viewmodel.js`, made once. Breakage scripts: quote the heredoc (`<<'EOF'`: the shell eats `$(...)`),
and never kill a pass in the middle (it leaves its edit in `dist/`; the script now restores on SIGTERM).
Build 33 (local, 2026-10-01): Ambush on Dehrun Terraces, in the customs house. **An arena may have height (`ambush.levels` in
the map; `LEVELS` in `dist/ambush.js`): every line in `game.js` and `ambush.js` that says `LEVELS` leaves Kohar Valley's flat arena
on its own code, and T43 compares Kohar Valley's Ambush (both curves for forty waves, every price, both keys of the bests, a played
solo run and a two-player run) with Build 32 taken from its commit. Never change Kohar Valley's side of such a line.** On Dehrun: an
area is a rectangle with a height (`y`, the feet); a barricade closes openings (`blocks`) with boxes put into the body's space
(`SPACE.add`, switched `off` when bought or when another mode is played), an occluder each, and the places they cover shut in the
navigation (`LAYERS.close`); a `passage` is a way through the arena's edge that nothing closes (the striped line lies there, the
hostiles come in by it). **Every barricade must leave the hostiles a way in** (T43 `reach`). Eight areas, seven barricades (500,
750, 1,000, 1,250, 1,500 × 3), four crates at Kohar's prices, the start on the top floor facing along the corridor. The hostiles'
ways come from one field per player (`LAYERS.field`, `follow`: a reverse flood of the navigation, 5 ms, rebuilt when the player
has moved 4 m, a barricade is bought or a pane breaks); a path of their own (`planRoute`) only within 14 m (`NEAR3`), two a frame
(`navJobs`). **Never plan a path per hostile across the town: one costs 13 to 18 ms.** Arrivals stand on places of the navigation
with a way in, unseen, 35 m off and 6 m outside the open arena; where none is in the wave's direction any direction serves, then
any distance. A map may change the curve (`ambush.curve`: `alive`, `gap`; `curved` in `ambush.js`); Dehrun's is one more alive and
a fifth sooner. **Windows are ways for enemies once their pane is broken** (`navmesh.js` `vault` edges for openings with a place
on both sides and a sill no higher than 1.3 m; `vaultStep` in `game.js`; `LAYERS.vaultOpen`), in every mode on a map with glass.
A ladder climbs the customs house's east face to its roof. Bests are per map (`bestKey(map, coop)` in `dist/records.js`; Kohar
Valley's two keys are the old ones). The map (M) draws an area where its `shift` puts it (the house's four levels one under
another). **The nudge (`space.js` `move`) is taken only when it frees a step that was stopped, and only to the side of that
step:** a body walked into a flat wall at a slant ends where it would without it (T43 `nudge`); do not let a step aside count as
way made again. **Glass breaks in pieces (`PIECES` in `game.js`):** one `InstancedMesh` of 144 made with the game, twelve to a
pane, Math.random only, in no sight, shot or body test; a pane stops nothing from the instant it breaks. Sight rays on Dehrun
are costly (MAP-13): ask as few as possible per frame.
Build 32 (local, 2026-10-01): changing map in a running page, map build 8 (MAP-01 done). **The game is a function of the page:
everything in `game.js` below its imports is inside `function dustline(PAGE){...}`, called when the page loads and again for
every map (`PAGE.boot()`, the last lines of the file). A game shares nothing with the one before it but what is the page's on
purpose: `PAGE.peer` (the connection: a new game only gives it its hooks; nothing but DISCONNECT and a lost connection closes it,
Build 20) and `PAGE.keep` (the chosen class). Never keep anything else on `PAGE`, on `window` or in a module: a thing kept is a
thing left over from the last map (T42 hunts it).** `dispose()` throws a game away: every listener is registered with `on(target,
type, fn)` (one `AbortController`, and inert once `dead`), the frame loop returns when `dead`, every geometry, material and texture
in the scene is released, the kit's lists are let go (`built.dispose()`), the renderer loses its context and its canvas leaves the
page. `changeMap(id, told)`: alone, from the menu only; connected, the host from the menu (it sends `map`), the guest only when told
(wherever it is: a mission is left first); `loadMap(id)` from `maps.js`, `dispose()`, `PAGE.boot()`. A guest's game sends `ready`
with its map when it stands and on connecting; the host keeps it (`mateMap`), answers with `mode` (or `start` in a mission, or
`map` if the guest is elsewhere) and does not deploy a linked mission while it knows its guest to be on another map; `mode` and
`start` carry `map`. **No `import()` in `game.js`, and no `import.meta`** (the harness runs it as a function body). The menu has a
button for each map (`[data-map]`, `#maploading`); `lookMenu()` sets the header and the map marks on every map. The harness boots
the function itself (`/*#harness*/` and `/*#page*/` mark where its exports go and where the page's last lines begin; old builds
without them load as before); `g.page.game` is the page's current game, `g.changeMap(id)` resolves to the new one, and imported
`let` exports are read again at every boot. **Building a world blocks the page (about 1.1 s for Dehrun Terraces).** The customs
house: the south-east room on every storey and the first floor's north-west room are part of their neighbours (rule: under 5 m or
30 m² is too small to fight in); eleven rooms. Filed, not built: F.16 models (the build after next; F.19 the enemies' faction is
decided there first), F.17 the HUD panel, F.18 glass in pieces with an animation. B28 awaits the user.
Build 31 (local, 2026-10-01): stair width and glass corners. **Stairs are 2.4 m (the user asked for wider four times: widen, do not
investigate again; the Build 30 eye is untouched, T41 pins its text).** Every flight 2.4 m (2.39 to 2.51 clear). The customs
house's wells are 5.1 m wide (x ±7.5 to ±12.6) and take the house's whole depth beside the corridor (`stairW` z 53.4..59.8,
`stairE` 62.8..70.6): **the six closets are gone**, with their doors and the twelve windows that looked out of them; half landings
3.4 and 4.8 m (3.45 and 4.85 clear), entries 4.84 m, roof doors 2.4 m (2.19 clear); the north-west and south-east rooms are .8 m
narrower. The kit keeps a stair's far end .12 m off the house's own wall (`span`). House A's well reaches x −10.2; a district stair
takes `w − 2.9` (25 treads on a 12 m house, 20 of .29 m rise on a 10 m one: no steeper is possible on a 10 m face). The roof loop
and foes stand at x ±5.5 (the stair heads are wider). **Further widening needs a bigger customs house or steeper district stairs.**
Navigation: a drop is judged from where the place stood (`fell`); an actor's step along a path is nudged (`walk`, `FOE.nudge` .12,
`actorMove(..., onPath)`), its other moves and the flood are not. **Glass: the whole opening is the pane to a ray or a body**
(`G(..., reach, clear)` in `dress`: post to post, sill to head; on a double window each half reaches to the middle of the post, so a
shot at the post breaks a half); the drawn glass is unchanged. **The teeth of glass are gone** (four drawings for all windows): they
stopped nothing but could not be shot away. 283 panes; the customs house's west wall has three ground-floor windows (z 64, 66.5, 69).
B27 awaits the user.
Build 30 (local, 2026-09-30): window frames and the eye on stairs. **A broken window is a hole: what stands in the opening with
the pane is `loose` in the kit (`part()`, `L()` in `dress`): the casement's rails and glazing bars, the iron bars, and the post of a
double window (owned by both panes: it goes with the second). A loose part is listed in `stats.list` exactly as before (T35), drawn
as an instance (one drawing per surface: five drawings for all windows), and when its pane or panes break it is `gone` from the list,
hidden in the picture and `off` in the body's space (`inside()` in `space.js` skips a box that is `off`); `reset()` brings it back.**
Never make a casement or a window's bars with `block()` again. What stays round a hole: the reveal's posts, the lintel, the sill, the
shutters, the dark room of a shell, and teeth of glass no deeper than .14 of the pane. A barred window shot out can be climbed
through (the user's brief: nothing spanning the opening). `glass.spanning(i)` is what still stands in a pane's opening. **The eye on
stairs (Step A, E46: the user called the stairs tight at 1.37, 1.7 and 2.0 m; no dimension was the cause; the eye took every tread
as a 21 cm jump in one frame, ten times a second walking):** on a map with a space `eyeStep` holds the eye back by each step the feet
take up or down within `BODY.step` (`eyeStepped(d, speed)` from `heightStep`) and gives it back at the feet's own climbing rate
(`BODY.ease` [1, 4.5] m/s, never slower than .65 of the body's speed, never more than `BODY.sag` .3 m behind): the eye rises in a line.
Jumps, falls, pull-ups and ladders are not eased; the feet, the body's speed, the treads and the field of view are unchanged; Kohar
Valley adds nothing (`SPACE?eyeStep:0`). Shots leave from the eye where it is drawn. B26 awaits the user.
Build 29 (local, 2026-09-30): windows and stairs. **Glass is the kit's (`built.glass`, `GLASS` in `game.js`; null on Kohar Valley,
where nothing of it runs): a pane is not a mesh but one instance of one box per kind of glass (`pane` dark, `clear`), listed in
`stats.list` as before, with a third instanced drawing for what a broken pane leaves in its frame (teeth along the edges). Breaking
hides one instance and shows another: no mesh, geometry or material is ever made after load (T39 counts).** A whole pane stops sight
and shots (`clear()`, hence `visible()`, the knife and cover checks; `hitScan` ends at the glass and breaks it: the breaking shot
goes no further); a broken pane stops nothing. Only the host or a player alone breaks (`glassBreak`; never while `guesting()`): the
guest is told (`glass`), and every snapshot carries `gl` (how many panes are broken and a sum over which); a guest whose panes differ
asks (`glassAsk`, again every fifth snapshot) and is sent the list (`glassAll`, `GLASS.set`). Also breaking: a grenade passing through
(`nadeAdvance`), a blast within `GLASS_BLAST` 5 m (before its damage: glass shields nobody), a player's body in a pane (`glassBodies`,
host-side for both players), and any AI actor that would see someone but for glass (`sees()` notes the pane in `a.glassAt`, the fire
block shoots it out at the usual cadence drawn from `aiRng`, hurting nobody, then the actor sees). `reset()` makes every pane whole.
**Do not put glass back among the occluders or make panes meshes; do not let the guest break a pane.** Windows: `win()` is 1.4 m wide
with its head at 2.2 m (was 1.1 / 2.05), `dwin()` a double window (`double: true`: one 2.4 m opening, two casements, a post between,
two panes, half shutters); the town's shells are `glazed` (panes only) and every other one has doubles upstairs where a face has
room; 294 panes in all. **Stairs (Step A measured why 1.7 m felt tight: not the width, but (1) on 17 of 23 flights a body hugging a
wall stopped dead against something a few centimetres proud of it, (2) half landings 1.37 m clear, (3) roof doors 1.3 m, about 1.1 clear):**
every flight is 2 m (1.99 to 2.12 clear; the customs house's wells 4.3 by 4.8 m, x ±8.3 to ±12.6, `landing: 2`, `head.door` 1.9; house
A's well to x −10.6; district stairs take `w − 2.5`); the player's own moves are nudged (`BODY.nudge` .2, `space.move(..., {nudge})`:
a step that makes under a quarter of its way is tried from up to .2 m to each side and the best taken; enemies and the floods are
not nudged). `navmesh.js`: a place the body settles lower than the mover left it must be clear there. B25 awaits the user.
Build 28 (local, 2026-09-30): the layout of Dehrun Terraces, map build 7 of 9. **The town is data in `dist/map-dehrun.js`, most of
it made by a generator at the top of the file (`DIST`: terraces, retaining walls, lane steps, cross streets, town walls, gates, 61
houses) from `TERRACES`, `LANES`, `height(x, z)` and `level(z)`; the block and the customs house are written out as before.** Six
terraces (−1.6 to 6.4 m) end at the lines z 80, 17, −6, −55, −80; lanes at x 0 and ±48 have steps and a ramp in the height
(`RUN`), everywhere else a line is a sheer retaining wall. Town walls at x ±72, z 105 and −100 hold the map's edges inside them.
The block (x ±24) and the square (x ±22) are gated to the districts through arched openings (no gates) at z 30, 5, −18 and 62.
43 houses are `plain` shells (no glass, no casements: T33 counts only made houses); nine district houses are open (a door, one
room, an outside stair up the south face to a gap in the parapet). **Skirmish plays on the new map:** `looking()` is the walk
(Story mode on a look map; Skirmish there is a mission), `WORLD.starts[mode]||WORLD.starts` gives each mode its own starts,
`WORLD.enemies.leave` the loop enemies leave the relay for (`LEAVE`, Kohar Valley's `RING`), the mast group is hidden only while
looking. Stair flights are 1.7 m wide everywhere (the customs house's 1.77: wells 3.6 m, x ±9 to ±12.6; the well partition
leaves 1.67 clear; house A's inside stair 1.7); a district stair has treads ≥ .355 m (27 on a 12 m house, 21 on a 10 m one).
`terraces.js` records every flight in `stats.flights` (`axis, run, across, low, high, width`) for the checks. **Space rules added
(stairs only; the player's flat path and Kohar Valley untouched):** a tread is `brushed` (stepped over by the enemies' rule)
only when it is not under the body's middle and no more than .66 m above the feet; the mover walks *down* steps within `step`
(a drop is left to gravity); what a body stands against at its origin is judged at the origin's own height, and a tread it only
brushed there is not something it may slide along. The enemies' navigation covers the whole town (92,914 places, 181 drops, 6
ladder edges; T38 proves nothing stranded and every district, open house and the customs house entire reached); the player's
flood (T38, .5 m) finds no place without a way back. **Changing map inside a running page is NOT built (MAP-01 stands, item 4 of
the Build 28 brief deferred with a plan in MAP-08):** the world is built when `game.js` loads; a second map needs a reload, which
drops the connection. Headless ceilings for the whole town: 102 draw calls, 588,528 triangles drawn (T32). B24 awaits the user.
Build 27 (local, 2026-09-30): co-op height, map build 6 of 9, and the customs house widened. **Positions always travelled as
three numbers; what was flat was around them, and each fix is gated on `SPACE` so Kohar Valley's co-op is Build 26's (T37
replays a scripted two-player run against `e57e195`).** The guest's health is the host's to keep, so a guest's fall is charged
by the host from the guest's poses (`remoteHeight`: a pose above its floor is a body in the air, the next on a floor a landing,
the drop from the highest pose charged by `fallDamage`; a pose on a ladder, `cl`, is never in the air) and the guest's own
`land()` charges nothing while guesting. Poses and snapshots send `crouch||mustCrouch`. Revive reach is three-dimensional on a
map with height, on both pages and on the host when it takes a guest's `revive`. `mateNow()` keeps the teammate's own height
(it used to put the extrapolated teammate on the terrain: a blast under a floor found it there). Connected on a map to look at
the host runs the AI (and the foes of `?foes=1`) and the guest draws what it is told; `lookReset` never hides the teammate.
Knife, blast and the guest's shots were already three-dimensional (rays and `rewind` with y). **The customs house:** the corridor
3 m (was 2.2), the rooms fewer and larger (halls 62 to 93 m², rooms 44 to 75, the loft 143; closets stay), doorways from the
corridor 1.6 m bare frames (`door: false`, `way()`), doorways between rooms 1.3 m bare frames, the four street doors keep their
leaves swung open; the stair wells stay 4.3 m long (`stairW` z 55.5..59.8, `stairE` 62.8..67.1). A two-page bench cannot be
driven from here; the foes bench and T37 stand for it.
Build 26 (local, 2026-09-30): enemy height on Dehrun Terraces, map build 5 of 9. **On a map with a space the enemies walk a
navigation in layers (`dist/navmesh.js`, made by the kit on demand, `built.navigation()`; Kohar Valley never loads it and
`LAYERS` is null there: every AI change is gated on `LAYERS`, and T36 requires Kohar's cover table, paths, spots and the fire
block to be Build 25's).** The navigation is a flood of the space by a body of the enemies' width (`FOE.radius` .45) under their
own stair rule (`stairs` in `space.js`: treads within .65 m above the feet do not stand in a wide body's way; it climbs by what
is under its middle) with places of their own on every doorway (`stats.doors`), one-way drops ≤ 3 m and ladders both ways
(flooded from ladder tops too); places are recorded only where they were tried, never moved onto the grid. `pathTo`,
`safeSpot(x,z,r,y)`, `planRoute(a,x,z,y)`, `V2(x,z,y)`, loop nodes and travel chains carry a height on layered maps; arrival
needs the level. Cover comes per level (`buildCoverTable(occluders, groundY(x,z,bottom), isFree(x,z,y))`, points carry `y`);
the threat's and the cover's eyes use real heights. `actorHeight` keeps every actor (alive or dead, `sink==null`) to its floor
and lets it fall with the player's `fallDamage`; a fall that kills, or a dead body's fall, leaves blood (`bloodAt`, `decalFor`
downward); a player's shot pushes an enemy .2 m (.5 m when it kills, `shove` in `characterHit`) and a body pushed off within 3 s
is the player's kill; enemies climb ladders (`ladderStep`, approaching from where the wide body fits). `?foes=1` on a look map
puts `look.foes` on their loops and runs `tickAI`; `reinforceTick` does nothing on a look map. User decisions: the block's
doors are 1.3 m (`door()` default) and house A's inside stair 1.05 m so enemies fit (T35 states both); parapets and sills stay
as they are (a .6 m parapet hides the square from the roof within about 9 m: cross-level fights are through windows and
stairwells); fall kills are the player's within 3 s of a push. `space.js` also gained: the hash margin for the widest body,
step-downs judged from the lower level, `stands` (clear with the stair rule).
Build 25 (local, 2026-09-30): kit interiors and the customs house (house K), map build 4 of 9. **The kit builds a storey's
`rooms` (rectangles that tile the inside; a corridor among them) into partitions along every shared edge, with the storey's
`doors` (points on those edges; leaves swung open, 1.3 m in K) and a plain `open` way into each stair; a `stair` climbs a storey
in two flights and a half landing (treads .35 by the storey's sixteenth; a tread shorter than the body's radius is reached two at
a time and blocks) with a railing of posts between the flights, cuts the floor above by itself and, with a `head`, comes out on the
roof through a small house with a door.** Never describe a well for a stair by hand; never put a window where a flight runs
against the wall. The house's tanks stand in a body's way (`tankBoxes`, in the space only). `dist/space.js` gained five rules,
all reaching the block too: a box's footprint includes its edges (a seam is no hole); a walking body over a hole narrower than
itself rests on what is within its lean (`floor(..., feet)`; a falling body lands on what is straight under it); a body keeps its
feet down any step no higher than it can step up (stairs are walked down tread by tread); a move that only lessens an existing
overlap is allowed (`passable`: a body against a wall or under a sill slides out, never further in); a body that lands overlapping
something is pushed clear (`settle`), and it does not step off into a gap narrower than itself (the drop is refused where no push
frees it); a box narrower than `stance` (.2 m: a post, a rail, a beam end) stops a body but holds none up (`thin`). A map may aim its sun (`sun.target`; Kohar has none). The
customs house stands on a walled square south of the block's gate (which stands open: a gate `ajar` past .6 bars nothing in 2D);
houses S1/S2 and one field wall moved beyond it. T35 replays Build 24's kit and description from `8e92bf3` and requires the new
kit to make the very same boxes from the old description. Found, not fixed (E41): the block's 1.05 m doors leave .89 m between
their frame posts, less than a .45 m body needs; a .45 m body cannot begin a .35 m-tread stair under the player's stepping rule
(the enemies' own stair rule is map build 5's).
Build 24 (local, 2026-09-30): player height on Dehrun Terraces, map build 3 of 9. **A map that brings a `space` (the kit builds one from
its boxes: `dist/space.js`) gives the body a real height; Kohar Valley brings none and runs its flat lines, which T34 checks as
unchanged text: never edit the `else` branch of the movement, the camera jump or `blocked` for a height feature.** The body:
`BODY` in `space.js` (radius .34, standing 1.8, crouched 1.1, step .35, pull-up 1.35); falls `FALL` (none to 3 m, fatal at 12,
power 1.5). Every kit box has a top and a bottom; `body: false` lets a body through (glass, casements, ladder rails); large props
are in the space by `hardProps`; the map's edges hold at every height. Stairs are boxes and are walked tread by tread; `wells`
cut floors and ceilings; `ladders` are climbed by walking into them (`exit` must stand clear of copings and hatches). Space
lets go of a ladder, pulls onto a ledge ahead, or jumps. Nothing fires, stabs or throws on a ladder. Measurements are bench
URLs the user opens (B20 awaits them). **E40: the kit cannot build the Ambush arena yet** (no partitions, rooms, corridors,
turning stairs, roof doors): its own build, recommended before the layout build.
Build 23 (local, 2026-09-29): look slice critique and fixes. **The user approved the look slice: build Dehrun Terraces this way.**
**A fault in the kit is a fault in every block**: T33 checks the kit's work. No two different surfaces may lie in one plane where
they can be seen (it flickers): a terrace's ground ends behind the face of its retaining wall, a roof lies above the walls it rests
on, lintels and sills stand off the wall's planes, walls end inside their corners. Windows have a casement and glass (`pane` shut,
`clear` open), shut doors stand in the opening; awnings are woven cloth that sags, carried by posts or brackets, in the block's
colours; beam ends come from `chance`, never evenly; balconies are propped; surfaces carry shade in their geometry's colours
(`stain`). The light comes from where the sun stands in the sky's picture (`sky.turn`). Houses `beyond` the walls are `plain`.
**Measured in Safari (B19): the block at 350,000 triangles runs at 2.2 to 2.75 ms a frame, faster than Kohar Valley's 3.0 to 3.3; the ceilings were raised to 700 draw calls and 700,000 triangles.** A Safari measurement is run by the user opening the bench pages in their own window when Claude's window will not come forward. **Layout
requirement (user, E38): the Ambush arena of Dehrun Terraces is a large multi-storey building designed for it from the start
(internal stairs, a roof, a street around it); if that cannot work within the map, say so and do not compromise.** Doors must be
wide enough for enemies before any mode is played there.
Build 22 (local, 2026-09-29): the look slice of Dehrun Terraces, map build 2 of 9. **Kohar Valley must fetch nothing of the new
map**: `map-dehrun.js`, `terraces.js` and `GLTFLoader.js` are never imported by a module the game loads with Kohar Valley (only
`maps.js` fetches the description, by `import('./map-dehrun.js')`, for the address `?map=dehrun`); a later import must name its
module in full so that the import map versions it. The kit holds no place: every position is in the map's `block`. A map may bring
`build`, `terrain.surface` (the drawn ground, below what is built), its own light and `look` (a map to walk and look at: nobody
else, no mission); where a map names none of these the game's old values stand, and Kohar Valley names none. Models are one
`.glb` each with their pictures inside, asked for with `fetch(assetURL(...))` and handed to the loader as bytes; each kind of prop
is one `InstancedMesh` per part. Ceilings for a block: 700 draw calls, 700,000 triangles, everything drawn (T32; raised after B19: the block at 350,000 runs at 2.7 ms in Safari, faster than Kohar Valley); the new map's
assets stay under 30 MB unless the user raises the cap. No light source is added by the kit. **Safari: never take it without
asking the user first and waiting for their word** (user, 2026-09-29: the Build 22 measurement took Safari from their work every
few seconds and was stopped); a measurement must run as one blocking step, never from a background job. The block's Safari
measurement is outstanding (B18).
Build 21 (local, 2026-09-29): Kohar Valley as map data, map build 1 of 9 (E33, E34). **Every place, edge, grid size, start,
objective, enemy post and route and the Ambush arena is in the map (`dist/map-kohar.js`); never write one in the code.**
`game.js` reads the active map as `WORLD` (`EDGE`, `NAV_N`, `NAV_STEP`, `NAV_0`); `AREAS`, `GATES`, `STATIONS`, `ARENA_WALLS`,
`MAP`, `ENEMY_SPAWNS`, `PATROL_LOOPS`, `LOOP_ASSIGN`, `REINFORCE_LOOPS`, `REINFORCE_POINTS` and `VILLAGE_PROPS` follow it
(`onMap`). How things behave (speeds, damage, wave sizes, `AMBUSH`, `ENEMY_AI`) is not map data. **Kohar Valley must stay what
Build 20 had**: T31 compares the built world number for number with Build 20 taken from its commit `7a9bb82` and run on the
spot (`tests/old-build.mjs`). **Never make a suite depend on a record stored from one machine**: GitHub's runner is another
machine, and the first push of Build 21 failed there on a byte-exact record made on the Mac. Compare with an older build run on
the spot (`oldBuild`, `build09Trace`); a stored record may be reported (`storedRecordAgrees`), never required. The world is built once at load: a map is chosen before that (`selectMap`), and changing
map inside a running page is not built (MAP-01; co-op will need it). Older builds that the suites load run against the
current modules: keep `dressWorld` working without `world` and `AMBUSH.start` answering. **User decisions for the map project
(E34):** the look slice is the next build; the new map is a hill town in terraces (working name Dehrun Terraces); stairs,
ladders and mantling are requested (not built yet); fall damage none up to 3 m, fatal at 12 m, enemies alike; CC0 assets
preferred, credit-line assets allowed, nothing paid, and the user approves the list before anything is downloaded. Kohar
Valley's walls and props stay as tall as they are for movement when height arrives. Long test runs: keep the machine awake
(`caffeinate -i`); it slept in the middle of one.
Build 20 (local, 2026-09-29): co-op fixes and revive, after the user's first two-player playtest. **The session outlives the
mission: nothing in the game may close the connection except the DISCONNECT button and a lost connection.** `goMenu()` and
`setMode()` close nothing while connected; `lobby` takes the other player along to the menu once a mission is over, `left`
says a guest left one in progress. Co-op modes are `LINKABLE` (`coop` = Story co-op, `skirmish` when deployed while connected,
`ambush` when deployed while connected); `net()` covers all three. **In co-op a player whose health runs out is down, not
dead** (`humanDown`, `fallen`, `REVIVE`: 4 s to revive, 30 s to wait, 2 m, 40 health); the host keeps the clocks (`fallTick`)
and sends them in every snapshot (`fall`); the mission ends when both are down at once, and in Story and Skirmish when a
downed player is not revived in time. Alone, going down ends the mission as it always did. A player's hit shape is a body and
a head (`BODY`, `boxEntry`); do not widen the head. Enemy damage to players (12 to 22 times armor) is intended and unchanged.
To measure in Safari, bring it to the front with `open -a Safari`; AppleScript's `activate` does not do it.
Build 19 (local, 2026-09-29): equipment. `dist/equipment.js` holds every number and pure rule (sidearm, knife, the three
throwables, loadouts, prices); change them there. The weapon in hand is `hand()` / `handConfig()` (slot 0 rifle, 1 sidearm);
never read `weapon` or `gunConfig()` for what is being fired, shown or bought for. Rifles must stay what they were:
`hitDamage` returns a rifle's `damage` and 110 to the head at any range. Sight is `visible()` (walls and smoke); `clear()` is
walls only and is for what smoke must not stop (blasts, the knife). **Nothing in the equipment may draw a seeded number or
touch an enemy until a player uses an item**: Story and Skirmish replay the Build 09 trace and solo Ambush replays Build 15.
Thrown items, clouds and blasts come from pools made once (8, 4, 3); a throw must never create a mesh, material or texture
(T29 counts them). In co-op the host decides every hit, blast, blinding and count; the guest's knife, throw, draw and reload
are judged by the guest's picture (`rewind`) or counted from when the guest began them (`sinceSent`), never from arrival. Blasts
and flashes catch the teammate where it is now (`mateNow`). A deliberate-breakage run changes files in `dist/` for seconds at a
time: after any interruption, compare `dist/` with the last commit before trusting it.
Build 18 (local, 2026-09-28): Ambush fairness and cleanup. **Standing decisions: Ambush never has AI squadmates, in any
configuration (the only teammate there is a real player); co-op must be fair between host and guest.** `squadWanted()` is
false in Ambush whatever is stored or sent; do not add an Ambush key to `squadPref`. Anything that judges, pays, spawns, times
or shows must treat the two players alike: check it from both sides (T28 does). Shots are judged against what the shooter saw
(`rewind`, `viewTime`; cap `NETVIEW.cap` 300 ms; the guest's picture is the straight line between the last two snapshots at
`viewAt()`, drawn by `netDraw`; do not bring back smoothing toward the newest snapshot, the host cannot reproduce it). The
guest's rifle is counted by `remoteFire` (one shot per fire interval, banked up to the cap), its reload and dressing from when
the guest began them (`sinceSent`). Each wave's arrivals are dealt equally by count (`amb.sent`), each from the wave's
direction as its own player sees it (`amb.origins`), with fallbacks that never hold up the wave; an enemy changes player only
when its own is down. Either player's pause holds the mission (`hold`, `matePaused`). Found, not fixed: AI-07 (dead enemies
keep attack tokens); fixing it changes solo difficulty and the traces, so only on request.
Build 17 (local, 2026-09-28; its Ambush part removed in Build 18): the AI squad is the player's choice in Story, Skirmish
and Story co-op (`squadPref` in `game.js`, the box `#squad-ai`). Untouched it is on. `squadActive` is what the
mission was deployed with; read it, never the box and never the mode, to decide whether squadmates exist. In co-op the host's
choice governs (`squad` in the `mode` and `start` messages, `hostSquad` on the guest); the co-op teammate (`remote`) is a real
player and is never attached, detached or replaced by this. `reset()` must keep attaching the squad before the actors are
reset and detach afterwards: the reset draws seeded random numbers per actor, and solo Ambush must replay Build 15. At a
co-op extraction a downed player banks alongside the survivor (user decision); both down or a player who left banks nothing.
Build 16 (local, 2026-09-28): Ambush co-op, two real players (F.11). A networked mission is Story co-op (`mode==='coop'`) or
an Ambush run started while connected (`amb.coop`); use `net()`, `hosting()`, `guesting()`, `ambCoop()`, never `mode==='coop'`
alone, for anything that sends or receives. The host owns waves, spawns, barricades, both players' points (`amb` is the local
player's, `amb.mate` the teammate's) and every hit; the guest sends `pose`, `shot`, `buy`, `vote` and applies `ambushApply`.
User decisions, do not change without a request: points per player, barricades shared, crate purchases individual; one player
down spectates and the run ends only when both are down. Built on top: extracting takes both choices (`ambushVote`), co-op waves use `waveSpec(n, 2)` (`AMBUSH.coop`) only while both are up. **Solo Ambush must stay identical
to Build 15** (`abb41c9`; T26 replays it): every co-op branch must leave the solo path reading the same `player` object and
drawing the same random numbers. Personal bests use two keys (`BEST_KEY`, `BEST_KEY_COOP`). The co-op teammate is
`soldier('ally',3,'mate')`: blue, with an unlit marker drawn over everything, in every co-op mode. Friendly fire is on in co-op
through one body box and one damage rule for both players (`friendlyHit`, `friendlyDamage`); the teammate's meshes are never in
the hit test. AI-03 is fixed: enemies fire at the teammate with the host's chance, crouch factor and damage (T13 undoes exactly
those substitutions and compares with Build 06). NET-04 is fixed: `disconnected` holds the session for `graceTime` and the
mission is held on both pages while `peer.unstable`. A two-instance headless test, a two-tab test and a two-browser test on one
machine cannot show what two networks or two people do: say so.
Build 15 (local, 2026-09-28): COOP-01, the co-op handshake. Connection codes are
`DUSTLINE:<H|A>:<length>:<payload>:<checksum>` (`makeCode`/`readCode` in `dist/network.js`); pasted
codes go through `PeerSquad.submit`, which acts on the kind of code, not on the button; every
rejection has its own reason and message (never a generic one), and a connection that fails after a
correct exchange is reported as a network failure (no TURN relay, NET-01). Keep invisible characters
in source as written-out escapes. A two-tab test on one machine cannot show a cross-network failure:
say so whenever co-op is reported as verified.
Build 14 (local, 2026-09-27): Ambush map and signposting rework. One signpost instead of four: M in Ambush
opens the full-screen map (`ambushToggleMap`, `ambushDrawMap`), drawn only from `mapLayout()` in
`dist/ambush.js`, whose labels must never overlap, cover a marker or leave the canvas (T24). In the
world every standing barricade and every crate carries a marking from `buildMarking` (paint, painted
board, lantern lit while it can be bought), re-made from the state by `ambushMarkings`. Do not bring
back signal masts, HUD waypoint lines, a HUD area list or a minimap in Ambush. Story and Skirmish keep
their M panel (`body.tactical`). Area 4 is "North houses" (north on the HUD compass).
Build 13 (local, 2026-09-27): `ambushState(open, standing)` in `dist/ambush.js` is the one source for
where barricades, areas and crates stand and whether each is open, purchasable or locked; everything
that shows them reads it and must never keep its own copy. The solo difficulty curve (2 -> 9) is
confirmed by the user's playtest (wave 8, 99 kills, 11m10s): do not change it or any price without an
explicit request (economy options are in the roadmap, E25). Filed: co-op with real players only in
every mode (F.13); friends-only PvP (F.14), blocked until AI-03 is fixed.
Build 12 (local, 2026-09-25): Ambush solo and purchase clarity. **Ambush is permanently solo for AI purposes:
no bot squad, ever** (`ambushSquad(false)` in `ambushReset` detaches the three squadmates, `reset()` puts
them back at indices 0-2 for every other mode; future Ambush co-op means real players only). Solo cap
curve `min(aliveCeiling 9, 1+ceil(n/2))`, arrival floor 1 s, pool 16. Rifles bought at crates carry
`rifleMagazines` (5, clamped by `rifleMagazines(config)`), N buys a dressing (`dressingPrice`, kit
`dressingMax`), the crate prompt uses `weaponTradeoff` (plain words from live `CLASSES`). All action
keys live in `KEYS` in `game.js`; every hint must read it (T22 presses the shown key). The dressing
line in the vitals panel stays visible in play.
Build 11 (local, 2026-09-25): Ambush difficulty and economy. Alive cap `min(aliveCeiling, 3+ceil(n/2))`
(12 from wave 17) with `enemyPool` (20) Ambush-only enemy actors attached by `ambushPool(true)` in
`ambushReset` and detached at the start of every `reset()` (Story/Skirmish/co-op always see 7 enemies and
10 local actors; never let extras leak). Magazines (B key, `ambushBuyAmmo`, `magazinePrice`) replace
the half-price refill; a bought rifle gets `rifleMagazines`. Crate prompts come from `weaponCompare`
(live `CLASSES` values, never text). `dist/records.js` keeps the Ambush personal best in localStorage
(one key, guarded; the only persistent data). Spawn spots need a route ≤ `spawnMaxRoute`; cover must lie
on the route (`coverOnRoute`). Build 10 playtest: wave 7, no stalls, confirmed working.
Build 10 (local, 2026-09-24): Ambush playtest fixes. Ambush enemies run `ambushPlan` (role
`ambush` only): advance to a slot `holdRange` from the player, stop to fire inside the wave's
`fightRange`, brief cover only where it gains ground, push failsafe after `pushAfter` s without
progress, stuck watchdog (`stallTime`/`stallStep`, AMB-04), last-resort recycle after
`recycleAfter` s unseen. Waves arrive from one bearing (`sectorSpread`). The four `ARENA_WALLS`
are kept out of the static batch and lowered to `arenaWallHeight` (1.2 m) in Ambush only.
Story/Skirmish enemy behaviour must stay trace-identical to `tests/fixtures/story-skirmish-ai-b09.json`
(T20 replays it; re-record only from the Build 09 source `6560f7a` with `--record`). All Build 10
tunables live in `AMBUSH` in `dist/ambush.js`. Never touch the shared movement/stuck code to fix an
Ambush-only problem; keep fixes inside `ambushPlan`/`ambushDirector`.
Build 09 (local, 2026-09-24): Ambush mode phase 1, solo wave survival in the west
district (`dist/ambush.js` data and rules, `game.js` Ambush block). Four areas behind
purchasable barricades, weapon crates with the four class rifles (the weapon id `gunId`
is separate from the class only after a purchase), an out-of-bounds line with a 5 s
countdown, and a timed extract/stay choice from wave 5. Waves scale count, alive cap,
arrival rate and aggression only, never enemy accuracy or damage. Spawns must stay unseen,
35 m+ away and 6 m+ outside the open arena; Ambush geometry exists only in Ambush.
The setting stays fictional: maps must not be tied to real conflicts.
Build 08 (local, 2026-09-24): death variants chosen per kill and sent to the guest
(`dv`/`st`); enemy corpses shootable for blood only (never score, kills or mission) and
sunk after `corpseLife`/beyond `corpseMax` (`gn` snapshot mask); reinforcement waves
(`waveSize`); 183 props in `dist/village-props.js` (bundled materials only; solid props are
unrotated boxes kept clear of spawns, loops, entries and objectives). DEPLOY-01 (fixed):
every module and asset URL carries a content hash (import map + `assetURL()` from
`dist/build.js`), and `index.html` starts the game only when the served page has the same
build token. After editing anything in `dist/`, run `node tools/stamp-build.mjs` (the
cache test fails otherwise). Keep relative import specifiers plain (no `?v=`), load
assets only through `assetURL()`, and add no dynamic imports or workers without
extending the stamp. AI-04 (fixed): enemies sight-check every target in range (their foe
first) and stay engaged while their foe is alive and within `engageLeash`; do not reintroduce
the nearest-three limit for enemies or end an engagement on the sight timer alone.
Build 07 (local, 2026-09-24): enemies patrol, use cover and reposition, with bounded
reinforcements (`dist/enemy-ai.js` holds every tunable in `ENEMY_AI`, read live);
navigation matches collision and every placement is validated (AI-02); the terrain is
raycast only where a ray crosses it (PERF-02, proven identical); P pauses/resumes
without leaving fullscreen (Escape is the browser's key). Build 06 corrected combat
feel; Build 04 removed sprint stamina entirely and the user accepted M1 in Safari.
Never reintroduce exhaustion, recharge delays, stamina gates or a stamina HUD. Keep
current class speeds, weapon balance and combat interruption rules. Stairs, ladders
and mantling are requested for the map project (user, 2026-09-29, E34) and belong to
its height builds; do not add them to Kohar Valley.

Preserve Kohar Valley, Viper squad, the convoy route log, relay and extraction;
the four classes; combat and reload behavior; bots; experimental co-op; and
pointer capture, pause and leave controls. Only player kills count (KILL-01 is
intentional; hitting a teammate never counts or pays). Co-op: the host is authoritative for hits and sends `impact`
messages (zone, victim yaw and decal included); snapshots own HP but must not set
death rotation. Both players must run the same build; change the menu build label
whenever co-op messages change. Cosmetic effects use Math.random, never the seeded
gameplay rand(); enemy AI decisions use its own seeded `aiRng`. Nothing may raycast the
terrain mesh directly (use `terrainRay`/`terrainAt`). Enemy fire cadence, hit chance and
damage (the fire block and `aiHit`) must stay unchanged unless explicitly requested.
Do not rebind Escape as pause: browsers exit fullscreen on Escape before the page sees it.

## Run and verify

From this directory:

```sh
python3 -m http.server 8765 --directory dist
```

Open `http://localhost:8765/` in a full desktop browser for gameplay. Opening the
HTML file directly will not load the modules. Browser pointer lock captures the
mouse/trackpad during play; it does not need desktop recording permissions.

With a current Node.js version (last verified with 24.19.0):

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
node tests/test-lookslice-b22.mjs
node tests/test-kit-b23.mjs
node tests/test-height-b24.mjs
node tests/test-arena-b25.mjs
node tests/test-foes-b26.mjs
node tests/test-coopheight-b27.mjs
node tests/test-town-b28.mjs
node tests/test-windows-b29.mjs
node tests/test-frames-b30.mjs
node tests/test-corners-b31.mjs
node tests/test-mapchange-b32.mjs
node tests/test-ambush-dehrun-b33.mjs
node tests/test-difficulty-b34.mjs
```

`dist/diagnostics.js` is the F3 measurement overlay. It must stay read-only: gameplay
must be bit-identical with it off or on (checked by the diagnostics test). Read
`NOW.md` for the current task state.

The last checked Build 34 source passed 34 movement, 24 firing, 3 diagnostics,
10 + 16 combat-feel, 12 enemy, 6 terrain-equivalence, 11 pause/fullscreen, 5 Build 08
scenario, 6 file-versioning, 3 enemy-engagement, 9 Ambush, 8 Build 10, 6 Build 11, 6 Build 12, 3 Build 13, 5 Build 14, 6 co-op handshake, 13 Ambush co-op, 8 squad-toggle, 8 fairness, 14 equipment, 10 session-and-revive, 7 map-data, 5 look-slice, 6 building-kit, 8 height, 8 arena, 8 enemy-height, 8 co-op-height, 6 town, 9 windows-and-stairs, 6 frames-and-eye, 7 corners-and-stairs, 7 map-change, 11 Dehrun-Ambush and 8 difficulty-and-movement checks (330 in 37 suites). These
mock rendering, pointer capture and network transport. Human camera/movement
feel, GPU frame pacing and live WebRTC acceptance remain UNVERIFIED. Do not
request desktop screen/audio recording. Label tests honestly and never treat
headless results as a real gameplay or network playtest.

## Hosting and portability

The repository is https://github.com/alex-wilson141/Dustline (public, branch `main`, remote
`origin`). The live game is https://alex-wilson141.github.io/Dustline/ , served by GitHub Pages
from `dist/` as the site root. **Every push to `main` publishes**: `.github/workflows/pages.yml`
runs `node tools/stamp-build.mjs --check` and every `tests/test-*.mjs` suite, and deploys only if
all pass. So: never push a build the user has not asked to release, stamp before committing, and
keep the suites green. The site lives under the path `/Dustline/`: keep every URL in `dist/`
relative. Commits use the GitHub no-reply address (repo-local `user.email`); never put the user's
personal email, local user name or absolute home paths in tracked files. Commit IDs were rewritten
on 2026-09-27; the old-to-new table is in the roadmap (H2).

The earlier public Site https://dustline-mountain-front.smart-heron-4139.chatgpt.site/ is a
separate, older deployment; repository access does not publish to it. Assets are bundled; co-op
setup uses Google STUN and has no TURN relay. The game has no account, database or save backend
(the Ambush personal bests, solo and co-op, are browser storage only).

Historical `work/` checks mentioned in the roadmap belong to the original
workspace and are not in this transfer. The two current regression suites above
are included and portable. Use this repository root in a new checkout.
