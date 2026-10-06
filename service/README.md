# DUSTLINE squad service

A Cloudflare Worker with one Durable Object. It lets two players of DUSTLINE find each other by a 4-character code: it
holds the host's connection description for a few minutes, hands it to the one player who enters the code, and passes that
player's answer back. It carries no game data, and the two pages talk to each other directly once connected.

Build 41: when the two pages cannot reach each other directly, it also gives each of them a pass to a relay (Cloudflare's
TURN service: short-lived credentials, made for that one connection) and carries a second pair of descriptions. The relay
itself is Cloudflare's, not this Worker: the game's traffic never passes through the Worker.

This folder is versioned with the game but is not part of the site: GitHub Pages serves `dist/` only.

- `src/lobby.js`: the whole rule (what is stored, for how long, who may ask). `tests/test-squad-codes-b37.mjs` runs this
  file as it is.
- `src/worker.js`: joins the rule to Cloudflare (allowed origins, the Durable Object, its alarm, and the call to
  Cloudflare's TURN service for a pass). `tests/test-relay-b41.mjs` runs both files.
- `wrangler.toml`: the name, the allowed origins, the Durable Object and its migration, logs switched off.

## Deploy (once, and again whenever a file here changes)

You need Node.js 18 or later (`node --version`) and the Cloudflare account. No card is needed for the free plan.

1. In a terminal, from the repository:
   ```sh
   cd service
   npx wrangler@4 login
   ```
   A browser window opens: sign in to Cloudflare and press Allow.
2. Deploy:
   ```sh
   npx wrangler@4 deploy
   ```
   The first time it may ask you to choose a `workers.dev` subdomain for the account (any name; it becomes part of the
   address). It ends by printing the address, of the form `https://dustline-squad.<your-subdomain>.workers.dev`.
   If it says the Worker was last changed in the dashboard and asks whether to go on, answer `y`: secrets set in the
   dashboard are kept.
3. Check it: open `<that address>/health` in a browser. It must show
   `{"ok":true,"service":"dustline-squad","protocol":2,"relay":"ready"}`. `"relay":"unset"` means the two secrets below
   are not there yet; `"relay":"refused"` means Cloudflare did not accept them (a value mistyped or cut short).
4. Give the address to whoever maintains the game (one value, nothing secret). It goes into `dist/squad.js`
   (`SQUAD.url`, no slash at the end), followed by `node tools/stamp-build.mjs`.

Nothing else is created by hand for the squad codes: the Durable Object is made by the migration in `wrangler.toml`.
The relay needs one key, made once in the dashboard (next section).

## The relay (Build 41): a TURN key and two secrets, once

Without this the squad codes work as before and two networks that cannot reach each other are told that no relay is set
up. The key's token is a password: it goes into Cloudflare's own form and nowhere else, never into a message, the page or
the repository.

1. **Make the key.** In the Cloudflare dashboard (dash.cloudflare.com), the account's sidebar: **Realtime** (under Media),
   then **TURN Server**, then **Create**. Name it `dustline` and press Create. Two values are shown: **Turn Token ID** and
   **API Token**. The API Token is shown only now: leave the page open, or copy both into a note that you delete after.
   If Cloudflare asks for a payment method to switch Realtime on, that is its rule for the product; the first 1,000 GB a
   month cost nothing and the game uses about 0.05 GB for an hour of two-player play.
2. **Give them to the Worker.** Sidebar: **Compute (Workers)**, then **Workers & Pages**, then `dustline-squad`, then
   **Settings**, then **Variables and Secrets**, then **Add**. Add two, both with the type **Secret**:
   - name `TURN_KEY_ID`, value: the Turn Token ID;
   - name `TURN_KEY_API_TOKEN`, value: the API Token.
   Press **Deploy** (the dashboard's word for saving them).
   The same from a terminal, if the dashboard's pages have moved: in `service/`, `npx wrangler@4 secret put TURN_KEY_ID`
   and `npx wrangler@4 secret put TURN_KEY_API_TOKEN`; each asks for the value and stores it.
3. **Deploy this folder** (the Worker's code changed in Build 41): `cd service`, then `npx wrangler@4 deploy`.
4. **Check:** open `<the address>/health`. It must show `"protocol":2,"relay":"ready"`.

Nothing is copied back to whoever maintains the game: the page learns of the relay from the service, and its address has
not changed. To take the relay away, delete the TURN key in the dashboard (Realtime, TURN Server): passes already issued
stop working and the game says that no pass could be had.

## If the game moves

`ALLOWED_ORIGINS` in `wrangler.toml` lists the pages that may use the service (the published game and a local copy). A page
on another address is refused; add its origin and deploy again.

## What it stores

Per code: the host's connection description (which contains the host's network addresses), the build of the host's page,
two random keys, three times, and once someone has joined, that player's connection description. In the Durable Object's
storage, nowhere else.

Both descriptions are deleted when the host has collected the answer (normally within two seconds of the friend joining).
What stays then, for two minutes at the most, is the code, the two keys, the build and the times: nothing with an address
in it. It is there so that a second attempt through the relay can be arranged, and it is deleted the moment the host's
page says it is connected. A second pair of descriptions, if there is one, is held and deleted exactly as the first. A
record is also deleted when the host cancels or leaves the page, a minute after the host's page stops asking, and at the
latest ten minutes after it was made (two minutes after its first answer was collected). One count is kept: how many
passes were issued today (a number and the day).

It writes no log line and never reads the caller's address; `wrangler.toml` switches Workers logs off. Cloudflare itself,
as the network in front of it, sees the requests as it does for any site; its dashboard shows request counts.

## What the relay sees and stores

A pass is asked of Cloudflare by this Worker with one value: how long it should last (six hours). Nothing about the
player goes with it. A pass is given only to the host or the joiner of a code whose direct attempt is under way: not
before, not to anyone else, at most two to a side, at most two hundred a day (`RELAY_DAY` in `src/lobby.js`).

The relay (turn.cloudflare.com) is used only when the direct attempt has failed. Then all of the game's traffic between
the two players passes through it: positions, shots, hits, the mission's state, about 10 kB a second from the host and
1.5 kB from the joiner. It is encrypted between the two browsers (DTLS, as every WebRTC connection is): Cloudflare
carries it and cannot read it. What Cloudflare does see, by its own account, is the two players' IP addresses, the port
numbers and when the session ran, and it counts the bytes (the dashboard's Realtime page shows the total). Neither
player's browser sees the other's address in a relayed session: each sees the relay's.

A relayed session ends when its pass does: after six hours both press DISCONNECT and make a new code.

## Limits

Free plan: 100,000 requests a day. A waiting host asks every two seconds: about 300 requests for a code nobody joins, a
handful for one joined at once. At most 2,000 codes live at a time (`MOST`); beyond that CREATE SQUAD is told the service
is busy. The relay: 1,000 GB a month free on Cloudflare's present terms, then 5 US cents a GB; an hour of two-player
play through it is about 0.05 GB.

## Take it down

`npx wrangler@4 delete` in this folder. The game then says the service cannot be reached and offers the manual connection.
