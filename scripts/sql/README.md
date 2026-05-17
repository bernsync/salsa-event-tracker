# Supabase SQL Migrations

Run these files in order from the Supabase SQL editor, or copy them into a reviewed database migration workflow.

1. `001_add_watchlist_styles.sql`
   - Adds `events.styles` and `events.watchlist`.
   - Backfills existing event styles and watchlist flags.

2. `002_insert_new_event_candidates.sql`
   - Inserts the new public event brands from the add-to-calendar list.
   - Inserts verified event editions where official sources exposed dates/location/details.
   - Applies initial styles when `events.styles` exists.

The weekly audit scripts should remain review-only. They should generate findings or candidate SQL, not write production data automatically.
