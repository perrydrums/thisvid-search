# Recommendations

## Overview

**`/recommendations`** (“For you” in the sidebar) shows two rails:

1. **New from your friends** — uploads from the last 14 days by people on the synced friend list.
2. **You might like** — videos that resemble the analysed favourites, from several public sources.

Both rails drop videos already in the favourites, drop the user’s own uploads, and drop private videos unless the uploader is a friend. They are sorted by a relevance score built from the Analyse taste profile. The same video is not shown in both rails.

This replaces the old `/legacy/recommendations` page and the credential-based What’s New feed (`friendsEvents`). Those routes **301** to `/recommendations`.

## What a listing tile does not tell us

A ThisVid listing tile has a title, URL, duration, views, a relative date, a private flag, and a rating percent. It does **not** include tags, category, or uploader. The site-wide newest tabs (`/newest/`, `/gay-newest/`) are therefore a poor recommendation source: hundreds of uploads a day, and the only match signal is the title. The engine does not search them.

Video pages do include category, tags, uploader, a 5-star rating, and a **Related Videos** block. Profile pages include the newest public uploads, newest private uploads, and latest favourites in one response (`/memberFeed`).

## Inputs

| Input | Where it comes from | Required? |
|-------|---------------------|-----------|
| Taste profile | `tvass-analyse-users`, built by [Analyse](../src/pages/Analyse/index.tsx) | Yes. Without it the page only shows the setup steps. |
| Related-video index | `tvass-analyse-related`, harvested during Analyse | No, but “You might like” is weaker until Analyse is run again. |
| Analysis date | `tvass-analyse-date` | Shown on the page. |
| Favourite URLs | Settings sync (`tvass-favourites` / `profiles.favourites`) | Used as an exclusion list, together with the analysed URLs. |
| Friend IDs | Settings sync (`tvass-friend-ids`) | Required for the friends rail. |
| ThisVid user ID | `tvass-user-id` | Used to skip the user’s own uploads and to sync. |

Analyse already downloads each favourite’s video page. It now also stores that page’s Related Videos tiles (no extra requests). Hits are how many favourites listed the video. The user’s own favourites are removed, and the top **1,000** are kept. Existing analyses have an empty index until Analyse is run again.

If the synced favourite count is more than 25% above the analysed count (and at least 10 videos ahead), the page asks the user to run Analyse again.

## Taste profile

From the analysed favourites (`N` videos), in [`extractTasteProfile`](../src/helpers/recommendations/profile.ts):

- **Tag weight** `w_t = ln(1 + n_t)`. Tags that appear on only one favourite are ignored once `N ≥ 20`.
- **Category affinity** `c_k = n_k / max(n)`.
- **Uploader affinity** `u_j = ln(1 + n_j) / ln(1 + max(n))`.
- **Distinctive tags and categories** are the ones whose share of favourites is under **60%**. A tag on most favourites (often the orientation) would just reproduce a site-wide listing, so it is not used as a search source. It can still contribute to the score when a video actually has that tag.
- **Orientation** is `gay` or `straight` when at least **80%** of categorised favourites fall in that group, using the live `/categories/` index. Otherwise tag listings use the plain `/tags/{tag}/` pages. Category **slugs** come from that same index.

## Where videos are looked up

### New from your friends

Up to **120** friend profiles per refresh, **6** at a time, via `GET /memberFeed?uid=`. Order:

1. Friends who uploaded any analysed favourite, most favourites first.
2. Friends who had an upload in the last **30 days**, from `tvass-friend-activity`.
3. Friends who have never been scanned.
4. Everyone else, least recently scanned first, so a long friend list rotates. A profile that had no uploads last time is skipped for **7 days**.

Candidates are that friend’s public and private uploads from the last **14 days**. Private is allowed here because the uploader is a friend by construction.

### You might like

| Source | Requests | Evidence |
|--------|----------|----------|
| Harvested Related Videos | none (local) | how many favourites listed it |
| Favourites on the profiles already scanned for the friends rail | none | how many friends favourited it |
| Public uploads of the top **8** uploaders who are not friends | 8 `/memberFeed` | one listing hit |
| Latest in the top **5** distinctive tags, **2** pages each | 10 `/getVideos` | one listing hit per tag |
| Latest in the top **3** distinctive categories, **2** pages each | 6 `/getVideos` | one listing hit per category |

Gay profiles use `/tags/{tag}/latest-males/{page}/`, straight profiles use `latest-females`, and mixed profiles use `/tags/{tag}/`. Category latest is `/categories/{slug}/{page}/`. Pages 2+ of a tag listing need a `Referer`; `/getVideos` already sends one.

Private tiles whose uploader is not known yet are dropped before the detail fetch. Tag listings and friends’ favourites are the sources that produce those, and a friend’s own recent private uploads are already on the first rail.

## Hard filters

Applied to both rails:

