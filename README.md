# ThisVid Advanced Search

A search frontend for [ThisVid](https://thisvid.com) with stronger discovery tools than the site’s built-in search. It **loads many listing pages in parallel**, merges the results, and applies **client-side filters** (include/exclude tags, AND/OR, boost/diminish relevance, duration, favourites, multiple sort modes). Listing HTML is scraped in **Netlify Functions** (Cheerio) so the app can stay same-origin and avoid CORS.

## Requirements

- **Node** >= 20  
- **npm** >= 9  

## Run locally

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000). Development uses `src/setupProxy.js` to proxy ThisVid paths and serverless routes (see [docs/architecture.md](docs/architecture.md)).

Other scripts:

- `npm run build` — production bundle in `build/`
- `npm run eject` — irreversible CRA eject (rarely needed)

Optional analytics: set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` (see [docs/supabase-and-analytics.md](docs/supabase-and-analytics.md)).

## Documentation

Detailed design and behavior live in **[docs/](docs/README.md)**:

| Doc | Topics |
|-----|--------|
| [docs/architecture.md](docs/architecture.md) | Stack, folders, proxy vs `netlify.toml`, env vars |
| [docs/search-and-filtering.md](docs/search-and-filtering.md) | Modes, multi-page fetch, filters, URL params |
| [docs/backend-functions.md](docs/backend-functions.md) | Netlify functions, scraping, local vs prod paths |
| [docs/supabase-and-analytics.md](docs/supabase-and-analytics.md) | Search logging, feedback |

Contributors and automation should read the relevant doc **before** changing search URLs, scrapers, or logging—and **update that doc** when behavior changes.

## Quick entry points in code

- **Routes**: `src/index.js` — `/`, `/search` (primary v2 dashboard), `/settings`, `/moods`, `/history`, `/legacy/*` (classic search and tools)
- **Search UI**: `src/pages/Search/index.tsx` (`SearchRefactored.tsx` is experimental / not wired as default)
- **Fetch + filter helpers**: `src/helpers/videos.ts`
- **Search orchestration**: `src/hooks/useSearchLogic.ts`
- **Listing scraper**: `functions/videos.js`
- **Dev proxy**: `src/setupProxy.js`

Bootstrapped with [Create React App](https://github.com/facebook/create-react-app); see their [docs](https://facebook.github.io/create-react-app/docs/getting-started) for generic tooling (testing, deployment, troubleshooting).
