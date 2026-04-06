# ThisVid Advanced Search

A search frontend for [ThisVid](https://thisvid.com) with stronger discovery tools than the site’s built-in search. It **loads many listing pages in parallel**, merges the results, and applies **client-side filters** (include/exclude tags, AND/OR, boost/diminish relevance, duration, favourites, multiple sort modes). Listing HTML is scraped in **Netlify Functions** (Cheerio) so the app can stay same-origin and avoid CORS.

## Requirements

- **Node** >= 20  
- **npm** >= 9  

## Ejecutar localmente / Run locally

Para poder probar este proyecto en tu entorno local, primero necesitas instalar las dependencias. Notarás que el proyecto ya incluye todas las librerías necesarias para que el scraper funcione correctamente (como `cheerio`, `axios` y `node-fetch`) y que todo está configurado en el `package.json`.

```bash
# 1. Instalar dependencias
npm install
```

Puedes ejecutar el proyecto de dos formas:

### Opción A: Usando React Scripts (Recomendado para UI)

```bash
# 2. Iniciar el servidor de desarrollo
npm start
```

Luego abre [http://localhost:3000](http://localhost:3000). Durante el desarrollo, la app utiliza `src/setupProxy.js` para redirigir (proxy) las rutas hacia las funciones serverless o al sitio original.

### Opción B: Usando Netlify CLI (Recomendado para probar las Funciones / Scraper)

Si deseas probar localmente las funciones de scraping ubicadas en `functions/` tal como correrían en producción, puedes usar Netlify CLI:

```bash
# Instalar netlify-cli globalmente si no lo tienes
npm install -g netlify-cli

# Iniciar entorno dev de netlify
netlify dev
```

Netlify te indicará en qué puerto se está ejecutando (por ejemplo `http://localhost:8888`), y se encargará de levantar tanto el frontend de React como de emular las funciones serverless.

### Otros scripts:

- `npm run build` — compila el código de producción en `build/`
- `npm run eject` — eject irreversible de CRA (rara vez se necesita)

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

- **Routes**: `src/index.js` — `/`, `/search`, `/analyse`, `/preferences`, `/whats-new`
- **Search UI**: `src/pages/Search/index.tsx` (`SearchRefactored.tsx` is experimental / not wired as default)
- **Fetch + filter helpers**: `src/helpers/videos.ts`
- **Search orchestration**: `src/hooks/useSearchLogic.ts`
- **Listing scraper**: `functions/videos.js`
- **Dev proxy**: `src/setupProxy.js`

Bootstrapped with [Create React App](https://github.com/facebook/create-react-app); see their [docs](https://facebook.github.io/create-react-app/docs/getting-started) for generic tooling (testing, deployment, troubleshooting).
