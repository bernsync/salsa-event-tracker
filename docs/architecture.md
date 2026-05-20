# Architecture

## Summary

Salsa Festivals Tracker is a lightweight frontend app with Supabase-backed data and auth. It should stay cheap to operate while supporting real backend-backed product features.

## Frontend

The browser app lives in `web/` and uses plain JavaScript modules, HTML, and CSS.

Key files:

- `web/index.html`: app shell.
- `web/styles.css`: shared UI styles and responsive rules.
- `web/app.js`: main render/state/event coordination.
- `web/api.js`: Supabase REST and auth access.
- `web/*-utils.js`: reusable formatting, parsing, mapping, and date helpers.
- `web/trips-view.js` and `web/reviews-view.js`: auth-gated private views.

## Backend

Supabase provides:

- public event data
- event edition data
- dance style taxonomy
- Schengen country reference data
- auth
- owner/private trips
- owner/private reviews

## Automation

GitHub Actions and scripts support:

- weekly event-edition refresh/audit reports
- data-quality reports
- reviewed Supabase upsert workflows

Public data changes should go through reviewed workflows or manually reviewed SQL/service-role processes. Do not expose service-role credentials to frontend code.

## Hosting

Cloudflare Pages is the preferred target host. GitHub Pages is the current/fallback host and uses a repository-root redirect into `web/`.
