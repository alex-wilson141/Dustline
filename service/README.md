# DUSTLINE squad service

A Cloudflare Worker with one Durable Object. It lets two players of DUSTLINE find each other by a 4-character code: it
holds the host's connection description for a few minutes, hands it to the one player who enters the code, and passes that
player's answer back. It carries no game data, and the two pages talk to each other directly once connected.

This folder is versioned with the game but is not part of the site: GitHub Pages serves `dist/` only.

- `src/lobby.js`: the whole rule (what is stored, for how long, who may ask). `tests/test-squad-codes-b37.mjs` runs this
  file as it is.
- `src/worker.js`: joins the rule to Cloudflare (allowed origins, the Durable Object, its alarm).
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
3. Check it: open `<that address>/health` in a browser. It must show
   `{"ok":true,"service":"dustline-squad","protocol":1}`.
4. Give the address to whoever maintains the game (one value, nothing secret). It goes into `dist/squad.js`
   (`SQUAD.url`, no slash at the end), followed by `node tools/stamp-build.mjs`.

Nothing else is created by hand: the Durable Object is made by the migration in `wrangler.toml`, and there are no keys,
secrets or databases to set up.

## If the game moves

`ALLOWED_ORIGINS` in `wrangler.toml` lists the pages that may use the service (the published game and a local copy). A page
on another address is refused; add its origin and deploy again.

## What it stores

Per code: the host's connection description (which contains the host's network addresses), the build of the host's page,
two random keys, three times, and once someone has joined, that player's connection description. In the Durable Object's
storage, nowhere else.

A record is deleted when the host has collected the answer (normally within two seconds of the friend joining), when the
host cancels or leaves the page, a minute after the host's page stops asking, and at the latest ten minutes after it was
made. It writes no log line and never reads the caller's address; `wrangler.toml` switches Workers logs off. Cloudflare
itself, as the network in front of it, sees the requests as it does for any site; its dashboard shows request counts.

## Limits

Free plan: 100,000 requests a day. A waiting host asks every two seconds: about 300 requests for a code nobody joins, a
handful for one joined at once. At most 2,000 codes live at a time (`MOST`); beyond that CREATE SQUAD is told the service
is busy.

## Take it down

`npx wrangler@4 delete` in this folder. The game then says the service cannot be reached and offers the manual connection.
