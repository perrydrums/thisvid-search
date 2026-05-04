# Backend (Netlify functions)

## Role

Functions under `functions/` run on Netlify (Node). They fetch **ThisVid HTML or assets**, parse with **Cheerio** (or stream/binary for downloads), and return JSON or files. The SPA never calls ThisVid directly for these endpoints—it uses paths like `/getVideos` that Netlify routes to the deployed function (or to a sibling deployment per `netlify.toml`).

The site build and function runtime follow **`NODE_VERSION` in `netlify.toml`** (currently Node 22), aligned with `.nvmrc` and `package.json` `engines`.

## Abuse controls

- **`netlify.toml` redirect rate limits**: proxied routes **`/getVideos`**, **`/download`**, **`/friends`**, **`/friendsEvents`**, **`/videoDetails`** declare **`[redirects.rate_limit]`** (requests per **`window_size`** seconds, keyed by **`ip`** + **`domain`**). Tune per route if legitimate traffic spikes.
- **Optional caller lock (`SITE_ALLOWED_ORIGINS`)**: when set to a comma-separated list of full origins (`https://your-site.example,http://localhost:3000`), each function wraps early with **`functions/allowedOrigins.js`** and rejects callers whose **`Origin` / `Referer`** does not match. Leave **unset** to keep permissive localhost / generic testing workflows.
- **`functions/validateThisvidUrl.js`**: rejects URLs/paths that are not anchored to **`https://thisvid.com`**, guarding **`videos.js`**, **`videoDetails.js`**, and **`download.js`** against SSRF probes.

Errors returned to browsers are **generic**; details stay in **`console.error`** logs on Netlify.

## `functions/videos.js` — listing scrape

- **Input** (**GET** query string, preferred for Netlify CDN caching): `url` (path only, must start with `/` and satisfy `validateThisvidUrl` rules — e.g. `/newest/1/`), `page`, `omitPrivate`, `minDuration` (minutes), `quick`. **POST** JSON with the same keys is still accepted for backward compatibility.
- **Behavior**: resolves `url` safely, then **`fetch(LISTING_BASE + pathSuffix)`**. When **`quick`** is **`false`**, subsequent per-video **`fetch`** calls resolve each scraped `href` to an absolute **`https://thisvid.com`** URL before fetching.
- **Duration filter**, **404** handling, and **CDN caching headers** behave as before (see legacy notes in git history).

Selectors and DOM structure are **coupled to ThisVid’s markup**. If the site changes class names or layout, this file (and possibly `getCategories.ts` / pagination parsing in `useSearchLogic`) must be updated together.

## `functions/videoDetails.js`

**GET** with `url=` must be an **absolute** `https://thisvid.com/...` URL. Fetches HTML and extracts category hints for client-side enrichment (`Search` → `friendsEvents`, `WhatsNew`, etc.).

## `functions/download.js`

**GET** with `url=` must be an absolute **`https://thisvid.com`** page (Puppeteer opens it and reads the `<video>` `src`). Non-allowed URLs fail fast with **`400`**.

## `functions/friends.js`

Paginates `/members/{userId}/friends/` and aggregates friend cards (`GET /friends?userId=…`, `helpers/friends.ts`). `userId` is **`encodeURIComponent`’d** in the outbound path segments.

## `functions/friendsEvents.js` (experimental)

**POST** with JSON **`{ "username": "…", "password": "…" }`**. **`OPTIONS`** is answered for CORS preflight before origin checks. Logs into ThisVid via **Puppeteer** (headless Chromium), then scrapes the authenticated “what’s new”/events-style feed.

**Credentials still cross your serverless runtime** (in-memory only for the request). This feature is **experimental**; keep rate limits tight and consider **`SITE_ALLOWED_ORIGINS`** in production. See [`search-and-filtering.md`](./search-and-filtering.md#friendsevents-experimental).

## Other handlers

Inspect the `functions/` directory for additional utilities (e.g. shared **`allowedOrigins.js`**, **`validateThisvidUrl.js`**). Each handler should be treated as **server-side scraping** with the same fragility: respect rate limits and ToS in operational use.

## Local development

`src/setupProxy.js` maps:

- ThisVid paths → `https://thisvid.com` (including **`/legacy/videos/`** for video detail pages; this must not fall through to the SPA **`/legacy/*`** route)
- `/getVideos`, `/friends`, `/download`, etc. → `https://tvass.netlify.app/.netlify/functions/…`

So local CRA can mimic production without running Netlify CLI—**but** you depend on the remote functions being available. To work fully offline, run Netlify dev or point the proxy at a local functions server. Do **not** set **`package.json`** **`"proxy"`** to the same host/port as the dev server (that can recurse and yield **`431 Request Header Fields Too Large`** on unmatched paths).

## Production redirects

`netlify.toml` defines SPA fallbacks for client routes (`/`, `/search`, `/settings`, `/moods`, `/history`, **`/legacy/*`**, …), with **`/legacy/videos/*`** proxied to **ThisVid** **before** the **`/legacy/*`** fallback so Cheerio fetches (e.g. legacy Analyse) receive real video HTML. Other **200 redirects** proxy path prefixes to ThisVid or to the functions host. Global **security headers** (CSP, HSTS, clickjacking protection, etc.) ship via **`[[headers]] for = "/*"`**. If you add a new API path, add matching **redirect**, **`rate_limit`** (if proxied externally), dev **proxy**, and CSP **`connect-src`** entries when needed. The client resolves the visitor IP via **`getIp`** (`src/helpers/supabase/getIp.ts`), which calls **`https://api.ipify.org`** and must stay in **`connect-src`**.
