# Search and filtering

## Mental model

1. User picks a **mode** (`newest`, `category`, `user`, `friend`, `tags`, `extreme`, or experimental **`friendsEvents`**) and related inputs (type, IDs, category slug, primary tag, etc.).
2. The app may fetch **HTML** from ThisVid (via proxied same-origin URLs) for pagination metadata or usernames.
3. For most modes, **`run`** in `useSearchLogic` fires **parallel** `getVideos` requests for a range of pages (`start` … `start + amount - 1`). **`friendsEvents` does not use that path**; it calls `GET /friendsEvents` with credentials (see below).
4. Results are merged and deduped by **video URL** where applicable (`useSearchLogic.run` for listing modes).
5. **`filterVideos`** and **`sortVideos`** in `helpers/videos.ts` refine the merged list **entirely on the client** (title substring matching, exclude tags, relevance scoring). `friendsEvents` adds optional **category** filtering after enrichment (`videoDetails`-style metadata).

## Alternate UI (VideoScraper shell: `/search-v2`, `/settings`, `/moods`, `/history`)

The redesigned **VideoScraper** shell wraps **`/search-v2`** plus **`/settings`** (ThisVid integration, favourites sync, moods export/import, mock **Live Scraping Logs**), **`/moods`** (moods CRUD backed by **`tvass-moods`** in `localStorage`), and **`/history`** (search replay listing — **mock data** until persisted history exists).

Desktop uses the fixed **320px sidebar** (`AppSidebar`) and shared top bar (`TopNav`) with the same **logo / nav / “Who made this?”** chrome on **`/search-v2`**, **`/settings`**, **`/moods`**, and **`/history`** (History adds a center **search history** filter field). Main content is offset via **`V2Chrome`**; the sidebar is hidden on small viewports (`min-width: 1024px`).

The **`/search-v2`** dashboard (`SearchV2/` + `src/components/v2/`) drives **`useSearchState`**, **`useSearchLogic`**, and **`useVideoFiltering`** for **`user` / `category` / `tags` / `extreme`**. Sharable URLs and Netlify SPA fallbacks behave like **`/search`**. **Sort by** (same values as classic search) stays in the **results** header; the submit control shows **`SEARCH {N} PAGES`** idle and **`SEARCHING done/total...`** while pages load, with a **left-to-right red fill** for progress (`progressCount` / `amount`). After **`run`** completes, the page **smooth-scrolls** so a point **partway down the results block** (~upper-mid viewport), not pinned to the document bottom nor only the results headline. **Results** cards (`ResultsPreviewGrid` → `VideoCard`) show **views** with the same **eye** SVG as classic results on the thumbnail’s **bottom-left**; **`?debug=true`** (or **`localhost`**, see `helpers/debug.ts`) swaps that chip for **`Relevance: …`** (that relevance chip is **hidden below 600px**). **`PRIVATE`** (**lock** + label) sits **top-left** on the thumb when **`isPrivate`** (below **600px**, **lock icon only**, with **`aria-label="Private video"`**). The line under the title is **profile name · date** (no numeric user IDs). Hovering a card fills the tile with **accent red** (thumbnail fades slightly so the thumb area reads red too); title/meta go **white** with text flush-left and light vertical padding under the thumbnail. Mode tabs live in the form; **`AppSidebar`** links jump between app sections.

The legacy **`/preferences`** page remains for classic workflows.
## Search modes (high level)

Defined in UI constants (e.g. `src/pages/Search/index.tsx` — `modes` / `types`). URL paths are built in `useSearchLogic.getUrl`:

