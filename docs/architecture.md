# Architecture

## Stack

- **Frontend**: Create React App (`react-scripts`), React 18, React Router 6, TypeScript for most `src/` code.
- **Styling**: Global `App.css`, some CSS modules (e.g. Home).
- **HTTP**: Browser `fetch`; **Cheerio** in the browser for parsing HTML returned from same-origin proxied ThisVid paths.
- **Backend**: **Netlify Functions** in `functions/` (Node, CommonJS). Deploy config in `netlify.toml`.

## Repository layout

```
src/
  pages/           Primary shell: `Search` (`/` + `/search`), `Settings`, `Moods`, `History`; legacy screens under `pages/legacy/` (`SearchLegacy`, Analyse, Recommendations, WhatsNew, Preferences, Home)
  components/      `components/v2/` (primary UI); `components/legacy/` (classic search/header/results); shared `AuthEmailReturnHandler.tsx` at top level
  hooks/           useSearchLogic, useSearchState, useVideoFiltering (partial refactor), useAuth
  helpers/         videos.ts, types.ts, Supabase, favourites, categories, users, recommendations, analyseFavourites
functions/         Netlify handlers (videos, friends, download, …)
public/            Static assets, PWA manifest
```

## Why two “ways” to hit ThisVid?

1. **Same-origin paths** (`/newest/`, `/members/`, `/categories/`, `/legacy/videos/…`, etc.)  
   In **development**, `src/setupProxy.js` forwards these to `https://thisvid.com`.  
   In **production**, `netlify.toml` uses **redirects** so the browser still requests your domain; Netlify proxies to ThisVid. That avoids CORS when the React app fetches listing or profile HTML and parses it with Cheerio. SPA routes under **`/legacy/`** stay on **`index.html`** except **`/legacy/videos/*`**, which is proxied to ThisVid like **`/videos/*`**.

2. **Serverless scraping** (`GET /getVideos` with query params; **POST** JSON still works)  
   The browser calls your app’s `/getVideos?url=…`, which redirects (Netlify) or proxies (dev) to a **Netlify function** that fetches `https://thisvid.com` + path server-side, parses thumbnails with Cheerio, and returns JSON (`Video[]`). This keeps listing markup parsing centralized and allows options like `omitPrivate`, `minDuration`, and `quick`. **GET** carries all options in the URL so Netlify’s Edge/Durable cache can key on `Netlify-Vary: query` (`Netlify-CDN-Cache-Control` is set in `functions/videos.js`).

Production also routes **`/friends`**, **`/friendsEvents`** (**POST**, JSON credentials), **`/download`**, **`/videoDetails`**, etc. to the **tvass.netlify.app** deployment (see `netlify.toml`). Local dev mirrors that via `setupProxy.js`.

## Security hardening (Netlify + functions)

Global response headers (**CSP**, **HSTS**, **X-Frame-Options**, **Referrer-Policy**, etc.) ship from **`[[headers]] for = "/*"`** in `netlify.toml` (CRA currently needs **`unsafe-inline`** for scripts/styles—narrow further if the bundle allows). Keep **`connect-src`** aligned with client **`fetch`** targets (for example **`api.ipify.org`** for visitor IP via **`getIp`**).

Proxied function paths declare **`[redirects.rate_limit]`** buckets. Handlers share **`allowedOrigins.js`** (optional **`SITE_ALLOWED_ORIGINS`**) and **`validateThisvidUrl.js`** (SSRF guardrails). Details: [`backend-functions.md`](./backend-functions.md).

On first load, `src/index.js` sets `localStorage.visitorId` and resolves a display name via `getNameWithSeed` (see `helpers/users`). This pairs with analytics logging, not with ThisVid auth.

## Environment variables (frontend)

Supabase (optional for local dev if keys missing):

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Defined in `.env` (not committed). See [supabase-and-analytics.md](./supabase-and-analytics.md).

## Scripts

- `npm start` — CRA dev server with proxy (`BROWSER=none` in `package.json`).
- `npm run build` — Production bundle to `build/`.

## Short links

**`/s/:code`** is a client route that resolves a stored search snapshot from Supabase and redirects to **`/search`** or **`/legacy/search`**. Production **`netlify.toml`** includes **`[[redirects]] from = "/s/*"`** → **`index.html`** (SPA) so direct visits work. Details: [search-and-filtering.md](./search-and-filtering.md), [supabase-and-analytics.md](./supabase-and-analytics.md).

Node **>= 22** (Netlify build uses `NODE_VERSION` in `netlify.toml`; local dev follows `.nvmrc`) and npm **>= 9** per `package.json` `engines`.
