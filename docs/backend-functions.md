# Backend (Netlify functions)

## Role

Functions under `functions/` run on Netlify (Node). They fetch **ThisVid HTML or assets**, parse with **Cheerio** (or stream/binary for downloads), and return JSON or files. The SPA never calls ThisVid directly for these endpoints—it uses paths like `/getVideos` that Netlify routes to the deployed function (or to a sibling deployment per `netlify.toml`).

The site build and function runtime follow **`NODE_VERSION` in `netlify.toml`** (currently Node 22), aligned with `.nvmrc` and `package.json` `engines`.

## Abuse controls

- **`netlify.toml` redirect rate limits**: proxied routes **`/getVideos`**, **`/download`**, **`/friends`**, **`/memberFeed`**, **`/videoDetails`** declare **`[redirects.rate_limit]`** (requests per **`window_size`** seconds, keyed by **`ip`** + **`domain`**). Tune per route if legitimate traffic spikes.
- **Optional caller lock (`SITE_ALLOWED_ORIGINS`)**: when set to a comma-separated list of full origins (`https://your-site.example,http://localhost:3000`), each function wraps early with **`functions/allowedOrigins.js`** and rejects callers whose **`Origin` / `Referer`** does not match. Leave **unset** to keep permissive localhost / generic testing workflows.
- **`functions/validateThisvidUrl.js`**: rejects URLs/paths that are not anchored to **`https://thisvid.com`**, guarding **`videos.js`**, **`videoDetails.js`**, and **`download.js`** against SSRF probes.

Errors returned to browsers are **generic**; details stay in **`console.error`** logs on Netlify.

## `functions/videos.js` — listing scrape

- **Input** (**GET** query string, preferred for Netlify CDN caching): `url` (path only, must start with `/` and satisfy `validateThisvidUrl` rules — e.g. `/newest/1/`), `page`, `minDuration` (minutes), `quick`. **POST** JSON with the same keys is still accepted for backward compatibility.
- **Behavior**: resolves `url` safely, then **`fetch(LISTING_BASE + pathSuffix)`**. When **`quick`** is **`false`**, subsequent per-video **`fetch`** calls resolve each scraped `href` to an absolute **`https://thisvid.com`** URL before fetching. Tiles are parsed by **`functions/parseVideoTile.js`** (shared with `memberFeed.js`), which also returns a **`rating`** percent (0–100) and skips tiles that are not videos instead of throwing.
- **Duration filter** and **404** handling behave as before. Successful responses set **`Netlify-CDN-Cache-Control`** (`Netlify-Vary: query`) so the CDN can cache **GET** results. **Slow listings** stay cached for **7 days** (`max-age=604800`, `stale-while-revalidate=1209600`): the category index (`/categories/`), `/categories/{slug}/most-popular/`, and `/tags/{tag}/popular-*` plus `best-*`. **Latest** category and tag listings, and every other listing, stay at **1 hour** (`max-age=3600`, `stale-while-revalidate=7200`) so “newest” search and recommendations are not a week stale. Browsers still receive `Cache-Control: public, max-age=0, must-revalidate` for this JSON endpoint.
- Proxied HTML for **`/categories/*`** and **`/tags/*`** is still cached for **7 days** via `[[headers]]` in `netlify.toml`. That header covers the HTML the browser fetches directly (category index, pagination), not the JSON from `/getVideos`.

Selectors and DOM structure are **coupled to ThisVid’s markup**. If the site changes class names or layout, update **`parseVideoTile.js`** and the browser copy **`src/helpers/parseVideoTile.ts`** together, and check pagination / category parsing in `useSearchLogic` and `getCategories.ts`.

## `functions/videoDetails.js`

**GET** with `url=` must be an **absolute** `https://thisvid.com/...` URL. Fetches the video page and returns `category` (first category, kept for older callers), `categories`, `tags`, `uploader` (`username`, `uid`), and `rating` (0–100, from the 5-star score). The recommendations page uses this to score candidates. The JSON is cached for **1 year** (`Netlify-Vary: query`).

## `functions/download.js`

**GET** with `url=` must be an absolute **`https://thisvid.com`** page (Puppeteer opens it and reads the `<video>` `src`). Non-allowed URLs fail fast with **`400`**.

## `functions/friends.js`

Paginates `/members/{userId}/friends/` and aggregates friend cards (`GET /friends?userId=…`, `helpers/friends.ts`). `userId` is **`encodeURIComponent`’d** in the outbound path segments.

## `functions/memberFeed.js`

**GET** `/memberFeed?uid=` with a numeric member id. Fetches `https://thisvid.com/members/{uid}/` and splits the video tiles by section headline into `publicVideos`, `privateVideos`, and `favouriteVideos`, plus `username` from `og:title`. Empty sections are omitted on the profile and come back as empty arrays. Friend cards and photo albums are ignored (they are not `/videos/` links). The uid is rejected unless it is 1–12 digits. Successful responses are CDN-cached for **30 minutes** (`Netlify-Vary: query`). The recommendations page uses this instead of an authenticated friends-events feed.

## Removed: `friendsEvents`

The Puppeteer login that scraped ThisVid’s friends-events page has been removed, along with `/legacy/whats-new`. Recommendations use public profile and listing pages only. `/legacy/whats-new` and `/legacy/recommendations` **301** to `/recommendations`.

## Other handlers

Inspect the `functions/` directory for additional utilities (e.g. shared **`allowedOrigins.js`**, **`validateThisvidUrl.js`**). Each handler should be treated as **server-side scraping** with the same fragility: respect rate limits and ToS in operational use.

## Local development

`src/setupProxy.js` maps:

- ThisVid paths → `https://thisvid.com` (including **`/legacy/videos/`** for video detail pages; this must not fall through to the SPA **`/legacy/*`** route)
- `/getVideos`, `/friends`, `/memberFeed`, `/download`, etc. → `https://tvass.netlify.app/.netlify/functions/…`

So local CRA can mimic production without running Netlify CLI—**but** you depend on the remote functions being available. To work fully offline, run Netlify dev or point the proxy at a local functions server. Do **not** set **`package.json`** **`"proxy"`** to the same host/port as the dev server (that can recurse and yield **`431 Request Header Fields Too Large`** on unmatched paths).

## Production redirects

`netlify.toml` defines SPA fallbacks for client routes (`/`, `/search`, `/analyse`, `/recommendations`, `/settings`, `/moods`, `/history`, **`/legacy/*`**, …), with **`/legacy/videos/*`** proxied to **ThisVid** **before** the **`/legacy/*`** fallback so Cheerio fetches (e.g. Analyse video detail pages) receive real video HTML. **`/legacy/recommendations`**, **`/legacy/whats-new`**, and the hyphenated aliases **301** to **`/recommendations`** before that fallback. Other **200 redirects** proxy path prefixes to ThisVid or to the functions host. Global **security headers** (CSP, HSTS, clickjacking protection, etc.) ship via **`[[headers]] for = "/*"`**. If you add a new API path, add matching **redirect**, **`rate_limit`** (if proxied externally), dev **proxy**, and CSP **`connect-src`** entries when needed. The client resolves the visitor IP via **`getIp`** (`src/helpers/supabase/getIp.ts`), which calls **`https://api.ipify.org`** and must stay in **`connect-src`**.