| Mode | Typical use | URL pattern (relative to ThisVid) |
|------|-------------|-----------------------------------|
| `newest` | Global newest / private / gay listings | `/{type}/{page}/` |
| `user` | Member’s videos | `/members/{id}/{type}_videos/{page}/` |
| `friend` | Another member’s videos | `/members/{friendId}/{type}_videos/{page}/` |
| `tags` | Tag listing | `/tags/{primaryTag}/{type}-males/{page}/` |
| `category` | Category browse | `/categories/{category}/{type}/{page}/` or `latest` variant |
| `extreme` | Extreme search | `/{type}/{page}/?q={primaryTag}` |
| `friendsEvents` | “What’s New”–style **authenticated** feed | Not a listing URL: see [friendsEvents (experimental)](#friendsevents-experimental) |

If the first page returns 404, search aborts with an error message (standard listing modes only).

### `friendsEvents` (experimental)

Labeled **“What’s New”** in the UI. Intended to load activity from a **logged-in** ThisVid session.

- **Credentials**: the user enters their ThisVid **username and password** in Search (same flow exists on `WhatsNew`). The client requests `GET /friendsEvents?username=…&password=…`, which is handled by **`functions/friendsEvents.js`**. That function uses **Puppeteer** (and headless Chromium on Netlify via `@sparticuz/chromium`) to open `login.php`, submit the form, then scrape the post-login feed.
- **Security / privacy**: passwords are sent to your **serverless backend**, not only to ThisVid in the user’s browser. Treat this as **high-risk** for a public app; rotating credentials, network transport, and logging policies matter. This is a key reason the feature **may be removed from public access** or gated behind private deployment.
- **Flow**: unlike other modes, there is no `getUrl` + parallel `getVideos` scrape of public listing pages. Results may be **cached in `localStorage`** (`tvass-whats-new-videos`) when revisiting the mode. The Search page can **enrich** items (e.g. category) via `videoDetails` in batches before applying tag filters and sort.
- **Status**: **experimental**; behavior and exposure can change. Prefer documenting any removal or feature-flag in this file and in [`backend-functions.md`](./backend-functions.md).

Related code: `src/pages/Search/index.tsx` (`friendsEvents` branch, `enrichVideos`), `src/pages/WhatsNew/index.tsx`, `functions/friendsEvents.js`, `test-friendsEvents.js`.

## Page limits

`getPageLimit` fetches the first listing page HTML, parses **last pagination** from `.pagination-last` / `.pagination-list`, caps `amount` at **100**, and stores `pageLimit` in state.

## Tag and text filtering (`filterVideos`)

- **includeTags**: titles must match — **OR** (any tag) or **AND** (every tag), per `termsOperator`.
- **includeTagWeights** (optional): map of tag name → multiplier. Each substring match for that tag adds `matches × weight` to relevance (default weight **1** when omitted). Recommendations use weights from **1** to **3** (`RECOMMENDATION_TAG_WEIGHT_MIN` / `RECOMMENDATION_TAG_WEIGHT_MAX` in `recommendations.ts`), linear in favourite count among the top tags.
- **excludeTags**: title must not contain any excluded substring.
- **boosterTags** / **diminishingTags**: adjust **relevance** (used with `orderBy=relevance`).

Relevance blends weighted tag frequency in the title with boost/diminish bonuses. Sorting is stable with a views tie-break for relevance (`sortVideos`).

## Sort modes (`sortVideos`)

`orderBy` query param maps to: `newest`, `oldest`, `longest`, `shortest`, `views`, `viewsAsc`, `relevance`. Dates use **relative** strings from the site (e.g. “10 minutes ago”, “5 hours ago”, “5 days ago”, “yesterday”) parsed in `parseRelativeTime` in `helpers/videos.ts`. `newest` / `oldest` use a **views** tie-break when parsed times match.

## Other options

- **minDuration** (minutes): enforced in **server** function when scraping (`functions/videos.js`) and mirrored in client state.
- **omitPrivate**: server skips private thumbnails when true.
- **quick**: when `true`, only listing page is fetched per video row; when `false`, function may open each video URL (slower; current code still focuses on list data).
- **omitFavourites**: client filters out URLs present in local favourites (`helpers/favourites`).
- **preserveResults**: append new batch to `rawVideos` instead of replacing (infinite-style loading).

## URL / shareable state

`useSearchState` and the Search page sync many fields from **`useSearchParams`** (`mode`, `id`, `type`, `category`, `primaryTag`, `friendId`, `tags`, `excludeTags`, `boosterTags`, `diminishingTags`, `termsOperator`, `start`, `amount`, `minDuration`, `orderBy`, `run`, etc.). For **`friendsEvents`**, `friendsEventsUsername` and `friendsEventsCategory` can appear in the query string; the **password is not** persisted in the URL (in-memory field only). Deep links should keep working if you extend query keys—update both parsing and any share/export UI.

## Preferences and moods

`Preferences` stores **moods** and default tag sets in **localStorage** (`tvass-moods`, `tvass-default-mood`, etc.). Search can apply a mood to populate tag fields (`useVideoFiltering.applyMoodPreferences`).

## Refactor note

Hooks `useSearchLogic`, `useSearchState`, and `useVideoFiltering` extract part of the Search behavior. The shipped route still uses the main `Search/index.tsx` implementation; `SearchRefactored.tsx` is an alternate layout—verify which file is imported before deleting or duplicating logic.
