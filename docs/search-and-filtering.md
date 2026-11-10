# Search and filtering

## Mental model

1. User picks a **mode** (`newest`, `category`, `user`, `friend`, `tags`, or `extreme`) and related inputs (type, IDs, category slug, primary tag, etc.).
2. The app may fetch **HTML** from ThisVid (via proxied same-origin URLs) for pagination metadata or usernames.
3. **`run`** in `useSearchLogic` fires **parallel** `getVideos` requests for a range of pages (`start` … `start + pages - 1`, where **`pages`** comes from options or hook **`amount`**).
4. Results are merged and deduped by **video URL** where applicable (`useSearchLogic.run` for listing modes).
5. **`filterVideos`** and **`sortVideos`** in `helpers/videos.ts` refine the merged list **entirely on the client** (title substring matching, exclude tags, relevance scoring).

## Alternate UI (VideoScraper shell: `/`, `/search`, `/settings`, `/moods`, `/history`)

The redesigned **VideoScraper** shell is the primary app: **`/`** and **`/search`** serve the same **v2 Search** dashboard, plus **`/recommendations`** (For you: two rails scored from analysed favourites — see [recommendations.md](./recommendations.md)), **`/analyse`** (favourite-video scrape and taste breakdown), **`/settings`** (ThisVid integration, favourites sync, moods export/import), **`/moods`** (moods CRUD backed by **`useUserData`** / **`localStorage`** when anonymous), and **`/history`** — **logged-in search runs** fetched from Supabase **`searches`** (where `auth_user_id` matches the session): infinite scroll loads older rows; **Replay search** rebuilds **`/search`** or **`/legacy/search`** query params from stored mode / tags / listing fields (`helpers/supabase/searchHistory.ts`).

Desktop uses the fixed **320px sidebar** (`AppSidebar`) and shared top bar (`TopNav`) with the same **logo / nav / “Who made this?”** chrome on **`/search`**, **`/recommendations`**, **`/analyse`**, **`/settings`**, **`/moods`**, and **`/history`** (History adds a center **search history** filter field). Main content is offset via **`V2Chrome`**; **`AppSidebar`** is **shown at `min-width: 1024px`**. Below that, **`TopNav`** shows a **top-right hamburger** that opens an overlay listing **Search · For you · Analyse · Moods · History · Settings** (same URLs as **`appNavigation`** / **`AppSidebar`**), **`Who made this?` is omitted**, and the fixed sidebar stays hidden.

The v2 **`/search`** dashboard (`pages/Search/` + `src/components/v2/`) drives **`useSearchState`**, **`useSearchLogic`**, and **`useVideoFiltering`** for **`user` / `category` / `tags` / `extreme`**. Sharable URLs use **`/search?…`**; Netlify SPA fallbacks include **`/`**, **`/search`**, and **`/legacy/*`**. **Sort by** (same values as classic search) stays in the **results** header; the submit control shows **`SEARCH {N} PAGES`** idle and **`SEARCHING done/total...`** while pages load, with a **left-to-right red fill** for progress (`progressCount` / effective chunk size). **Next `{M} pages`** sits beside **Search**: after a finished run when pagination metadata (`pageLimit`) shows more pages beyond the batch, it loads the **next chunk** (up to 100 listings, or the remainder), **append-merges** new rows onto `rawVideos` (passed through `run` with **`append: true`**), and advances **`start`** for the UI. **Copy share link** encodes **`totalListingPages`** (cumulative listings scraped since page **1**) with **`start=1`** so **`run=true`** replays in **one** **`useSearchLogic.run`** with **`pages`** = that total (the same **parallel** `getVideos` pattern as a single large run—no gap between former 100-page UI batches); **`amount`** is still the usual single-batch slice for display/legacy. Submitting **Search** again resets **`start`** to **`1`** and replaces results ( **`append: false`** ). After **`run`** completes, the page **smooth-scrolls** so a point **partway down the results block** (~upper-mid viewport), not pinned to the document bottom nor only the results headline. **Results** cards (`ResultsPreviewGrid` → `VideoCard`) show **views** with the same **eye** SVG as classic results on the thumbnail’s **bottom-left**; **`?debug=true`** (or **`localhost`**, see `helpers/debug.ts`) swaps that chip for **`Relevance: …`** (that relevance chip is **hidden below 600px**). **`PRIVATE`** (**lock** + label) sits **top-left** on the thumb when **`isPrivate`** (below **600px**, **lock icon only**, with **`aria-label="Private video"`**). The line under the title is **profile name · date** (no numeric user IDs). Mode tabs live in the form; **`AppSidebar`** (or the mobile **`TopNav`** drawer) jumps between app sections.

Classic search lives under **`/legacy/search`** (see `pages/legacy/`). **`/legacy/recommendations`**, **`/legacy/whats-new`**, and the hyphenated aliases **301** to **`/recommendations`**. **Analyse** is served at **`/analyse`** (v2 shell); **`/legacy/analyse`** and **`/legacy-analyse`** **301** to **`/analyse`** in production. Moods management in the new shell is **`/settings`** and **`/moods`**; the old **`pages/legacy/Preferences`** page is kept in-repo for reference but is **not** routed. The credential-based **What’s New** feed (`friendsEvents`) has been removed. History still labels old rows of that mode as “Friends feed”.
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

If the first page returns 404, search aborts with an error message.

## Page limits

`getPageLimit` fetches the first listing page HTML, parses **last pagination** from `.pagination-last` / `.pagination-list`, and stores **`pageLimit`** (total listing pages).

