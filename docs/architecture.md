# Architecture

## Stack

- **Frontend**: Create React App (`react-scripts`), React 18, React Router 6, TypeScript for most `src/` code.
- **Styling**: Global `App.css`, some CSS modules (e.g. Home).
- **HTTP**: Browser `fetch`; **Cheerio** in the browser for parsing HTML returned from same-origin proxied ThisVid paths.
- **Backend**: **Netlify Functions** in `functions/` (Node, CommonJS). Deploy config in `netlify.toml`.

## Repository layout

```
src/
  pages/           Route-level screens (Search, SearchV2 `/search-v2`, Preferences, Analyse, etc.)
  components/      Reusable UI (forms, results, header, feedback)
  hooks/           useSearchLogic, useSearchState, useVideoFiltering (partial refactor)
  helpers/         videos.ts, types.ts, Supabase, favourites, categories, users, recommendations, analyseFavourites
functions/         Netlify handlers (videos, friends, download, …)
public/            Static assets, PWA manifest
```

## Why two “ways” to hit ThisVid?

1. **Same-origin paths** (`/newest/`, `/members/`, `/categories/`, etc.)  
   In **development**, `src/setupProxy.js` forwards these to `https://thisvid.com`.  
   In **production**, `netlify.toml` uses **redirects** so the browser still requests your domain; Netlify proxies to ThisVid. That avoids CORS when the React app fetches listing or profile HTML and parses it with Cheerio.

2. **Serverless scraping** (`POST /getVideos`)  
   The browser calls your app’s `/getVideos`, which redirects (Netlify) or proxies (dev) to a **Netlify function** that fetches `https://thisvid.com` + path server-side, parses thumbnails with Cheerio, and returns JSON (`Video[]`). This keeps listing markup parsing centralized and allows options like `omitPrivate`, `minDuration`, and `quick`.

Production also routes `/friends`, `/download`, `/videoDetails`, etc. to the **tvass.netlify.app** deployment (see `netlify.toml`). Local dev mirrors that via `setupProxy.js`.

## Visitor identity

On first load, `src/index.js` sets `localStorage.visitorId` and resolves a display name via `getNameWithSeed` (see `helpers/users`). This pairs with analytics logging, not with ThisVid auth.

## Environment variables (frontend)

Supabase (optional for local dev if keys missing):

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Defined in `.env` (not committed). See [supabase-and-analytics.md](./supabase-and-analytics.md).

## Scripts

- `npm start` — CRA dev server with proxy (`BROWSER=none` in `package.json`).
- `npm run build` — Production bundle to `build/`.

Node **>= 22** (Netlify build uses `NODE_VERSION` in `netlify.toml`; local dev follows `.nvmrc`) and npm **>= 9** per `package.json` `engines`.
