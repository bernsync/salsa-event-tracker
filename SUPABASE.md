# Supabase Setup

Supabase is the source of truth for app data. Do not add new local hardcoded lists, seed-style datasets, or browser-only data stores for production features. If a feature needs data, create or use a Supabase table first, then have the app read from that table.

The app reads public event data from Supabase. There is no local production event seed fallback.

## Project Config

Frontend config lives in `web/supabase-config.js`.

Only the publishable key belongs there. Never add the secret key or database password to this repo.

## Current App Behavior

1. Request public `events` plus nested `event_editions` from Supabase.
2. Request public `schengen_countries` from Supabase and compute event badges from that table.
3. Use `event_editions.added_on` for the Recently Added view; rows disappear from that view after 7 days.
4. When signed in, request private/auth-gated `reviews`, `trips`, and `personal_trips`.
5. When signed out, clear private/auth-gated table data from browser state and hide the Reviews tab.

## Data Rule

All durable app data should live in Supabase. Local JavaScript files may keep UI constants and canonical cleanup helpers, but they should not become the source of truth for countries, events, editions, reviews, trips, attending status, Schengen rules, or future planning data.

Use [DATA_ACCESS.md](DATA_ACCESS.md) before adding any new durable data. Every new data type should be classified as `public`, `authenticated`, or `owner` before implementation.

Use [DATA_UPDATE_WORKFLOW.md](DATA_UPDATE_WORKFLOW.md) for the remote update model: weekly audits, reviewed Supabase upserts, issue-driven update requests, and PR automation.
