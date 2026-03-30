# Supabase and analytics

## Client

`src/helpers/supabase/client.ts` creates a Supabase client from:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

If unset, URLs/keys are empty strings; inserts may fail silently in the console—acceptable for local UI-only work.

## Search logging

`helpers/supabase/log.ts`:

- **`log`** — inserts a row into the `searches` table after a search run (see `useSearchLogic.logSearch`). Captures mode, type, tags, page count, duration filter, category, user/friend IDs, visitor id/name, and resolved IP + coarse location (`getIp`, `getLocationFromIp`).
- **`updateLogResultCount`** — after client-side filtering, updates `resultCount` for the inserted row (`useVideoFiltering`).

The shape matches `LogParams` in `helpers/types.ts`. Schema changes on Supabase require updates here and in any dashboards that read `searches`.

## Feedback

`helpers/supabase/feedback.ts` (and `components/Feedback`) may submit user feedback to Supabase—check the module for table names and fields when extending.

## Privacy note

Logging includes **visitor-generated names**, **IP**, and **approximate location**. Document this in user-facing privacy policy if the app is public; avoid logging unnecessary PII when changing the schema.
