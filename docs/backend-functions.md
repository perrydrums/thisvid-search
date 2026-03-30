# Backend (Netlify functions)

## Role

Functions under `functions/` run on Netlify (Node). They fetch **ThisVid HTML or assets**, parse with **Cheerio** (or stream/binary for downloads), and return JSON or files. The SPA never calls ThisVid directly for these endpoints—it uses paths like `/getVideos` that Netlify routes to the deployed function (or to a sibling deployment per `netlify.toml`).

## `functions/videos.js` — listing scrape

- **Input** (POST JSON): `url` (path only, e.g. `/newest/1/`), `page`, `omitPrivate`, `minDuration` (minutes), `quick`.
- **Behavior**: `fetch('https://thisvid.com' + url)`, load HTML, select thumbnails (`.tumbpu`), extract title, href, private flag, avatar, views, date, duration.
- **Duration filter**: compares parsed mm:ss to `minDuration * 60` seconds.
- **404**: returns JSON error shape with `success: false` (client expects empty or failed response handling).

Selectors and DOM structure are **coupled to ThisVid’s markup**. If the site changes class names or layout, this file (and possibly `getCategories.ts` / pagination parsing in `useSearchLogic`) must be updated together.

## `functions/friends.js`

Paginates `/members/{userId}/friends/` and aggregates friend cards. Used by `GET /friends?userId=…` via `helpers/friends.ts`.

## `functions/friendsEvents.js` (experimental)

**GET** with `username` and `password` query parameters. Logs into ThisVid via **Puppeteer** (headless Chromium), then scrapes the authenticated “what’s new”/events-style feed. **Credentials hit your serverless function**—high risk on a public deployment; this feature is **experimental** and **may be removed from public access**. See [`search-and-filtering.md`](./search-and-filtering.md#friendsevents-experimental).

## Other handlers

Inspect the `functions/` directory for:

- `videoDetails.js` — per-video metadata
- `download.js` — download-related proxying
- `feed.js` — feed aggregation

Each should be treated as **server-side scraping** with the same fragility: respect rate limits and ToS in operational use.

## Local development

`src/setupProxy.js` maps:

- ThisVid paths → `https://thisvid.com`
- `/getVideos`, `/friends`, `/download`, etc. → `https://tvass.netlify.app/.netlify/functions/…`

So local CRA can mimic production without running Netlify CLI—**but** you depend on the remote functions being available. To work fully offline, run Netlify dev or point the proxy at a local functions server.

## Production redirects

`netlify.toml` defines SPA fallbacks for client routes and **200 redirects** that proxy path prefixes to ThisVid or to the functions host. If you add a new API path, add matching **redirect** and **dev proxy** entries.
