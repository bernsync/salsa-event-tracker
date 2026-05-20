# Architecture Context

## Current Shape

The app is a browser-first JavaScript application in `web/`. It is served as static assets and reads durable data from Supabase.

Important entry points:

- `index.html`: root redirect into `web/` for GitHub Pages.
- `404.html`: GitHub Pages fallback redirect into `/salsa-event-tracker/web/`.
- `web/index.html`: app shell, CSP, dialogs, tabs, and script entry.
- `web/app.js`: render coordination, view state, event wiring, and app startup.
- `web/api.js`: Supabase REST/auth wrapper.
- `web/supabase-config.js`: public Supabase URL, publishable key, and auth redirect URL.
- `web/sw.js`: service worker for same-origin static app assets.

## Target Hosting

Preferred target:

```text
Cloudflare Pages
+ Supabase database/auth
+ GitHub repo/issues/PRs/Actions
```

Current/fallback:

```text
GitHub Pages from repository root
+ root redirect into web/
+ Supabase database/auth
```

## Data Flow

Supabase is the source of truth for durable app data. Public festival data, dance styles, Schengen reference data, private trips, and private reviews should remain in Supabase.

Frontend code should fetch data through the existing API modules instead of introducing production seed files or hardcoded datasets.

## Access Model

Use `DATA_ACCESS.md` as the canonical source for public, owner, authenticated, and app-role data rules. Service-role keys must never be placed in `web/` or any browser-delivered file.

## Deployment Notes

GitHub Pages currently depends on the `/salsa-event-tracker/web/` base path. Cloudflare Pages should remove most future need to optimize for that base path, but compatibility should be preserved until migration is verified.

Any hosting change must check:

- relative asset paths
- `web/manifest.json`
- `web/sw.js` scope and cache behavior
- CSP `connect-src`
- Supabase auth redirect URL
- public data fetches
- private auth-gated tabs
