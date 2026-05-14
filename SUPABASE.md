# Supabase Setup

Supabase is the source of truth for app data. Do not add new local hardcoded lists, seed-style datasets, or browser-only data stores for production features. If a feature needs data, create or use a Supabase table first, then have the app read from that table.

The app is configured to read public event data from Supabase first and only use repo seed data as a temporary offline/empty-database fallback.

## Project Config

Frontend config lives in `web/supabase-config.js`.

Only the publishable key belongs there. Never add the secret key or database password to this repo.

## Import Current Event Data

After the base tables and RLS policies are created in Supabase, generate the import SQL:

```powershell
node scripts/generate-supabase-seed.mjs
```

Copy the output into the Supabase SQL Editor and run it.

The generated SQL deletes existing public `events` and `event_editions` rows before importing, so use it for initial import or a full public-data refresh.

## Current App Behavior

1. Load local repo seed data immediately so the app works offline and while Supabase is empty.
2. Request public `events` plus nested `event_editions` from Supabase.
3. Request public `schengen_countries` from Supabase and compute event badges from that table.
4. If Supabase returns public event rows, replace the local seed event list with Supabase data.
5. Use `event_editions.added_on` for the Recently Added view; rows disappear from that view after 7 days.
6. When signed in, request private/auth-gated `reviews`, `trips`, and `personal_trips`.
7. When signed out, clear private/auth-gated table data from browser state and hide the Reviews tab.

## Data Rule

All durable app data should live in Supabase. Local JavaScript files may keep UI constants, canonical cleanup helpers, and temporary fallbacks, but they should not become the source of truth for countries, events, editions, reviews, trips, attending status, Schengen rules, or future planning data.

Use [DATA_ACCESS.md](DATA_ACCESS.md) before adding any new durable data. Every new data type should be classified as `public`, `authenticated`, or `owner` before implementation.

Use [DATA_UPDATE_WORKFLOW.md](DATA_UPDATE_WORKFLOW.md) for the remote update model: weekly audits, reviewed Supabase upserts, issue-driven update requests, and PR automation.