- **`useSearchLogic.run`** accepts **`RunSearchOptions`**: **`append`** (combine with existing `rawVideos`; defaults to **`preserveResults`**) and **`pages`** (batch size — still **`offset`** … **`offset + pages − 1`**), plus optional **`onBatchComplete`** (`offset`, `pageCount`, `append`) after a successful merge for UI bookkeeping.
- **v2 Search** (`/` / `/search`): each **button** run still requests **at most 100** listing pages (`SEARCH_PAGE_CHUNK`). **Share replay** with **`totalListingPages`** uses **one `run`** for the full span (parallel `getVideos` for every listing page in that range—no pause between former UI chunks). Submitting **Search** uses **`start = 1`** and replaces crawled rows. **`NEXT … PAGES`** appears when `pageLimit` is known and the listing range is not exhausted; it advances **`start`** and runs **`append: true`**. Shares include **`totalListingPages`** plus **`start=1`**; **`amount`**-only links still replay a single batch (legacy-compatible).
- **`getPageLimit` still initializes `amount` in React state** to `min(lastPage, 100)` so legacy UIs remain consistent; **v2 derives the actual chunk size** (`listingChunkPages`) from **`pageLimit − start + 1`** so later batches resize correctly without re-fetching the listing header.

## Tag and text filtering (`filterVideos`)

- **includeTags**: titles must match — **OR** (any tag) or **AND** (every tag), per `termsOperator`.
- **includeTagWeights** (optional): map of tag name → multiplier. Each substring match for that tag adds `matches × weight` to relevance (default weight **1** when omitted). The For you page does **not** use this map; it scores with the taste profile in [recommendations.md](./recommendations.md).
- **excludeTags**: title must not contain any excluded substring.
- **boosterTags** / **diminishingTags**: adjust **relevance** (used with `orderBy=relevance`).

Relevance blends weighted tag frequency in the title with boost/diminish bonuses. Sorting is stable with a views tie-break for relevance (`sortVideos`).

## Sort modes (`sortVideos`)

`orderBy` query param maps to: `newest`, `oldest`, `longest`, `shortest`, `views`, `viewsAsc`, `relevance`. Dates use **relative** strings from the site (e.g. “10 minutes ago”, “5 hours ago”, “5 days ago”, “yesterday”) parsed in `parseRelativeTime` in `helpers/videos.ts`. `newest` / `oldest` use a **views** tie-break when parsed times match.

## Other options

- **minDurationSec** / **maxDurationSec** (seconds): enforced **client-side** on v2 Search (`filterVideosByDuration` in `useVideoFiltering`) so results update immediately without re-scraping. Display and manual entry use **`HH:MM:SS - HH:MM:SS+`** (e.g. `00:00:20 - 00:00:30`; max **`01:00:00+`** = 1h+). Default range is **0 – 1h+** (slider **0–3600** s). Legacy share params **`minDuration`** / **`maxDuration`** (minutes) are still read when the `*Sec` keys are absent. Listing fetches use **`scrapeMinDuration: 0`** so shorter videos remain in `rawVideos` for range filtering.
- **omitPrivate** (UI: **Exclude private**): client filters out rows with `isPrivate` on already-fetched results (same as favourites; no re-scrape).
- **quick**: when `true`, only listing page is fetched per video row; when `false`, function may open each video URL (slower; current code still focuses on list data).
- **omitFavourites** (UI: **Exclude favourites**): client filters out URLs present in local favourites (`helpers/favourites`).
- **friend_ids** (Settings **Sync profile**): stored in `tvass-friend-ids` / `profiles.friend_ids` alongside favourites. Not used on the search results grid.
- **preserveResults**: append new batch to `rawVideos` instead of replacing (infinite-style loading).

## URL / shareable state

`useSearchState` and the Search page sync many fields from **`useSearchParams`** (`mode`, `id`, `type`, `category`, `primaryTag`, `friendId`, `tags`, `excludeTags`, `boosterTags`, `diminishingTags`, `termsOperator`, `start`, `amount`, `totalListingPages`, `minDurationSec`, `maxDurationSec`, `orderBy`, `run`, etc.). **v2** uses **`totalListingPages`** plus **`run=true`** to replay listing pages **`start`** through **`start + totalListingPages − 1`** in **one parallel `run`** (when **`totalListingPages`** is present). Deep links should keep working if you extend query keys—update both parsing and any share/export UI.

**Short share links:** “Copy share link” stores the current query fields in Supabase table **`short_links`** and copies a compact URL **`{origin}/s/{code}`** (8-character nanoid). Route **`/s/:code`** (`ShortLinkResolver`) loads the row and **`replace`**-navigates to **`/search`** or **`/legacy/search`** with the stored params and **`run=true`**. Netlify serves **`/s/*`** as SPA (`netlify.toml`); migration: `supabase/migrations/20260503204300_short_links.sql`.

## Preferences and moods

`Preferences` stores **moods** and default tag sets in **localStorage** (`tvass-moods`, `tvass-default-mood`, etc.). Search can apply a mood to populate tag fields (`useVideoFiltering.applyMoodPreferences`).

## Refactor note

Hooks `useSearchLogic`, `useSearchState`, and `useVideoFiltering` extract part of the Search behavior. The shipped route still uses the main `Search/index.tsx` implementation; `SearchRefactored.tsx` is an alternate layout—verify which file is imported before deleting or duplicating logic.
