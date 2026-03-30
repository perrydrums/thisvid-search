# Documentation index

Project overview, setup, and quick links to code live in the **[repository README](../README.md)**.

This folder holds deeper references. **Read the relevant file before changing behavior** so URLs, scraping assumptions, and client/server boundaries stay aligned.

## Contents

| Document | What it covers |
|----------|----------------|
| [architecture.md](./architecture.md) | Tech stack, repo layout, dev vs production routing, environment variables |
| [search-and-filtering.md](./search-and-filtering.md) | Search modes, multi-page fetch, tag filtering, sorting, URL parameters |
| [backend-functions.md](./backend-functions.md) | Netlify functions, HTML parsing, proxied paths |
| [supabase-and-analytics.md](./supabase-and-analytics.md) | Search logging, visitor IDs, feedback |

When in doubt, search the codebase for `/getVideos`, `filterVideos`, or `useSearchLogic`.
