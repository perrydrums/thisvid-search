# Supabase and analytics

## Client

`src/helpers/supabase/client.ts` creates a Supabase client from:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

If unset, URLs/keys are empty strings; inserts may fail silently in the console—acceptable for local UI-only work.

Make sure **Email** auth with **magic link** (Magic link template) is enabled in the Supabase project so **`AuthWidget`** can email sign-in and signup links (`signInWithOtp` + `emailRedirectTo` in `useAuth.tsx`).

In **Authentication → URL configuration**, add these to **Redirect URLs** (`useAuth.tsx` sets `emailRedirectTo` to **`http://localhost:3000/search-v2`** in development and **`{origin}/search-v2`** in production builds):

- `http://localhost:3000/search-v2` (dev)
- Your production origin with `/search-v2`, e.g. `https://your-domain.example/search-v2`

If the site **Site URL** is only the origin (e.g. `http://localhost:3000`), the app also forwards auth hash callbacks to `/search-v2` after the session is established.

**Log out** ends the Supabase session, runs `localStorage.clear()` and `sessionStorage.clear()` for this origin (`helpers/clearBrowserSiteStorage.ts`), then reloads the page so `index.js` can assign a fresh anonymous `visitorId` / `visitorName` and all React state resets.

## Auth-linked user data (v2)

When a user completes email magic-link sign-in (`src/hooks/useAuth.tsx`), the app can sync prefs to Supabase:

- **`profiles`** — one row per `auth.users` user (`id` FK). Holds ThisVid-related scalars mirrored from legacy local keys: `thisvid_user_id`, `default_mood`, `favourites` (text array), `last_sync_date`. Rows are created from an `on_auth_user_created` trigger.
- **`moods`** — curated mood definitions per user (`user_id` → `profiles.id`). Replaces ad-hoc `tvass-moods` when logged in via `helpers/supabase/userProfile.ts`.
- **`useUserData`** — single hook for Search v2, Settings (`/settings`), Moods (`/moods`): loads from Supabase when authenticated (with one-time merge from local keys), writes back on change; anonymous users stay on **`localStorage` only** (legacy `/search` etc. unchanged). First-login sync **merges** local into `profiles`: empty local scalar fields keep existing remote values instead of wiping the row. **Note:** the hook state is **per component instance** (not a global store). **Settings** therefore calls **`refreshProfileFromCloud({ quiet: true })`** after auth + `useUserData` loading finish on every visit so ThisVid ID / favourites / moods always rehydrate from Supabase when signed in, even if `localStorage` was cleared and another page had a different hook instance.

Row Level Security: typical pattern is full CRUD for `profiles` / `moods` where `auth.uid() = id` (profile) or `auth.uid() = user_id` (moods). **`searches`** policies and RPCs are defined in `supabase/migrations/20260503180000_user_profiles_moods_auth_searches.sql` (initial `auth_user_id` + broad policies), then tightened in `20260503203000_security_searches_rls_and_update_rpc.sql` (insert check, **no** broad update, **`result_update_token`**, **`update_search_result_count`**), with **`insert_search_log`** added in `20260503203300_insert_search_log_rpc.sql`. If your **legacy** `searches` table uses **quoted camelCase** column names (e.g. `"pageAmount"`, `"resultCount"`), apply `20260503204000_fix_searches_rpc_quoted_columns.sql` so the RPCs target the correct columns. **`"userId"` / `"friendId"`** may be **`bigint`**; then apply `20260503204100_insert_search_log_userid_bigint_cast.sql` so **`insert_search_log`** casts incoming text IDs. If **`insert_search_log`** fails with **Returned type integer does not match expected type bigint in column 3**, apply `20260503204200_insert_search_log_returning_resultcount_bigint.sql` (cast **`"resultCount"`** in **`RETURNING`** to **`bigint`**).

## Search logging

`helpers/supabase/log.ts`:

- **`log`** — calls the Supabase RPC **`insert_search_log`** (`supabase/migrations/20260503203300_insert_search_log_rpc.sql`) so a row is written to **`searches`** without granting anonymous clients **SELECT** on other people’s analytics. The RPC sets **`auth_user_id`** from **`auth.uid()`** (clients cannot spoof it). Returned fields include **`search_id`**, **`result_token`** (stored client-side only as `LogParams.resultUpdateToken`), and **`stored_result_count`**. Telemetry still includes mode, tags, visitor id/name, IP + coarse location (`getIp`, `getLocationFromIp`).
- **`updateLogResultCount`** — after client-side filtering, calls **`update_search_result_count`** (`supabase/migrations/20260503203000_security_searches_rls_and_update_rpc.sql`) with **`p_id`** + **`p_token`** so **`result_count`** can be patched without an open **`UPDATE`** policy on **`searches`** (`useVideoFiltering` / legacy Search page).
- **`fetchSearchHistoryPage`** (`helpers/supabase/searchHistory.ts`) — paginated **SELECT** from **`searches`** for the signed-in user (`auth.user` must match **`auth_user_id`**; policy **`searches_select_own`** in the migration). The **`/history`** page uses infinite scroll (**`SEARCH_HISTORY_PAGE_SIZE`** rows per request) and **`searchHistoryReplayHref`** to rebuild **`/search-v2`** or **`/search`** query strings from stored listing fields.

The shape matches `LogParams` in `helpers/types.ts`. Schema changes on Supabase require updates here and in any dashboards that read `searches`.

## Feedback

`helpers/supabase/feedback.ts` (and `components/Feedback`) insert star ratings into **`feedback`**. RLS is defined in `supabase/migrations/20260503203100_feedback_rls.sql`: **INSERT** only for anon/authenticated clients (no client **SELECT** / **UPDATE** / **DELETE** policies). Service role still bypasses RLS for admin tooling.

## Privacy note

Logging includes **visitor-generated names**, **IP**, and **approximate location**. Document this in user-facing privacy policy if the app is public; avoid logging unnecessary PII when changing the schema.
