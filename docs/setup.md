# Setup

## Requirements

- Node.js 20 or newer.
- A browser.
- Supabase project access only when changing backend data, policies, auth settings, or service-role workflows.

## Local App

From the repository root:

```powershell
cd web
node server.js
```

Open:

```text
http://127.0.0.1:8000
```

The app can also be opened directly from `web/index.html`, but the local server better matches browser behavior for modules, service worker work, and relative assets.

## Checks

From the repository root:

```powershell
npm.cmd run check
npm.cmd test
```

For docs-only changes, syntax and unit tests are usually optional unless the docs include code, config, or workflow changes.

## Data Access

Supabase is the source of truth for durable app data. Read `DATA_ACCESS.md` before adding tables, columns, private data, auth behavior, or any feature that stores user-entered data.
