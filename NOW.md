# NOW — DUSTLINE current state

_Updated 2026-10-01. The master tracker is `DUSTLINE-ROADMAP.md`; this file is the short version._

**Build 37 is committed locally and NOT pushed** (squad codes and fast publishing). **Build 24 is LIVE.** **The user plays locally and says when a build is to be published: do not push. Do not take Safari: give bench URLs.**

**Build 37 in short: CREATE SQUAD gives a 4-character code and JOIN SQUAD connects by it, through the service you deployed; publishing is gated by two minutes of suites instead of all of them. Your friend can only use squad codes once this build is published: the live site is still Build 24.**
- **The service is deployed (by the user, 2026-10-01) at `https://dustline-squad.awilson183.workers.dev` and its address is set in `dist/squad.js`.** Checked against the live service the same day: `/health` answers; a code is issued, refused to another build without being used up, redeemed once, refused the second time, the answer handed over once and the record gone; a wrong key and a wrong ticket are refused; another site's page and a request with no origin are refused; a cancelled code is gone. **Two real browser tabs on this machine connected by a code through it (real WebRTC, one network).** **Not yet verified: two players on two networks (the test below), and the publish time on GitHub.** A copy of the game with no address set still offers the manual connection only.
- **1. The service (E54):** a Cloudflare Worker and one Durable Object, source in `service/` (outside `dist/`: versioned, never served). It holds the host's connection description under a code, gives it to the one player who enters the code, and passes the answer back. No game data.
- **2. Codes:** 4 characters from 31 with no 0, 1, I, L or O; issued only when no live code holds them; one use; ten minutes. Typed in any case, with spaces.
- **3. The long codes** are behind a "Manual connection" link that appears only when the service cannot do its work (cannot be reached, times out, answers with an error, is busy, or none is set). Never for a wrong, used or expired code or a build mismatch. Nothing falls back silently.
- **4. The cases:** a host who reloads takes the code back as the page goes (or is refused to joiners 12 s later), and makes a new one; an uninvited joiner who enters a live code first is connected, the invited friend is told the code was used, the host disconnects and makes another; a build mismatch is said to the joiner, both reload, and the code is not used up; the service being down is said and the manual link offered.
- **Privacy:** stored per code: both connection descriptions (they contain network addresses), the build, two random keys, three times. Deleted when the answer is collected (seconds after the join), on cancel, a minute after the host stops asking, at ten minutes at the latest. No logs, the caller's address never read.
- **5. Publishing:** a push now runs the stamp check and 31 quick suites, the three traces among them, four at once: **2 minutes here; about 5 on GitHub with the deploy (an estimate until the first push; the last measured publish, Build 24, took 12 minutes, and all of today's suites one after another would take about 28).** The nine slow suites run in a second workflow after the push, every Monday, and on request (Actions > Full regression run). **Given up:** a fault only a slow suite catches goes live if the local full run was skipped or the fault shows only on GitHub's machine; the commit turns red some minutes later.
- **What to try, with your friend, once this build is published (say so and I push):** both open https://alex-wilson141.github.io/Dustline/ and check the menu says BUILD 37; both choose PRIVATE CO-OP; one presses CREATE SQUAD and reads out the code, the other types it and presses JOIN SQUAD; both should read "Connected" within a few seconds; the host deploys any mode. Then: type a wrong code; reuse the code; reload the host while waiting and try the old code. **Alone, now:** two browser windows on `http://localhost:8765/`, the same steps.
- **Checks:** 40 suites, 353 checks, all pass (headless), the three traces identical. T47 is new (10 checks). Breakage pass: 56 of 57 caught (see the roadmap's change log).
- **Not verified by anything here:** a code across two networks, the publish time on GitHub.
- **Found, not fixed (NET-06):** nothing limits how often one caller may guess codes (the service keeps nothing about callers); a code is used up when someone joins, even if their page then fails.

**Decisions for the user (Build 37):**
- **Publish Build 37** (it carries Builds 25 to 36 with it: the live site is Build 24) so that your friend can use squad codes: say so and I push.
- **The full run after every push** (not holding the publish up) as well as weekly and on request: keep, or weekly and on request only.
- **Which suites are slow:** the nine over half a minute. The map-data suite (Kohar Valley's world against Build 20, 253 s) is among them: say if it should gate a publish anyway (it adds about three minutes).

**Build 36 is committed locally and NOT pushed** (movement naturalness and spawn spread on Dehrun Terraces).

**Build 36 in short: Dehrun's hostiles move like people, rushers carry a blade you can see coming, the beep tells you where the bomber is, and they arrive from round you** (`http://localhost:8765/`, DEHRUN TERRACES, Ambush). Kohar Valley's Ambush is untouched.
- **1. The jagged movement: the cause and the change (E53).** Four things together: ways were lists of grid places walked place to place (a staircase of right angles, twelve a second at a run); Build 35's own choice among equally short ways made each staircase a different random one; its lanes moved every place sideways by its own measure, so the next place could lie behind; and the body faced the next place in one frame. Now the way is pulled straight and followed by steering: a heading that turns no faster than a person, speed that gains and brakes, slower through a corner and on stairs, the body turning to face. **Measured over four minutes, frame by frame, against Build 35 played from its commit: frames turning faster than a full turn a second 1.0% (Build 35 11.7%); reversals in a single frame 3 a minute (129); the body's turn in the 99th frame of 100: 345 degrees a second (7,458).**
- **The variety held, and needed work to hold:** the smoothing bunched their speeds and put them in file. Each keeps its own pace on stairs and through doors, the range of own speeds is wider (.75 to 1.3), and one close behind another steps out beside it. T45 passes: speeds differ by 13 parts in 100 of their speed (Build 35: 12, Build 34: 3), four lanes along the corridor, one behind another 7 times in 100 (limit 25). **All of them are slower than in Build 35 (4.2 m/s on average against 5.7): they brake for corners and take stairs at a stair's pace.**
- **2. Rushers carry a machete, not a rifle,** and the strike is seen: within reach the blade goes up, and lands 0.35 s later only if you are still within reach. Step back and it misses. The guest sees the blade and every swing.
- **3. Rushers can be hit:** within 9 m and in sight a rusher comes in a straight line. A scripted aim (lagging 0.2 s, turning at most 200 degrees a second, ten rounds a second, in the loft where they come through doorways) **puts 64 rounds in 100 on the body; on Build 35's rushers, 37** (62 and 39 in another run). They cross the aim sideways at 3.2 m/s where Build 35's crossed at 5.1. Their speed is 6 m/s as before (each within a tenth).
- **4. The beep:** heard from 16 m (was 30), to the side the bomber is on, duller when it is behind you, and through a wall or a floor three tenths as loud and muffled. The three-second warning stands (never less than 3.7 s from the first beep).
- **5. Arrivals from round you (E53).** Each arrival starts from its own direction, 135 degrees on from the last. New ways in: a low stretch in the square's west wall, its east wall and two in its south wall, each with a ladder outside and a drop inside (no way out for you); three more ladders to the roof (four: north-east corner, north face, south-west corner, south face); twice as many through windows; roof-comers go on down by the east stair. **Measured as the compass direction from where you stand to each hostile when it first comes into your sight within 15 m, 200 s at each place, against Build 35:**

| You stand | Build 35 | Build 36 |
|---|---|---|
| Top floor (start) | E 12, W 11 | E 9, W 7 |
| First floor | W 21 (all) | E 9, W 12 |
| Ground floor | N 21 (all) | N 7, E 6, S 4, W 2 |
| Roof | NE 11, E 10 | E 12, SE 2, NW 7 |
| Square (by the south wall) | N 20, E 7, W 8 | N 11, E 15, W 10 |

- **Honest limits:** the ground floor's spread varies from run to run: another run of the same 200 s gave N 12, E 6, S 1 (the north door is always the largest share). The top and first floors have a stair at each end and no other way in, so two opposite directions is all they can have (more needs hostiles climbing ladders into upper windows: a decision below). On the square nothing may start within 35 m of you, so standing by the south wall you get none from the south.
- **What to try:** Ambush on Dehrun. Watch a hostile cross a room and turn a corner; watch a group come along the corridor (side by side, not in file?). Let a rusher reach you and step back as the blade goes up. Stand still with a bomber somewhere below and turn your head: can you point at it? Then buy the first floor and the ground floor and hold each for a wave: where do they come from? Go on the roof (four ladder heads). From the square, look at the low stretches of wall and the ladders.
- **Checks:** 39 suites, 343 checks, all pass (headless), the three traces identical. T46 is new (5 checks). Breakage pass: 31 of 32 caught (removing the lanes alone is not caught: other rules give lanes too); see the roadmap's change log.
- **Safari (B32): awaiting the user.** `http://localhost:8770/b36/?map=dehrun&bench=ambush&case=dehrun3run&stand=ground` (**arrival angles round you on the ground floor: the title's `angles` are counts for N, NE, E, SE, S, SW, W, NW, live while it runs**) · the same with `&stand=first`, `&stand=roof`, `&stand=top`, `&stand=square` · `http://localhost:8770/b36/?map=dehrun&bench=ambush&case=dehrun12` (wave 12 from the top floor: frame times with ten steered hostiles) · `http://localhost:8770/b36/?bench=ambush&case=kohar12` (the control) · to look at: `http://localhost:8770/b36/?map=dehrun&bench=shots&at=6.4,6.6,61.9,0.75,0.1&kinds=1&swing=1` (a rusher swinging beside a bomber). About two and a half minutes each. (The bench server must be running: `python3 -m http.server 8770` in the bench folder; ask me to start it.)
- **Found, not fixed (MAP-16):** arrivals on the top floor are about a fifth slower than Build 35's (16 in 200 s against about 21: they start further round and take stairs slower); the far run at 7 m/s instead of 6 made no measurable difference and was put back. A door-way hostile that starts south of the house still enters by the north door (the three other street doors are the player's barricades). The blade is three boxes; the swing is one arm. I looked at the blade, the swing and the west wall's low stretch in the browser; the south buttresses and the outside ladders I have not seen rendered from outside.

**Decisions for the user (Build 36):**
- **Pace:** arrivals on the top floor are about a fifth slower. Leave, or shorten the gaps or raise the number alive to make it up.
- **Ladders into upper windows:** the only way to give the top and first floors more than two directions. Build, or leave them two-ended.
- **Rushers at 6 m/s with the line and the wind-up:** keep, or slow them.
- **The low wall stretches and five more ladders** change how the square and the house look: keep, or say which to remove.
- **Next (your order):** marksmen and rocket hostiles with the roof arena.

**Build 35 is committed locally and NOT pushed** (hostile variety on Dehrun Terraces).

**Build 35 in short: Dehrun's hostiles are no longer one kind running one script: they differ one from the next, some rush you with a blade, some carry a bomb, and the mix changes with the wave** (`http://localhost:8765/`, DEHRUN TERRACES, Ambush). Kohar Valley's Ambush is untouched.
- **1. Every hostile differs from the next (E52).** Each arrival draws its own: speed (.85 to 1.2 of the usual), the distance it holds at (3.5 to 8.5 m, where all held at 7), how far off it will stop to fire, how long it stops, whether it stops at all before it is close (one in four does not), and a lane: the first walks by the left wall, the next right of the middle, the next left of it, the next by the right wall, across whatever width the corridor, room or stair has. Where two ways are equally short each takes its own. Each makes for a place of its own beside you that can see you (not the next room), no one stops within 1.6 m of one already firing, and one close behind another slows until the gap opens. Arrivals come at uneven gaps (half to one and a half times the wave's).
- **Measured, the same run played by Build 34 from its commit and by this build (four waves from the top floor):** places they stopped to fire: **18 places for 50 stops, where Build 34 had 9 places for 104** (three or four in every ten stops is a new place; it was under one). Speeds between hostiles: **4.4 to 6.9 m/s, where Build 34's were 5.2 to 5.8.** Along the corridor: **four lanes over .4 to .6 m; Build 34's never came along it, they stopped at its ends.** One directly behind another while both move: from one time in twenty-five to one in four, run to run (Build 34's were almost never moving two at a time, so that number has no fair comparison).
- **Three faults this measuring found and fixed, all of the kind you described:** two hostiles paced the next room for twenty minutes without ever coming in (they made for a spot beside you that could not see you, lost you, came out, saw you, went back); one was sent through a wall it stood against (its way was started from the nearest place, which was on the other side); and progress was counted by a shortening list of places, which pacing shortens for ever, so nothing pushed them in. A hostile that has not seen you for five seconds now comes for you, ways start from a place it can walk to, and progress is metres of way.
- **2. Rushers:** red cloth on the head and across the chest. They run at you at about 6 m/s seen or not, never stop, never shoot, and strike with a blade in reach (1.9 m): **28 health times armor, once a second**. From coming onto your floor to the first strike: about two seconds. Two in wave 1, a share that grows to two in five by wave 10.
- **3. Bombers:** a black vest of charges with an amber light, front and back, that blinks; and a beep. **The warning: the beep is heard from 30 m (through floors: you hear it coming up the house for about twenty seconds), once a second at first and eight times a second at arm's length; it is in your sight for 2.7 s or more before it can go off (measured, the shortest); and it may not go off before it has been in earshot three seconds, then stands still for a fuse of .7 s. So never less than 3.7 s from the first beep, whatever happens.** It goes off within 2.4 m of you with nothing between, exactly as a fragmentation grenade does (the same blast: it hurts you, your teammate, other hostiles, and breaks glass). **Shot dead first, it does not go off.** It is nobody's kill and pays nothing when it goes off; killing it pays as any kill. None in wave 1; one in waves 2 and 3, two in 4 and 5, up to a quarter of a wave.
- **4. The mix by wave:** wave 1: 7 rifles, 2 rushers. Wave 3: 11, 3, 1 bomber. Wave 5: 13, 6, 2. Wave 8: 15, 11, 4. **Wave 12: 19 rifles, 17 rushers, 6 bombers** (under half are rifles; at wave 3 three in four are).
- **5. Two players:** each player's arrivals have their own list of kinds (a first version dealt one list in turn and gave one player every bomber: T45 found it); the guest sees each kind's marks and hears the beep on its own page; a rusher strikes the guest for the same; a bomber at the guest goes off on both pages.
- **The ladder:** no more than two are on their way to it at once, two and a half seconds apart; one that still has to wait a second takes another way. Measured: in ten waves nobody waited (Build 34: one, for under a second: the line of five I warned of in Build 34 never formed in play). Five set down at its foot at once: one or two climb, the rest leave within a second (Build 34: three stood waiting three seconds).
- **What to try:** Ambush on Dehrun from the top floor. Wave 1: two red-cloth rushers among the rifles: see whether you can hold an angle with one coming. Wave 2: listen for the beep and find the black vest before it finds you; shoot it; then let one reach you once. Watch the corridor: do they still come in a file? Watch where they stop. With your teammate: both should see red and black on the same hostiles, and both hear the beep.
- **Checks:** 38 suites, 338 checks, all pass (headless), the three traces identical. T45 is new (8 checks). Breakage pass: see the roadmap's change log.
- **Safari (B31): awaiting the user.** `http://localhost:8770/b35/?map=dehrun&bench=ambush&case=dehrun2run` (**early waves one after another from wave 2: the title's `kindsSent` is the mix wave by wave, `came` the ways, `blasts` the bombers that went off**) · `http://localhost:8770/b35/?map=dehrun&bench=ambush&case=dehrun12` (**wave 12 over and over: 10 alive, 17 rushers and 6 bombers in 42**) · `http://localhost:8770/b35/?map=dehrun&bench=ambush&case=dehrun12open` · `http://localhost:8770/b35/?bench=ambush&case=kohar12` (the control). About two and a half minutes each.
- **Found, not fixed (MAP-15):** a rusher's strike has no animation (it stands against you and you lose health with the hit sound); the bomber's and the rusher's marks are boxes on the old soldier (the models build); the beep is the synthesized tone (the sound build) and is not muffled by walls; in a narrow doorway or on a stair they are still one behind another (there is one body's width); a hostile stops beeping the frame it dies but its light stays lit on the body.

**Decisions for the user (Build 35):**
- **The rusher's strike (28 a second):** it is a new way for hostiles to hurt you. Keep, or change the number.
- **The bomber's warning (3.7 s at least; 2.7 s in sight in practice) and its numbers** (one for every two waves, a quarter at most; lethal at arm's length as a grenade is).
- **The mix** (rushers 17% rising to 40%).
- **Next (your order):** marksmen and rocket hostiles with the roof arena.

**Filed after the Build 34 playtest, and answered by the user (2026-10-01):** Kohar Valley's Ambush must NOT change (enemy variety is for Dehrun only; its checks stay); the roof arena: yes, after the hostiles differ, not alongside; simultaneous shooters stay 3, 4, 5; the open door leaves stay as they are. **What was filed:** the user did not reach wave 8: the ways in work, but inside the house every hostile runs the same script and they arrive in a file. **Behaviour, not routing, is the fix.**
- **F.20 (the priority, both maps): enemy variety.** Rushers, marksmen, suicide bombers (the most important), rocket hostiles, and variation within every type (pathing, pausing, firing: dispersal, not queuing); the mix harder as waves climb. Supersedes M7.07.
- **F.21** rappelling onto balconies and the roof at higher waves. **F.22** helicopters and launchers to bring them down: its own build, late (nothing in the game flies). **F.23** claymores, C4 and placeable traps bought with points, the same for host and guest, never killing a player unwarned. **F.24** sound from real recordings (research in E51: the Free Firearm Sound Library and Kenney Impact Sounds are CC0, the Sonniss GDC bundles royalty-free without attribution, Freesound clip by clip; Safari needs AAC or MP3; about 60 clips, 2 to 4 MB). **F.25** the roof as the arena, with one supply station. **F.17** now covers the whole bottom-right corner (weapon, calibre, rounds) as icons and numbers.
- **Order proposed (E51):** (1) variation within the hostiles, rushers and bombers; (2) marksmen and rockets with the roof arena; (3) defensive equipment; (4) sound; (5) the HUD panel and the models; (6) rappelling; (7) helicopters.
- **The roof arena, my opinion:** better than the inside-out arena, but not before the hostiles differ (today the roof is the easiest place, not the hardest), and only with a reason to go down. Mostly the map's description; half a build.
- **Still to decide:** the sound list (F.24).

**Build 34 is committed locally and NOT pushed** (Ambush difficulty and movement fixes).

**Build 34 in short: the jump works while moving, nothing at eye height is walked into, Dehrun's Ambush comes at you from every side and is hard by wave 5, and L asks before it leaves** (`http://localhost:8765/`).
- **1. Jumping while running: fixed, and it was not Build 33.** Measured against the old builds taken from their commits: a jump taken while moving has risen 5 cm in every build since 28 (its rule for walking down steps put a body in the air back on the floor at every step); Build 27 was the last where it worked. Now a jump rises .67 m standing, walking, backing, sidestepping, sprinting, crouched or aiming, on every kind of ground of the town.
- **2. Seeing into walls: the cause.** The body does not enter walls: over 144,000 frames of random walking, sprinting, jumping and crouching through the customs house and the square its middle was never nearer than its own radius (.34 m) to anything solid. What you saw was three other things. **(a) New in Build 33, and the one you met at every purchase:** a barricade's price board, paint band and lantern stand 22 cm before its boards at the height of your eye and were not solid, so your eye stopped 12 cm from them and looked into them. They are solid now (your eye stays .34 m off, as from any wall); a crate's lantern post too. **(b)** Pulled up onto a window sill, or jumping under a stair's flight, the eye went through the lintel for a dozen frames while the body ducked: the eye is now kept .16 m under whatever is over your head. **(c)** A body in the air could drift over the edge of a sill or crate it was not yet above and be pushed out on landing (your "pushed out after entering", though only after a jump): in the air nothing is stepped over any more.
- **3. Dehrun's Ambush is harder, and harder early (E50).** **Every way in is used at once:** each arrival is given a way in turn and keeps to it: one in four by the street door and the stairs, two in four by the ladder and the roof, one in four through a ground-floor window **which it breaks itself** (it stands before the pane, fires into it and climbs in). Before, all of them took whichever way was shortest. On the top floor that is as many coming down the west stair from the roof as up the east stair from below: counted over two waves, 11 from the west end of the corridor and 10 from the east; 5 by the doors, 11 by the ladder, 5 by windows. On the roof, where you ended up, a wave now brings 7 by the ladder and 8 up the stairs' two heads (before, all by the ladder). **The curve:** alive at once 3, 4, 5, 6, 7, 8, 9, 10 from wave 8 (Build 33: 3, 3, 4, 4, 5 ... 9 at wave 13); half as many again a wave (9, 12, 15, 18, 21: more points too); arrivals 2.7 s apart at wave 1 and under 2 s from wave 5. **And how many may fire at you at once: 3 in waves 1 and 2, 4 from wave 3, 5 from wave 6** (it is 3 on Kohar Valley, always). Each one's accuracy, damage and rate of fire are untouched; this is how many shoot together, and it is the change I would most like your word on. Two players: the same, scaled as on Kohar Valley, each player with their own turn of ways (T44 found one shared turn gave the host the roof and the windows and the guest the doors). **Kohar Valley's Ambush is Build 33's** (T44, T43: both curves, three firing at every wave, every price, both bests).
- **4. The pace: they run.** Of the two I chose running over arriving nearer, because the distance outside is not what makes the way long: of the 96 m a hostile walks to the top floor, 29 are outside and 67 inside the house (a door, two stairs, a floor between them). Arriving at 20 m instead of 35 would save five seconds at most and would put arrivals on the square under your windows. So on Dehrun they run at 6 m/s (2.8 is their walk) while more than 12 m of their way is left and they see nobody; near you, or the moment they see anyone, they are as they were. **First hostile at the top floor: 18 to 26 s after the wave is announced, depending on the side the wave comes from** (Build 33: 20 to 35; Kohar Valley about 15). Five waves of the test run took 7 min 52 s (Build 33: 11.5 minutes for two thirds as many hostiles).
- **5. The knife is a blade:** a clip-point blade cut from a profile and ground to an edge, a fuller, a guard, a ringed grip, a pommel, and the gloved fist and forearm that hold it; it comes across from the left nearer the eye than before. The reach, damage and timing are unchanged.
- **6. L asks first (your message during the build).** One press of L, or one click of any button that leaves, shows LEAVE THE MISSION? PRESS L AGAIN TO LEAVE and the mission runs on; a second press between a third of a second and five seconds later leaves; a double tap is not an answer; unanswered, the question goes away. In every mode; once a mission is over nothing is asked. **Connected:** at the first press the other player is told (YOUR HOST IS ABOUT TO LEAVE · THE MISSION WILL END FOR BOTH OF YOU, or YOUR TEAMMATE IS ABOUT TO LEAVE THE MISSION) and again if the question lapses. A host who confirms ends the mission for both, as before; a guest who confirms leaves the host playing, as before.
- **What to try:** on Dehrun, run and jump everywhere; walk up to a barricade and a crate and look at the board from as near as you can get; climb onto a broken window's sill and look up. Play Ambush from the top floor: watch both ends of the corridor; listen for a shot and glass downstairs in wave 1. Buy the roof and see whether you can still hold it. Knife something (G). Press L once in a run, wait, press it twice quickly, then twice slowly. With your teammate: each press L once and read the other's screen.
- **Checks:** 37 suites, 330 checks, all pass (headless), the three traces identical. T44 is new (8 checks). Breakage pass: see the roadmap's change log.
- **Safari (B30): awaiting the user.** `http://localhost:8770/b34/?map=dehrun&bench=ambush&case=dehrun2run` (**the route spread: waves 2, 3, 4 ... played one after another from the top floor; the title's `came` and `cameByWave` are the counts by door, ladder and window**) · `http://localhost:8770/b34/?map=dehrun&bench=ambush&case=dehrun8` (10 alive, five firing) · `http://localhost:8770/b34/?map=dehrun&bench=ambush&case=dehrun12open` · `http://localhost:8770/b34/?bench=ambush&case=kohar12` (the control). About two and a half minutes each; the result is the tab's title.
- **Found, not fixed (MAP-14):** the customs house's street doors stand open and their leaves can be walked through (you see into a leaf: so since Build 25; making them solid moves the enemies' navigation). Up to five hostiles queue at the one ladder (they now wait a body's length apart). A hostile breaking a window does it from a standstill with one shot and no animation. The ladder is climbed at a walk (7 s). The Build 33 cost of sight rays stands (MAP-13); with ten alive it is higher.

**Decisions for the user (Build 34):**
- **How many may fire at once (3, 4 from wave 3, 5 from wave 6):** keep, soften, or back to three at every wave.
- **The curve:** 2 + the wave's number alive, to ten. One number each way: `cap: [2, 1]` in the map (3, 1 is one more at every wave; 2, .75 is gentler).
- **The shares of the ways:** door 1, roof 2, window 1.
- **Half as many again a wave** also pays half as many again points (7,500 by wave 5): say if prices should follow.
- **The open door leaves:** solid, removed, or left.

**Build 33 is committed locally and NOT pushed** (Ambush on Dehrun Terraces).

**Build 33 in short: Ambush plays in the customs house: you start on the top floor and buy your way down and out** (`http://localhost:8765/`, DEHRUN TERRACES, the Ambush tab).
- **The arena, eight areas, in the order they can be bought (8,000 points for all of it):** you start on the **top floor**. From there: the **roof** (500) and the **first floor** (750). From the first floor: the **ground floor** (1,000). From the ground floor: the **square** (1,250: the three barricaded street doors). From the square: the **lower town** (1,500, the south gateway), the **west district** (1,500) and the **east district** (1,500), each through its own gateway. This is E44's inner gates and outer ring; Kohar Valley's arena has four areas for 3,000.
- **What a barricade is here:** boards, rails and sandbags closing an opening to its full height (a stair's flight at its mouth, a street door, a gateway): it stops you, bullets, sight and the hostiles until it is bought. **Every barricade leaves one way open beside it, marked by the striped line: that is where the hostiles come in, and you may not cross it** (five seconds beyond a line ends the run, or puts you down in co-op, as on Kohar Valley). At the start: the east stair is the way down (line) and the west stair's flight down is barricaded; the west stair is the way up to the roof (line) and the east stair's flight up is barricaded. So they come at the top floor from both ends of the corridor: up the east stair, and down the west stair from the roof.
- **How they get to you:** up the stairs from the north street door; **up a ladder on the east face to the roof** (new, 10 m; you can climb it too) and down a stair head; and **through ground-floor windows that have been shot out, by you or by them** (they climb over the sill bent double, 1.3 s, firing at nobody meanwhile; they shoot out a pane they see you through, as since Build 29). A whole pane is never a way.
- **Crates (Kohar Valley's four rifles at Kohar Valley's prices), one on each level:** CQB on the top floor (500, in the loft), carbine on the first floor (750), DMR on the roof (1,000), automatic rifle on the ground floor (1,250). None outdoors. Magazines (B), dressings (N) and grenades (1, 2, 3) at any crate, at the prices of every map.
- **The curve (proposed; say if it should change):** counts, points, prices, fight range, pauses, accuracy, damage and fire rate are Kohar Valley's. **Two things differ, because the ways in are long and narrow:** one more hostile is alive at once (3 at wave 1 where Kohar has 2; 5 at wave 5 against 4; the ceiling of 9 is reached at wave 13 instead of 15) and they follow each other a fifth sooner (3.6 s apart at wave 1 against 4.5; the floor of a second from wave 12 instead of 13). Two players: the same scaling as on Kohar Valley, on top of that. **Kohar Valley's own curve is untouched** (T43 compares forty waves of both curves with Build 32).
- **The pace, measured headless:** the first hostile reaches the top floor 20 to 35 s after a wave is announced (they walk 75 to 110 m at their usual 2.8 m/s; on Kohar Valley it is about 15 s); five waves took 11.5 minutes with every hostile killed a second after it came into sight. Each wave now comes from one of the three directions with the shortest way in.
- **Bests:** kept per map. Kohar Valley's solo and two-player bests keep the keys they always had (your records stand); Dehrun Terraces has two of its own.
- **The map (M):** the house's four levels are drawn one under another above the town's plan (roof, top floor, first floor, ground floor), each with its barricades, crate and price; your arrow is on the plan of the floor you stand on.
- **The wall drag is fixed.** The nudge counted its own step aside as way made, so walking into any wall at a slant slid you along it. Now a nudge is taken only when it frees a step that was stopped, and only to the side of that step: against a flat wall you end exactly where you would without it (30 slanted walks, to the millimetre), and beside a stair it still clears every post and coping (0 stops on 46 walks; 19 without it).
- **Glass breaks in pieces:** twelve small panes of glass fly out of the opening to both sides, fall and turn for three quarters of a second. For show only: sight and shots pass from the instant the pane breaks, as before. One drawing for all of them, made with the game (nothing is made when a pane breaks). Partial breaking is still filed (F.18).
- **What to try:** DEHRUN TERRACES, Ambush, deploy. Look both ways along the corridor: a barricade and a striped line at each stair. Wait for wave 1 and hold the corridor. Buy the roof (500, at the east stair) and go up: the ladder's head is in the north-east corner. Buy the first floor (750), then the ground floor, shoot out a ground-floor window from inside and watch them come through it. Buy the street doors and fight on the square. Press M on every level. Walk into a wall at a slant anywhere on Dehrun. Shoot a window and watch the glass. With your teammate: both start on the top floor; buy a barricade each; step over a line each and see who is warned.
- **Checks:** 36 suites, 322 checks, all pass (headless), the three traces identical. T43 is new (11 checks). Breakage pass: see the roadmap's change log.
- **Safari (B29): awaiting the user.** `http://localhost:8770/b33/?map=dehrun&bench=ambush&case=dehrun12` (**a high Dehrun wave**: the top floor, wave 12, 8 alive, sent again whenever it is cleared) · `http://localhost:8770/b33/?map=dehrun&bench=ambush&case=dehrun16` (wave 16, 9 alive, arrivals a second apart) · `http://localhost:8770/b33/?map=dehrun&bench=ambush&case=dehrun12open` (everything bought, on the square, a window in three shot out) · `http://localhost:8770/b33/?bench=ambush&case=kohar12` (Kohar Valley's wave 12, to compare) · `http://localhost:8770/b33/?map=dehrun&bench=look&case=shatter` (a pane broken every tenth of a second: the pieces). Each takes about two and a half minutes; the result is the tab's title.
- **Found, not fixed (MAP-13):** a line of sight costs far more on Dehrun Terraces than on Kohar Valley (about 1.5 ms in the headless run: the town's walls are a few very large meshes with no index for rays), so a wave's arrivals cost up to 20 ms in the frame they appear in; the bench will say whether Safari notices. The hostiles do not take cover in the customs house (cover there was built for patrols; they advance, stop to fire and advance). Dehrun's Ambush barricades and crates are plain boards and boxes (dressing is its own build). The menu's Story tab on Dehrun is still the walk.

**Decisions for the user (Build 33):**
- **The curve:** as proposed (one more alive, a fifth sooner), or closer to Kohar Valley's, or harder.
- **The pace:** half a minute before a wave's first hostile is at the top floor. They could run when they are far off and unseen (a movement speed, so it waits for your word), or arrive nearer than 35 m where they cannot be seen.
- **Prices and order:** 8,000 for the whole arena; the roof first at 500. Say if the roof should cost more (it is the strongest place) or the districts less.
- **The ladder to the roof:** it gives the hostiles the roof from outside (half of them used it in the test run) and gives you a way down to the square. Keep, move, or none.
- **The next build:** dressing (map build 9 of the old count), the HUD panel (F.17), or the models build (F.16, which begins with F.19: neutral army or terrorists).

**Build 32 is committed locally and NOT pushed** (map build 8: changing map in a running page).

**Build 32 in short: the map is chosen in the menu and changed without reloading, alone or with your teammate** (`http://localhost:8765/`).
- **What was added to the menu:** two buttons under the mode tabs, KOHAR VALLEY and DEHRUN TERRACES; the one in use is lit. Pressing the other puts up LOADING MAP for a second or two and you are in the menu of the other map: its header, its brief, its modes (Ambush only on Kohar Valley). The address `?map=dehrun` still works for a page that should start there.
- **How it works:** the whole game is now a function the page calls once per map. Leaving a map throws that game away entirely (its listeners, its frame loop, everything it drew with, its canvas) and makes a new one; only the connection and your chosen class are carried over. So nothing of the last map can be left behind, and Kohar Valley built again runs exactly the code Kohar Valley loaded fresh runs.
- **In co-op:** the host chooses from the menu; the guest follows on the same connection, wherever it is; each guest game tells the host when it stands on the map, and the host cannot deploy before that. A guest cannot choose. The codes are never exchanged again.
- **What it costs:** building the world blocks the page about 1.1 s for Dehrun Terraces and 0.2 s for Kohar Valley; in the desktop app's browser the first frame came 2.9 s and 1.3 s after the click. Safari is yours to measure (B28).
- **The customs house's rooms:** four were too small to fight in (under 5 m across or under 30 m²) and are now part of their neighbours: the south-east room on every storey (27 m², the one you noticed, left narrow by the wider stairs) and the first floor's north-west room (29 m²). New sizes: ground south hall 11.5 by 7.8 m (90 m²); first-floor north room 12.5 by 6.4 (80) and south room 12.5 by 7.8 (97); second-floor south room 10.5 by 7.8 (82). The smallest room left is the ground floor's north-west room, 5.5 by 6.4 m (35 m²).
- **What to try:** in the menu press DEHRUN TERRACES, walk or play Skirmish, break some windows, leave to the menu (L), press KOHAR VALLEY, play a Story mission, go back: the town is whole again. With your teammate: connect on Kohar Valley as always, then as host press DEHRUN TERRACES in the menu: both of you should be in Dehrun's menu, still connected; deploy; afterwards go back to Kohar Valley together the same way. As a guest, try the map buttons: nothing should happen but a line saying the host chooses.
- **Checks:** 35 suites, 311 checks, all pass (headless), the three traces identical. T42 is new (7 checks). Breakage pass: see the roadmap's change log.
- **Safari (B28): awaiting the user.** `http://localhost:8770/b32/?bench=change` (**the cost of a map change**, four changes, results in the title) · `http://localhost:8770/b32/?bench=1&case=none` · `http://localhost:8770/b32/?map=dehrun&bench=look&case=town` · `http://localhost:8770/b32/?map=dehrun&bench=look&case=skirmish` · `http://localhost:8770/b32/?map=dehrun&bench=look&case=stairs` · `http://localhost:8770/b32/?map=dehrun&bench=look&case=holes`.
- **Filed for later, not built:** F.16 free models for hands, soldiers and distinct rifles (**the build after next**; it begins with research and your approval of the list, and with F.19: whether the enemies are a neutral army or terrorists, which decides their look; fictional either way, and always distinct from your squad and teammate); F.17 the HUD equipment panel (icons and counts, Siege-style); F.18 glass that breaks with an animation and in parts.
- **Found, not fixed (MAP-12):** the page is blocked while a world is built; Dehrun's models are prepared again at every visit; a guest in a mission when the host changes map is taken out without a report; Dehrun has no Story operation, so its menu still says the walk.

**Decisions for the user (Build 32):**
- The ground floor's north-west room (35 m², 5.5 m across): kept as the smallest room; say if it should go into the north hall too.
- The next build (the one before the models build): dressing (map build 9 of the old count), Ambush on the customs house, or the HUD panel.
- F.19 can be decided any time before the models build: neutral army or terrorists.

**Build 31 is committed locally and NOT pushed** (stair width and glass corners).

**Build 31 in short: every stair is 2.4 m, and every part of a window breaks it and is clear once broken** (`http://localhost:8765/?map=dehrun`; `&foes=1` for enemies on the walk).
- **Stairs, the number: 2.4 m clear** (2.39 to 2.51 measured on the 23 flights): a player and an enemy side by side with .8 m to spare, two enemies with .6, three players abreast. Nothing downstream is tighter: the customs house's half landings are 3.45 and 4.85 m deep and 4.9 m across, the way into each stair 4.84 m, the roof doors 2.4 m (2.19 clear, were 1.69), house A's well as wide as its flight. The eye fix is untouched (its text is pinned by T41 and its behaviour measured again on the wider stair).
- **What it cost the layout (you asked to be told):** the customs house's stair wells are 5.1 m wide and take the whole depth of the house beside the corridor, so **its six closets are gone** (two a storey), with their doors and the twelve windows that looked out of them (they would have met the landings); the north-west rooms and the south-east rooms are .8 m narrower (the smallest room is 27 m²). On a 10 m house the outside stair is steeper (.29 m a tread, was .28): the wider landing takes its length. **Wider than this would need a bigger customs house or steeper district stairs**; I stopped at 2.4 for that reason.
- **Glass:** the whole opening is now the pane to a shot: from one side of the reveal to the other and from the sill to the head, so the casement's rails, the corners and the very edge all break it (measured: before, a round in the top or bottom 2.4 cm of a window went through the casement into the room and broke nothing). A shot at the post between the halves of a double window breaks a half (the post used to let rounds through untouched). **The teeth of glass are removed:** they never stopped a round, but they could not be shot away, and anything you can see in an opening looks as if it should break or block. What was stopping shots near the corners at an angle is the wall's own reveal (the wall is .34 to .4 m thick), which is still there and should be.
- **What to try:** shoot a window at each corner and along each edge, from square on: one round breaks it wherever it lands. Then put rounds through the corners of the hole. Shoot the post of a double window. Walk, sprint and turn on the customs house's stairs, with a teammate or with `&foes=1`; go out of the roof doors; climb a district house's outside stair.
- **Also changed:** an enemy following a path is nudged past a railing post it would clear by a centimetre (the wider stairs put a path there and one enemy stood stuck for a minute in the test); the roof patrol stands a little further in, clear of the wider stair heads.
- **Checks:** 34 suites, 304 checks, all pass (headless), the three traces identical. T41 is new (7 checks: Kohar; 2,538 shots at nine places on every window from outside, 432 from inside the customs house, every double window's post; every broken opening clear to 2 cm of its edge, sight, shots, grenades at two corners and the body at both ends of a sill; the stairs; a quarter-metre flood of the customs house and square with no place without a way back; the eye as Build 30; both players). Breakage pass: see the roadmap's change log.
- **Safari (B27): awaiting the user.** `http://localhost:8770/b31/?bench=1&case=none` · `http://localhost:8770/b31/?map=dehrun&bench=look&case=stairs` · `http://localhost:8770/b31/?map=dehrun&bench=look&case=holes` (every pane broken) · `http://localhost:8770/b31/?map=dehrun&bench=look&case=windows` · `http://localhost:8770/b31/?map=dehrun&bench=look&case=skirmish` · `http://localhost:8770/b31/?map=dehrun&bench=look&case=town`.
- **Found, not fixed (MAP-11):** a small window in the block stands behind a ladder whose rail takes a shot at that edge (two more have a rail at their very edge); house A's stair is open on one side (you can walk off it); the customs house's furniture was only moved out of the way of the wells, not rearranged; the stairs' landings have no windows now.

**Decisions for the user (Build 31):**
- The closets: gone for the stairs (as built), or a bigger customs house to have both.
- Slowing the body on stairs, the bars going with the glass (Build 30's questions) are still open.
- Next build: dressing (map build 8), Ambush on the customs house (9), or the running-page map change (MAP-08).

**Build 30 is committed locally and NOT pushed** (window frames and the eye on stairs).

**Build 30 in short: a window shot out is a hole in the wall, and the eye no longer takes the stairs a tread at a time** (`http://localhost:8765/?map=dehrun`; `&foes=1` for enemies on the walk).
- **Step A, what makes the stairs feel tight (E46):** no dimension. Measured on the customs house's west stair with the game's own keys: **the eye rose in jumps of 21 cm, one tread in one frame, 10 times a second walking and 16 sprinting.** With a wall a metre from the eye each jump throws it 12° up a 70° view; at the wall itself, 32°. A close space that strobes reads as a cramped one; the flat ground and the lanes' ramped steps never did it, which is why only the stairs felt wrong whatever their width. The rest, measured and not the cause: headroom .42 to .88 m over the eye (a real stair gives .4 to .5); the eye 1.0 to 1.1 m from each side in the middle of a flight, nothing nearer at eye height than at the feet; the field of view 70° (76 sprinting), the same as everywhere; the handrail .7 m below the eye on the well's centre line; the body never leaves the treads going down; the half landing 1.87 by 4.07 m.
- **What was done:** the eye is held back by each tread the feet take and given back at the feet's own climbing rate, so it rises and falls in a line: walking, the worst frame moves it 4 cm (it was 21); sprinting 8. It is never more than .3 m behind the feet and is back over them within a third of a second of stopping. Jumps, falls, pull-ups and ladders are as they were; so are the feet, the speed, the treads and the field of view. Kohar Valley has no stairs and nothing changed there.
- **Not done, your decision:** the body climbs a flight in .78 s walking (.37 sprinting), a storey in under two seconds, with a full turn on the landing every .8 s: four to seven times a person's pace. If the stairs still feel hurried rather than tight, slowing the body on treads is the next thing to try; it touches the class speeds, so it waits for your word.
- **Windows:** when a pane breaks, everything in its opening goes with it: the casement's rails and glazing bars, the iron bars on a barred window, and the post of a double window once both its halves are gone. **Left:** the wall's reveal (the frame posts at each side), the lintel, the sill, the shutters folded back on the wall outside, and short teeth of glass round the edge (I kept them, a third shorter: with the bars gone they are what says "broken" rather than "open", and they sit against the reveal, not in the opening; nothing of them stops anything). A shell's hole still shows its dark room.
- **A barred window shot out can be climbed through** (Space at the sill, then walk): your brief said nothing should span the opening, so the bars go too. It makes every ground-floor window of the customs house a way in once shot. Say if barred windows should keep their bars.
- **What to try:** shoot out a ground-floor window of the customs house from the square: a clean hole; shoot through its corners; throw a grenade through; press Space at the sill and climb in, and out. Shoot one half of a double window (the post stays), then the other (it goes). Walk and sprint up and down the customs house's stairs and watch the walls: they slide now. In co-op, check both of you see the same holes.
- **Checks:** 33 suites, 297 checks, all pass (headless), the three traces identical. T40 is new (6 checks: Kohar's eye; the eye on stairs frame by frame; all 294 windows as holes; 35 sight lines, 35 shots, a grenade and the body through one; both pages showing the same openings; nothing made or left). Breakage pass: see the roadmap's change log.
- **Safari (B26): awaiting the user.** `http://localhost:8770/b30/?bench=1&case=none` · `http://localhost:8770/b30/?map=dehrun&bench=look&case=stairs` (the west stair climbed over and over by the W key) · `http://localhost:8770/b30/?map=dehrun&bench=look&case=holes` (every pane broken) · `http://localhost:8770/b30/?map=dehrun&bench=look&case=windows` (every pane whole) · `http://localhost:8770/b30/?map=dehrun&bench=look&case=shatter` · `http://localhost:8770/b30/?map=dehrun&bench=look&case=skirmish`.
- **Found, not fixed (MAP-10):** one small window in the block has a ladder's rail 6 cm into its edge (it was there before); a shell's broken window opens onto nothing; enemies do not climb through windows; the knife is still stopped by a whole pane.

**Decisions for the user (Build 30):**
- Slow the body on stairs (say by how much: .7 of the flat's speed is where I would start), or leave the speed.
- Barred windows: bars go with the glass (as built) or stay.
- The teeth of glass: keep (as built), or none.
- Next build: dressing (map build 8), Ambush on the customs house (9), or the running-page map change (MAP-08).

**Build 29 is committed locally and NOT pushed** (windows and stairs on Dehrun Terraces).

**Build 29 in short: the stairs no longer catch you, the windows are bigger and some are double, and glass can be shot out** (`http://localhost:8765/?map=dehrun`: WALK THE BLOCK, or DEPLOY TO THE TERRACES for Skirmish; add `&foes=1` to the walk for six enemies in the customs house).
- **Step A, why 1.7 m felt tight (E45):** the width was not the cause. Measured: the flights were 1.66 to 1.77 m clear, wider than a public stair (1.2 m); the player's body is a square .68 m across (an enemy's .90), so a player and an enemy need 1.58 m and had 8 to 19 cm to spare; headroom 2.1 to 2.6 m. What was wrong: **(1) on 17 of the 23 flights a body walking along a wall stopped dead** against something a few centimetres proud of it (beam ends in the customs house's west stair, the doorposts at the stair's entry and at the roof door, the copings and string courses beside the district stairs): the mover slid along walls but stopped at any bump; **(2) the half landings were 1.37 m clear**, less than the flights they join; **(3) the roof doors were 1.3 m, about 1.1 clear,** at the top of a 1.77 m flight; **(4) the camera sits in the middle of the body**, so on a 1.7 m flight it has 1 m of play from side to side, where a person on a real 1.2 m stair has about .7.
- **What was done for the stairs:** every flight 2 m (1.99 to 2.12 clear: a player and an enemy side by side with 40 cm to spare, two enemies with 20); the customs house's half landings 2 m deep (1.87 clear) and its roof doors 1.9 m (1.69 clear); **the player's body is nudged past anything up to 20 cm proud of a wall** (it no longer stops against a beam end or a doorpost; against a plain wall it stays where it is). Walking every flight pressed into either wall: stopped 21 times before, never now.
- **Windows:** 1.4 m wide and 1.3 m tall (were 1.1 by 1.15); double windows (2.4 m, two casements with a post between) on the customs house's upper floors, over the door of every open house and upstairs in every other shell where the wall has room: 46 of them; the town's shells are glazed now. 294 panes.
- **Glass:** a whole pane stops sight and bullets; the shot that breaks it goes no further; after that the window stops nothing, from either side, until the next mission. A broken pane leaves teeth of glass round its frame; the casement's wooden bars stay. Grenades go through and break the pane; a blast takes the panes within 5 m; climbing through a window breaks it. **Enemies and squadmates shoot out a pane they see someone through** (one shot at their usual pace, hurting nobody), then fight through the hole. In co-op the host decides every break; the guest is told at once and checks its panes against every snapshot.
- **What to try:** walk up the customs house's west stair pressed against its wall (it used to stop you under a beam end on every storey); turn on its landings; go out on the roof. On the square, shoot a ground-floor window of the customs house and then shoot through it; shoot one half of a double window upstairs; throw a grenade through a window. With `&foes=1`: stand in the closet behind the north-west corner's barred window and watch an enemy on the square shoot the pane out before it fires at you. In co-op: break windows on both machines and check that each sees the other's.
- **Checks:** 32 suites, 291 checks, all pass (headless), the three traces identical. T39 is new (9 checks: Kohar Valley has no glass; the stairs; the windows; a shot breaking glass and sight and shots before and after, from both sides; grenades, blasts, bodies and allies; enemies; broken for the mission, whole for the next; host and guest agreeing, a lost message put right; nothing made or left over 30 missions of 40 panes). Breakage pass: see the roadmap's change log.
- **Safari (B25): awaiting the user.** `http://localhost:8770/b29/?bench=1&case=none` · `http://localhost:8770/b29/?map=dehrun&bench=look&case=windows` (the customs house from the square, every pane whole) · `http://localhost:8770/b29/?map=dehrun&bench=look&case=glass` (**four panes in five broken**) · `http://localhost:8770/b29/?map=dehrun&bench=look&case=shatter` (a pane broken every tenth of a second) · `http://localhost:8770/b29/?map=dehrun&bench=look&case=town` · `http://localhost:8770/b29/?map=dehrun&bench=look&case=skirmish`.
- **Found, not fixed (MAP-09):** the knife is stopped by a whole pane and does not break it; a guest's own tracer is drawn through glass (the host judges the shot); a breaking pane is a puff and a tinkle, no falling shards; the enemies' stray shots never break glass (only a shot at a pane they see someone through); closets beside the wider stairs are 1.6 m deep.

**Decisions for the user (Build 29):**
- The breaking shot stops at the glass (one round to open a window, the next goes through). The other rule, the round carrying on through, is one line; say if you want it.
- Enemies shoot out a window as soon as they see you through it. If that is too sharp of them, a delay or "only once they have been shot at" are both small.
- The nudge (20 cm) also helps you through doorways you clip. Say if it feels like being steered.
- Next build: dressing (map build 8), Ambush on the customs house (9), or the running-page map change (MAP-08).

**Build 28 is committed locally and NOT pushed** (map build 7 of 9: the layout of Dehrun Terraces).

**Build 28 in short: the whole town stands in grey-box round the block and the customs house, every stair takes two bodies, and Skirmish plays on it** (`http://localhost:8765/?map=dehrun`: WALK THE BLOCK for the walk, DEPLOY TO THE TERRACES for Skirmish; co-op as always, with the codes on two machines).
- **The town:** six terraces from the lower town at −1.6 m (south, z 80 to 105) up to the top of the hill at 6.4 m (north, z −80 to −100), 1.6 m a terrace; the lanes at x 0 and ±48 have eight-tread steps at every terrace line, everywhere else the line is a sheer retaining wall; districts of one- to three-storey houses either side of the block on every terrace; the square with the customs house in the middle; town walls all round; eleven open gateways between the block, the square and the districts. Nine district houses are open (WL4, EL4 on the lower terrace by the square; WM2, EM2 on the middle; WT4, ET4 on the upper; N4 on the north terrace; H5 at the top; S4 in the lower town): a door on the street side, one room, and an outside stair up the south face to a gap in the parapet. The rest are shells with barred windows (dressing is map build 8).
- **What to walk:** from the block's lowest terrace go south through the gate onto the square, then west or east through the square's gates into the lower districts; take the lane at x −48 up the steps terrace by terrace to the top (each district is a walled band with a house or two open); come back along the top terrace and down the middle lane. Climb WL4's outside stair (by the square's west gate) to its roof and look over the square at the customs house. Down the steps south of the square into the lower town and back up.
- **What to fight through (Skirmish):** you deploy on the block's top terrace with the squad; the relay is on the square (a mast stands by the customs house's south-east corner); seven enemies patrol the square and the lower town or hold the relay; when you have thinned them, reinforcements come through the gates (from the lower town's south, the square's west and east gates, the block's side gates at z 30); hold the relay 45 s. Try the customs house's stairs with a teammate or an enemy coming the other way: every flight is 1.7 m now (the customs house's 1.77, 1.67 clear of the well's partition).
- **Rules added (stairs only; Kohar Valley untouched):** a tread is stepped over by an enemy only when it lies within .66 m of the feet and not under the body's middle; the mover walks down steps within .35 m instead of leaving them to gravity; what a body stands against at its origin is judged at the origin's own height, and a tread it only brushed there is not something it may slide along.
- **Checks:** 31 suites, 282 checks, all pass (headless). T38 is new (6 checks: the town as described; a flood of the player's body over the whole town, 106,981 places, no place without a way back, every open house's roof and the customs house's levels reached; the enemies' navigation reaching every district, open house and level with nobody stranded; two bodies side by side on all 23 flights and the enemy climbing each; Skirmish deployed, reinforced, won and lost, the walk unchanged; the ceilings over the whole town: 102 draw calls, 588,528 triangles). Breakage pass: see the roadmap's change log.
- **Safari (B24): awaiting the user.** `http://localhost:8770/b28/?bench=1&case=none` · `http://localhost:8770/b28/?map=dehrun&bench=look&case=town` (the densest view, from the south gate up the hill) · `http://localhost:8770/b28/?map=dehrun&bench=look&case=top` · `http://localhost:8770/b28/?map=dehrun&bench=look&case=west` · `http://localhost:8770/b28/?map=dehrun&bench=look&case=skirmish` · `http://localhost:8770/b28/?map=dehrun&foes=1&bench=look&case=foes`.
- **Not built (item 4 of the brief): changing map inside a running page.** The world is built once when `game.js` loads; a second map needs a reload, and a reload drops the connection (the codes again). The plan and estimate (3 to 5 hours, its own build) are in MAP-08.
- **Found, not fixed (MAP-08):** Skirmish on the town uses the flat game's mission words and Kohar Valley's menu header; the districts are bare (shells, no props, no railings on the outside stairs); the customs house's inner flights are 1.67 m clear of the well's partition, not 1.77.

**Decisions for the user (Build 28):**
- The customs house's position as the Ambush arena: E44 says it works (the square's four gateways are the outer ring, the house's doors and stair heads the inner); your word on inside-out or outside-in barricades, and where the crates go.
- Next build: the running-page map change as its own short build (recommended, so two players can move between maps), or dressing, or Ambush on the customs house.
- The customs house's well partition: recess it for the full 1.77 m, or leave 1.67 clear.

**Build 27 is committed locally and NOT pushed** (map build 6 of 9: co-op height, and the customs house widened). **The user plays locally and says when a build is to be published: do not push. Do not take Safari: give bench URLs.**

**Build 27 in short: two players see and hurt each other in three dimensions on Dehrun Terraces, and the customs house is an arena, not a warren** (`http://localhost:8765/?map=dehrun&foes=1`, WALK THE BLOCK; co-op there as always, with the codes on two machines).
- **What to try, alone with `?foes=1`:** the customs house's corridor is 3 m wide now and every doorway inside is a bare frame: you see through the building along the corridor and into the rooms; the halls are 62 to 93 m², the loft on the second floor 143. Fall back along the corridor and through the rooms while they come up the stairs; the closets at the stair ends are still small (a place to reload). The doors on the street keep their leaves, swung open.
- **What to try, in co-op:** stand on the roof while your teammate is on the square: you see each other where you are; walk up the west stair and watch each other tread by tread; climb the storehouse ladder in the block; step off the parapet: the fall costs the guest what it costs the host (75 of 100 from the roof), once. A teammate down on the floor below cannot be revived from straight above: go down. A grenade rolled under the floor does nothing to anyone upstairs. Enemies stand at the same height on both pages.
- **Rules:** the host keeps the guest's health and charges the guest's falls from its poses (a jump, a mantle and a ladder are told apart); revive reach is 2 m in three dimensions on a map with height; knife and blasts were already three-dimensional; grenades bounce on the kit's floors and roofs.
- **Checks:** 30 suites, 276 checks, all pass (headless). T37 is new (8 checks: Kohar co-op against Build 26 run from its commit, seeing each other at height, identical shots from either side, revive/knife/blast never through a floor from either side, grenades on floors and roofs on both pages, enemies at the same height on both pages, the guest's falls charged once, the widened house). Kohar Valley identical (T31, the three traces, T36, T37). Breakage pass: see the roadmap's change log.
- **Safari (B23): awaiting the user.** `http://localhost:8770/b27/?bench=1&case=none` · `http://localhost:8770/b27/?map=dehrun&bench=look&case=arena` · `http://localhost:8770/b27/?map=dehrun&foes=1&bench=look&case=foes`. No two-player bench: two pages need two browsers and the codes.
- **Found, not fixed (MAP-07):** no climbing animation for the teammate on a ladder; a fall shorter than a pose is not seen by the host; the stair flights are 1.37 m wide (two bodies cannot pass); the furniture is sparse.

**Decisions for the user (Build 27):**
- Next build: the layout of Dehrun Terraces (recommended), or dressing first.
- Doorways between rooms are 1.3 m bare frames; the corridor ones 1.6 m. Wider still?

**Build 25 is committed locally and NOT pushed** (map build 4 of 9: kit interiors and the customs house). **Build 24 is LIVE** (pushed 2026-09-30; GitHub run 36664250631 passed; token `2d9723fd9b63`). **The user plays locally and says when a build is to be published: do not push. Do not take Safari: give bench URLs.**

**Build 25 in short: the kit builds interiors, and the customs house stands on a square south of the block** (`http://localhost:8765/?map=dehrun`, WALK THE BLOCK).
- **How to reach it:** you start on the lowest terrace facing north; turn round and walk south down the street through the gate (it stands open now) onto the square. The customs house is the big building in front of you: 26 × 18 m, three storeys, a roof. Doors on all four sides (west and east doors open into the corridor; north and south doors into the halls). Inside: a corridor east–west on every floor, rooms off it (24 in all), the **west stair** at the corridor's west end on the north side (up: the left flight, the landing, back on the right flight; you come out into the corridor of the floor above), the **east stair** at the east end on the south side. Both go from the ground to the roof and come out through small stair heads with a door. On the roof: parapet .6 m (Space pulls you onto it; stepping off is a 10.4 m fall that costs about three quarters of your health, and you cannot step off where you would land under a window sill or against a door frame), two tanks. Down again by either stair.
- **The kit:** rooms as rectangles per storey, partitions along their shared edges with doors (leaves swung open), corridors are rooms too, dog-leg stairs with a half landing and a railing of posts under a sloping handrail, stair heads on the roof, furniture on every floor (light models only). Doors in the customs house: 1.3 m (E41); the block's doors stay 1.05 m.
- **What changed in movement (all maps with a space, i.e. Dehrun):** stairs are walked *down* tread by tread (before, the body fell from tread to tread); a body against a wall or under a sill can slide out; a body that lands overlapping something is pushed clear; the body does not step off into a gap narrower than itself; seams between slabs are no holes; over a hole narrower than itself the body rests on what is under its sides; posts and rails are no ledges; tanks stop you.
- **Checks:** 28 suites, 260 checks, all pass (headless). T35 is new (8 checks: the building, every floor, every room, both stairs both ways, the roof and its edges, a flood of 39,101 places with a way back from each, 43 doorways at the enemies' width, the block unchanged). Kohar Valley identical (T31, the three traces). Build 24's kit and description replayed from its commit: the new kit makes the same boxes from the old description. Breakage pass: see the roadmap's change log.
- **Safari (B21), measured by the user opening the four bench pages:** Kohar Valley 3.4 to 3.5 ms a frame (unchanged); the block from the start 2.9 ms (+0.2 for the customs house's batches, 509,000 triangles drawn); the block climbed 2.8 ms; **the customs house walked, ground to roof and down, 2.6 to 2.8 ms, p99 5 ms.** Budget 11 / 16.7 ms. Headless: 87 draw calls, 491,000 triangles with everything drawn (ceilings 700 / 700,000).
- **Found, not fixed (E41, MAP-05):** the block's 1.05 m doors leave .89 m between their frame posts, 1 cm less than a .45 m body needs (one number to change, your word); a .45 m body cannot begin a .35 m-tread stair under the player's stepping rule (enemies need their own stair rule, map build 5); open door leaves stop nobody.

**Decisions for the user (Build 25):**
- Is the customs house big enough and right for Ambush? (My judgement: yes for the size and the ways through it; the layout build will need to decide where the barricades and crates go — corridor doors and stair openings are the natural gates.)
- The block's doors: widen to 1.2 or 1.3 m (changes the block) or leave.
- Next build: enemy height and navigation (recommended, with the customs house as the proving ground), or the layout.


**Build 24 in short: height on the look-slice block** (`http://localhost:8765/?map=dehrun`, WALK THE BLOCK; Kohar Valley is untouched: no space, its flat lines are the same text, the three traces pass).
- **What to try:** walk up both flights and watch your feet take the treads. Jump (Space) on the spot: .7 m. Into the open house (left, middle terrace), up the stair on the far wall to the upper room, the ladder by the east wall to the roof; walk to the parapet, press Space to pull yourself onto it, step off and fall to the street (about a quarter of your health). Back onto a ladder by walking backwards over its top; Space lets go. The counter of the shop: Space pulls you onto it, crouch (C) under the shutter to get in. The south window of the open house (from the yard behind it): Space pulls you onto the sill, walk in. The workshop (left, lowest terrace): its shutter is half down, crouch to get under it and try to stand up. Walk off the balcony over the street. Press M: the map says what you stand on and how high.
- **Rules:** standing 1.8 m, crouched 1.1; steps up to .35 m are walked; up to 1.35 m is pulled up with Space where there is room to crouch on top; falls hurt from 3 m and kill at 12 (6 m costs 19, 9 m 54); nothing fires, stabs or throws on a ladder.
- **Checks:** 27 suites, 252 checks, all pass (headless). T34 is new (8 checks); 34 of 34 deliberate breakages caught.
- **Safari (B20), measured by the user opening the bench pages:** Kohar Valley 3.2 to 3.4 ms a frame (as before); the block standing 2.9 ms; the block walked, climbed and fallen from by the game's own keys 2.8 ms, p99 5 ms. The height code costs about a quarter of a millisecond on the block and nothing on Kohar Valley.
- **Reports:** E39 (no inescapable place in the block; a build-time check and a CLIMB BACK last resort recommended for the map); E40 (the kit cannot build the Ambush arena as it stands: no partitions, rooms, corridors, turning stairs or roof doors; 4 to 6 hours as its own build, recommended before the layout build).
- **Found, not fixed (MAP-04):** sloping pieces hold and stop nobody; small props are walked through; the teammate and enemies do not know height yet.

**Decisions for the user (Build 24):**
- The fall curve (none to 3 m, fatal at 12, gentle start) and the jump (.7 m).
- No firing on ladders: keep?
- Next build: the kit's interiors and the arena (recommended), or enemy height first.

**Build 23 is LIVE** (Builds 22 and 23 pushed together on 2026-09-30 UTC; GitHub run 36652816925 passed; the live page says BUILD 23, token `7f8e1ae1dd02`). The block is at the live address with `?map=dehrun`. Pushing publishes; wait for the user's word.

**User verdict on the look slice (2026-09-29): APPROVED.** "It is significantly better than Kohar Valley. Build the map this way."

**Layout requirement (user, E38):** Dehrun Terraces gets a large multi-storey building designed as the Ambush arena from the start (internal stairs, a roof, a street around it; start upstairs, buy your way down and out). Never carved out of another layout. If it cannot work within the map, report it; the user will then consider a dedicated Ambush map.

**SAFARI: never take it without asking first and waiting for the answer; never retry if the window does not come forward.** Build 23's measurement was done by the user opening the bench pages in their own Safari (B19); Claude's own window would not come forward and was stopped without a retry.

**Build 23 in short: look slice critique and fixes.**
- **Flicker:** gone. 442 exposed places where two surfaces shared a plane, the largest 151 m² each side of the street; most were in the kit.
- **Openings:** casement windows with glass and glazing bars; shut doors standing in their openings with battens and a handle; rolling shutters of slats.
- **Awnings:** woven striped cloth that sags, with a hem, on rail, pole and arms, carried by posts or brackets, in the block's colours.
- **Timber:** beam ends uneven in spacing and size; balconies propped.
- **Surfaces:** uneven over metres, darker at the foot of walls.
- **Light:** the sun in the sky is where the shadows say; shade is lit.
- **Ground:** trodden yards, paving along the fronts.
- **Beyond the walls:** twelve plain houses, field walls on the hill.
- **Cost:** 91 to 119 draw calls, about 341,000 to 356,000 triangles from the street. **Safari (B19), measured by the user opening the bench pages:** the block 2.2 to 2.75 ms a frame, p99 4 ms; Kohar Valley in the same session 3.0 to 3.3 ms, p99 6 to 8. **The block runs faster than Kohar Valley. The 350,000 ceiling was too low; the ceilings are now 700 draw calls and 700,000 triangles.**
- **Checks:** 26 suites, 244 checks, all pass (headless). T33 is new (6 checks); 40 deliberate breakages caught.
- **Left (MAP-03):** heavy props, everything always drawn, bullets through small things, doors too narrow for enemies, blank boundary walls, plain hill, one lamp a room, no plants.

**Decisions for the user (Build 23):**
- Look again: is anything still wrong?
- Keep the props as they are (the ceiling was raised after the measurement), or still lighten the heaviest for a whole map.

**Build 22 in short: the look slice of Dehrun Terraces (map build 2 of 9).**
- **How to see it:** serve `dist/` and open `http://localhost:8765/?map=dehrun`, press WALK THE BLOCK. After a push: the live address with `?map=dehrun`. Without it, the game is Kohar Valley as before.
- **What is there:** three terraces of a cobbled street climbing north by two flights of steps; eight houses of one to three storeys; an open furnished house, a shop and a workshop; retaining walls, yards, gates, awnings, balconies, wires, lamps; 71 props of 28 kinds. A clear sky with a low sun.
- **What you can do:** walk the street, the steps and the yards; enter the three open ground floors. **What you cannot:** climb anything. Upper floors, outside stairs, balconies and roofs are geometry until height is built. Nobody else is there and there is no mission; your weapons work.
- **Assets:** 28.7 MB added (cap 30), all CC0 from Poly Haven, approved by the user before download. The game is 45 MB; Kohar Valley still fetches 16.
- **Cost:** 92 draw calls, about 305,000 triangles in view from the street (ceilings 500 and 350,000), in the desktop app's browser.
- **Kohar Valley:** fetches nothing of the new map; its world is Build 20's, number for number.
- **Safari (B18): OUTSTANDING.** The block is not measured. Two Kohar Valley runs of Build 22 completed: 3.1 to 3.4 ms a frame, p99 5 to 8. The measurement was stopped at the user's word: it took Safari from their work every few seconds. **Safari is not to be taken again in this session without asking first.**
- **Checks:** 25 suites, 238 checks, all pass (headless). T32 is new (5 checks); 45 deliberate breakages caught.
- **Found by the new suite, fixed:** E still took Kohar Valley's route log on the look map.

**Decisions for the user (Build 22):**
- Does the block look good enough to build the map this way? What is wrong with it, in your words?
- When to measure in Safari (about ten minutes, Safari in front and untouched).
- Push Build 22, and when.
- The props are heavy (MAP-03): fewer props, lighter copies, or props only near the viewer.

**The first push of Build 21 failed on GitHub and deployed nothing.** A fault in the new test, not in the game: it compared with a record stored from the Mac, byte for byte, and GitHub's machine differs in the last digits. Fixed in the tests only (TEST-08): six suites now compare with the older build taken from its commit and run on the spot. Rule: no suite may depend on a record stored from one machine.

**Build 21 in short: Kohar Valley as map data (map build 1 of 9). Nothing visible changed.**
- **What moved:** every place, edge, grid size, start, objective, enemy post and route, and the Ambush arena, from the code into one description, `dist/map-kohar.js`. `dist/maps.js` holds the maps and the active one. Kohar Valley is map 1 and the only map.
- **Proof it is the same:** the world built from the map is Build 20's, number for number (27 parts; Build 20 is run from its commit on the same machine); every moved list equals the Build 20 sources; Story and Skirmish replay the Build 09 trace and solo Ambush replays Build 15.
- **Proof the data governs:** 411 values changed one at a time, each changes the game; 84 more for the props. A second small map from the same kind of description is deployed and played in Story, Skirmish and Ambush.
- **Safari (B17):** Build 21 3.2 to 3.6 ms a frame, Build 20 3.3 to 3.6 ms, p99 6 to 9; start-up 233 to 265 ms against 224 to 267 ms. No difference that can be measured.
- **Checks:** 24 suites, 233 checks, all pass (headless). T31 is new (7 checks, about four minutes); 125 deliberate breakages caught.
- **Not built (MAP-01):** changing map inside a running page. Co-op will need it, because a reload drops the connection.
- **Found, not changed (MAP-02):** a few values in the props list and one patrol loop that nothing uses, as in Build 20.

**Map project, the user's decisions (2026-09-29, E34):**
- **Order:** map as data (done), **look slice next**, then player height, enemy height, co-op height, layout, dressing, Ambush arena with a rooftop start, Story operation.
- **Setting:** a hill town built in terraces. Working name: **Dehrun Terraces** (the user may rename it).
- **Mantling: yes.** The standing rule against stairs and mantling is lifted for the map project. Not built yet.
- **Fall damage:** none up to 3 m, fatal at 12 m, the same for enemies.
- **Assets:** CC0 preferred, credit-line assets allowed, nothing paid. The list is approved by the user before anything is downloaded.
- **Real time (E35):** one developer-day of estimate has been about one hour of session. The remaining builds: about 30 to 40 hours in 10 to 13 sessions without Story.

**First two-player playtest (user and a friend, 2026-09-29, live build).** Four findings: kicked from the lobby when a game ends; enemy bullets "10 each"; a precision-rifle "body shot" on a teammate did 99; no revive. Build 20 answers them.

**Build 20 in short: co-op fixes and revive** (live).
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

**Next:** the user's verdict on the look slice; the Safari measurement when the user says; then map build 3, player height. Play Build 20 together (checklist in the roadmap). Squad codes (F.12) remain filed, so that connecting once takes a four-letter code (checklist in the roadmap's "Recommended next task"). Then the Build 14 playtest and the economy decision, then squad codes (F.12) or M2.06 option 2 (hybrid ragdoll).

**Filed, not started:**
- F.13 co-op means real players only in every mode including Story; Story missions are built for four, so fewer players will be harder; a difficulty option may be needed.
- F.14 friends-only PvP in private lobbies, including deathmatch. PVP-01 and AI-03 are fixed.
- F.15 1v1 deathmatch in a private lobby, an alternative to co-op, never a replacement. PVP-01 and AI-03 are fixed; what remains is listed in the roadmap.
- M2.07 wallbanging; M3.10 distinct weapon models; M5.10 terrain height variation (E23); F.12 short join codes (Step A reported, E27).

**Found, not fixed:**
- AMB-06 residue: a few unseen enemies per 300 arrivals are withdrawn and re-sent at the north-west corner of the courtyard.
- AMB-05: the announced spawn sector loosens when its side is walled off.
- AI-07: dead enemies keep attack tokens (every mode).
- MAP-03: the look slice's props are heavy, everything in the block is always drawn, bullets pass through small props, no plants (eleven items in the roadmap). B18: the block is not measured in Safari.
- MAP-01: the map cannot be changed inside a running page (co-op will need it). MAP-02: a few map values nothing reads.
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

**Commands:** `node tests/test-<name>.mjs` for height-b24, kit-b23, lookslice-b22, mapdata-b21, sprint-m1, framefire-m1, diagnostics-m1, combatfeel-m2, combatfeel-m3, enemies-b07, perf02-b07, pausekeys-b07, build08, cache-deploy01, engage-ai04, ambush-b09, ambush-b10, ambush-b11, ambush-b12, ambush-b13, ambush-b14, coop-handshake, ambush-coop-b16, squad-b17, fair-b18, equipment-b19 and revive-b20. `node tools/stamp-build.mjs` after any change in `dist/`. `node` is not on PATH on this Mac; the Codex-bundled v24.19.0 at `~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` works. Serve with `python3 -m http.server 8765 --directory dist`.

**Rules:**
- Never reintroduce stamina.
- Every place, edge and grid size is in the map (`dist/map-kohar.js`); never write one in the code.
- Kohar Valley must stay what Build 20 had (T31 compares it number for number).
- Preserve story, four classes, weapon balance, enemy fire formulas, co-op and pointer controls.
- `dist/` is source; stamp it after edits.
- No desktop screen/audio recording.
- Pushing to `main` publishes: never push a build the user has not asked to release. The earlier chatgpt.site deployment is separate and untouched.
