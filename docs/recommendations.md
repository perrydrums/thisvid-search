# Recommendations

## Overview

The `/recommendations` page shows personalised video recommendations based on the user's favourite video analysis. It uses **content-based filtering**: browse ThisVid listings, then narrow results with the same title-tag logic as Search (`filterVideos`).

## Taste profile

A taste profile is built from the same data as the **Analyse** page: aggregated favourite videos stored under `tvass-analyse-users` (see [`ANALYSE_USERS_STORAGE_KEY`](src/helpers/analyseFavourites.ts)). It extracts:

- **Categories** — sorted by frequency. **Slugs** are resolved against the live `/categories/` listing via [`getCategories`](src/helpers/getCategories.ts) so URLs match ThisVid (e.g. display name "Gay Scat" maps to slug `male-scat`, not a naive `gay-scat`).
- **Tags** — sorted by frequency across all favourited videos.
- **Uploaders** — sorted by how many favourited videos they uploaded, with their ThisVid user ID.

Profile extraction is **async** because it fetches the category index to resolve slugs.

### Onboarding on `/recommendations`

1. User enters **ThisVid User ID** (or it is prefilled from `tvass-user-id` if already set in Preferences).
2. **Analyse favourites** runs the same scraping pipeline as the Analyse page ([`runAnalyseFavourites`](src/helpers/analyseFavourites.ts)), shows progress by page, and only then writes **`tvass-user-id`** and **`tvass-analyse-users`**.
3. The taste profile and **Get / Refresh recommendations** actions appear after analysis completes.

## Candidate fetching

The engine does **not** call `/tags/...` directly. It uses `getVideos` only for:

| Source | URL pattern | Pages |
|--------|-------------|-------|
| Top 5 categories | `/categories/{slug}/{page}/` | 5 pages each → 25 requests |
| Top 5 uploaders — public | `/members/{uid}/public_videos/1/` | 1 per uploader |
| Top 5 uploaders — private | `/members/{uid}/private_videos/1/` | 1 per uploader |

That is **35** parallel listing requests in one batch. Private tiles may appear on the private listing; `omitPrivate` is off so those rows are included where the scraper returns them.

## Tag filtering (combined search behaviour)

Category listings and uploader listings are merged **separately** into two pools. Each pool is deduped by URL, favourites are removed, then each pool is passed through [`filterVideos`](src/helpers/videos.ts) with:

- `includeTags`: the **top 30** tag strings from the taste profile
- `includeTagWeights`: linear scale by favourite count among the top 30 — **highest count → `RECOMMENDATION_TAG_WEIGHT_MAX` (3)**, **lowest count → `RECOMMENDATION_TAG_WEIGHT_MIN` (1)**, others in between (see `recommendations.ts`)
- `termsOperator`: `'OR'` — the title must match **at least one** of those tags (substring match, same as Search)

Only videos that pass this filter become recommendations for that section. No per-video detail pages are scraped for tags.

## Scoring

For each surviving video (within its section):

1. **`filterVideos` relevance** — sum over include tags of `(title matches for tag) × (that tag’s weight)` plus any boost/diminish; then scaled into the final recommendation score.
2. **Source weight** — each distinct source (category name or uploader username) that listed this URL adds weight proportional to that category/uploader’s weight in the profile.
3. **Multi-source bonus** — small extra score when the same URL was found from more than one listing in **that** section (e.g. two category pages).

Each section is sorted by score descending (views as tie-breaker) and capped at **50** videos.

## UI

The results panel has two toggles: **Categories & tags** (browse top categories + tag filter) and **From uploaders** (top uploaders’ public/private listings + same tag filter). The same video can appear in both lists if it was discovered via both paths.

**Sort** (per section): **Relevance** (recommendation score, default) or **Newest** (listing date strings parsed like Search’s `sortVideos` `newest` mode).

## Caching

Recommendations are cached in `tvass-recommendations` (localStorage) as `{ fromCategories, fromUploaders }`, with a 24-hour TTL and a hash of the taste profile. Older cache shapes (single `videos` array) are ignored. Revisiting the page within the same day can show cached results instantly; the user can force a refresh.

## Files

| File | Role |
|------|------|
| `src/helpers/analyseFavourites.ts` | Shared favourite listing scrape (`runAnalyseFavourites`, per-page helper); storage key constants |
| `src/helpers/recommendations.ts` | Async profile extraction + slug resolution, fetch/merge/filter/score, caching |
| `src/pages/Recommendations/index.tsx` | Page UI — User ID + analyse, profile display, generate/refresh, results grid |
| `src/pages/Analyse/index.tsx` | Full Analyse UI; uses `analyseFavourites` helpers |

## Future phases

- **Phase 2**: Store taste profiles and pre-generated recommendations in Supabase; run a Netlify Scheduled Function daily to generate recommendations server-side.
- **Phase 3**: Daily email digest of top recommendations via Resend.
