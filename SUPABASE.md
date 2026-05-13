# Supabase Setup

The app is now configured to read public event data from Supabase first and fall back to the repo seed data if Supabase has no public rows or is unavailable.

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
2. Request public events and editions from Supabase.
3. If Supabase returns public rows, replace the local seed event list with Supabase data.
4. Private reviews/trips are not connected yet. That should be the next phase after public data is imported.
