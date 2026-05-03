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

Row Level Security: typical pattern is full CRUD for `profiles` / `moods` where `auth.uid() = id` (profile) or `auth.uid() = user_id` (moods). See migration `supabase/migrations/20260503180000_user_profiles_moods_auth_searches.sql` for exact policies.

## Search logging

`helpers/supabase/log.ts`:

- **`log`** — inserts a row into the `searches` table after a search run (see `useSearchLogic.logSearch`). Captures mode, type, tags, page count, duration filter, category, user/friend IDs, visitor id/name, resolved IP + coarse location (`getIp`, `getLocationFromIp`), and when the Supabase session is present, **`auth_user_id`** (links the row to `auth.users`).
- **`updateLogResultCount`** — after client-side filtering, updates `resultCount` for the inserted row (`useVideoFiltering`).
- **`fetchSearchHistoryPage`** (`helpers/supabase/searchHistory.ts`) — paginated **SELECT** from **`searches`** for the signed-in user (`auth.user` must match **`auth_user_id`**; policy **`searches_select_own`** in the migration). The **`/history`** page uses infinite scroll (**`SEARCH_HISTORY_PAGE_SIZE`** rows per request) and **`searchHistoryReplayHref`** to rebuild **`/search-v2`** or **`/search`** query strings from stored listing fields.

The shape matches `LogParams` in `helpers/types.ts`. Schema changes on Supabase require updates here and in any dashboards that read `searches`.

## Feedback

`helpers/supabase/feedback.ts` (and `components/Feedback`) may submit user feedback to Supabase—check the module for table names and fields when extending.

## Privacy note

Logging includes **visitor-generated names**, **IP**, and **approximate location**. Document this in user-facing privacy policy if the app is public; avoid logging unnecessary PII when changing the schema.