- Not in the synced favourites or the analysed favourites (URLs normalised to `https://thisvid.com/videos/{slug}/`).
- Not uploaded by the user’s own ThisVid id.
- Private only when the uploader’s id is in the friend list. Checked again after the video page is read, in case the tile’s uploader was wrong or unknown.
- At most **4** videos per friend on the first rail and **3** per uploader on the second.
- Each rail keeps up to **1000** videos. The page renders them in batches of 24 as you scroll, the same way Search does.

Hovering a card shows **Hide**. That writes `hidden_recommendations` (`video_url`, `hidden_at`) for the signed-in user — see [supabase-and-analytics.md](./supabase-and-analytics.md). A hide stops counting one month after `hidden_at`. The page does not mention that window. Signed-out hides stay in `tvass-hidden-recommendations` and are copied to Supabase on the next sign-in.

## Scoring

Two stages, both in [`scoring.ts`](../src/helpers/recommendations/scoring.ts). Every component is 0–1. The displayed score is 0–100, one decimal.

**Pre-score** (tile data only) decides which videos are worth opening. Profile tags found in the title count, multiplied by **0.6**, and only distinctive tags are considered so a word like the orientation does not mark every title as relevant. Category or uploader counts when the source already knows them.

**Enrichment.** The top **60** of each rail are opened via `/videoDetails`. The second rail keeps at least **8** from each source (related, friends’ favourites, uploaders, tags, categories) before filling the rest by pre-score. Details are cached for a year on the CDN and in `tvass-video-details` (400 entries, least recently used).

**Final score**, over the enriched pool of that rail:

- `tagSim` — sum of `w_t * idf_t` over the video’s tags, divided by the best sum any video with that many tags could get from the profile. `idf_t = ln((1+P)/(1+p_t)) + 1` is computed on the enriched pool (`P` videos, `p_t` of them carrying the tag), so a tag that every candidate shares stops dominating.
- `catAff` — best category affinity among the video’s categories.
- `upAff` — uploader affinity, or 0 if that uploader is not in the favourites.
- `evidence = 1 - exp(-E/2)`. For “You might like”, `E = relatedHits + friendFavHits + 0.5 * listingHits`. For the friends rail, `E` is only `friendFavHits` (other friends also favourited it). The uploader term carries the “this friend” signal instead.
- `quality = 0.7 * rating% + 0.3 * log-views share of the pool`. Rating is 0–100 (the tile’s percent, or the page’s stars × 20). A missing rating counts as 0. This is the only term not taken from the favourites, so it stays small.

Weights:

| Rail | Tag | Category | Uploader | Evidence | Quality |
|------|-----|----------|----------|----------|---------|
| You might like | 40 | 15 | 10 | 25 | 10 |
| New from your friends | 40 | 15 | 25 | 10 | 10 |

Sort is score, then newest, then views. Each card stores short reasons, for example “Related to 3 favourites”, “Favourited by 2 friends”, “You favourited 12 of marleo's videos”, “Tags: feet, soles”. The first reason and the date are the line under the title. With `?debug=true` (or on localhost) the views chip shows the score.

## Request budget and cache

A cold refresh is up to **128** `/memberFeed` calls (120 friends plus 8 uploaders), **16** `/getVideos` calls, and up to **120** `/videoDetails` calls, spread across three rate-limited routes. A warm refresh is mostly cache hits.

The finished rails are stored in `tvass-recommendations-v2` for **3 hours**. The key hashes the taste profile, friend ids, favourite URLs, user id, analysis date, and the top related hits. The page loads that cache immediately and refetches when it is missing or stale. **Refresh** always recomputes. The friends rail is shown as soon as its videos are scored, before “You might like” finishes.

## Files

| File | Role |
|------|------|
| `src/helpers/recommendations/profile.ts` | Taste profile and the stale-analysis check |
| `src/helpers/recommendations/sources.ts` | Friend selection, activity store, listing URLs, candidate merge |
| `src/helpers/recommendations/enrich.ts` | `/videoDetails` fetch and the LRU cache |
| `src/helpers/recommendations/scoring.ts` | Pre-score, final score, reasons, diversity cap |
| `src/helpers/recommendations/index.ts` | `generateRecommendations` and the 3-hour bundle cache |
| `src/hooks/useRecommendations.ts` | Loads inputs, cache, refresh progress, and hidden videos |
| `src/helpers/supabase/hiddenRecommendations.ts` | Hide list: local copy plus `hidden_recommendations` |
| `src/pages/Recommendations/index.tsx` | Setup checklist and the two rails |
| `src/helpers/analyseFavourites.ts` | Also harvests Related Videos while scraping favourites |
| `functions/memberFeed.js` | One profile page → public, private, and favourite videos |
| `functions/parseVideoTile.js` | Shared tile parser (browser copy: `src/helpers/parseVideoTile.ts`) |
