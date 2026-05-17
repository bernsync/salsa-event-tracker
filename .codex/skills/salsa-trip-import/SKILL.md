---
name: salsa-trip-import
description: Convert Noam's salsa trip spreadsheet rows, screenshots, or pasted trip lists into reviewed Supabase SQL for this repo's private `personal_trips`, `personal_trip_places`, and optional `personal_pto_days` tables. Use when the user asks to add more trips, import trip rows, turn a travel spreadsheet screenshot into app trips, link personal trips to public event editions, preserve Monday-after-event trip extensions, or prepare owner-scoped SQL for Salsa Festival Tracker travel planning.
---

# Salsa Trip Import

## Overview

Create reviewed SQL for private trip imports in the Salsa Festival Tracker. Keep public `event_editions` unchanged; model travel padding, Monday departures, and extra city days in `personal_trip_places`.

## Workflow

1. Classify the data as `owner`: personal travel, Schengen planning, and attendance intent. Require `owner_id`, `owner_email`, and `access_level = 'owner'`.
2. Gather owner fields from an existing private trip when not already known:

```sql
select
  id, owner_id, owner_email, label, start_date, end_date, notes, access_level
from personal_trips
order by start_date desc
limit 20;
```

3. Gather event edition IDs for the date window:

```sql
select
  ee.id as event_edition_id,
  e.name,
  ee.city,
  ee.country,
  ee.start_date,
  ee.end_date
from event_editions ee
join events e on e.id = ee.event_id
where ee.start_date between '<window-start>' and '<window-end>'
order by ee.start_date, e.name;
```

4. Normalize the user's rows into trip objects. Use country names from the app's existing data when possible (`Czechia`, not `Czech Republic`).
5. Link only the place segment that represents event attendance to `event_edition_id`. Leave pure travel days or unrelated cities unlinked.
6. Generate SQL with `scripts/generate-personal-trip-sql.mjs`. Review labels, dates, linked editions, and PTO rows before giving it to the user.

## Trip Modeling Rules

- Do not update public `events` or `event_editions` for personal travel extensions.
- It is normal for a private trip to extend an event through Monday departure. Keep that extension in `personal_trips` and `personal_trip_places`.
- If an event ends Sunday and the user stays through Monday, linking a single place segment Thursday-Monday is acceptable when previous imports use that pattern.
- If extra days are unrelated travel padding, split into multiple place segments: unlinked pre-stay, event-linked event stay, unlinked post-stay.
- Use travel-only rows for cities without a matching event edition, with `event_edition_id: null`.
- Add `personal_pto_days` only when the user provides exact PTO dates and amounts. A PTO count alone is not enough.
- Prefer readable labels without trip numbers, for example `Prague Salsa Marathon Autumn`.
- Leave import provenance notes blank unless the user explicitly wants the source shown privately.
- When the user provides city/date rows rather than explicit trip boundaries, group rows into trips when each next segment starts on the same day or the day after the previous segment ends.

## Generator

Create a temporary JSON input file, then run:

```powershell
python .codex\skills\salsa-trip-import\scripts\generate_personal_trip_sql.py .\trip-import.json
```

Input shape:

```json
{
  "owner_id": "<OWNER_UUID_FROM_PRIVATE_QUERY>",
  "owner_email": "<OWNER_EMAIL_FROM_PRIVATE_QUERY>",
  "default_notes": "",
  "auto_group_continuous_trips": true,
  "trips": [
    {
      "label": "Trip 29: Prague Salsa Marathon Autumn",
      "start_date": "2026-09-24",
      "end_date": "2026-09-28",
      "places": [
        {
          "city": "Prague",
          "country": "Czechia",
          "start_date": "2026-09-24",
          "end_date": "2026-09-28",
          "event_edition_id": "bbbc371d-67f5-4958-ac91-0930e9651a09"
        }
      ]
    }
  ]
}
```

The script outputs idempotent SQL: it inserts missing trips, then inserts missing place and PTO rows for either newly inserted or already-existing matching trips.

## Validation Checklist

- Confirm the SQL touches only `personal_trips`, `personal_trip_places`, and optional `personal_pto_days`.
- Confirm every inserted row includes `owner_id`, `owner_email`, and `access_level = 'owner'`.
- Confirm the public event date is not changed to match personal Monday/Tuesdays stays.
- Confirm event edition IDs match the intended event, city, country, and dates.
- Tell the user when PTO dates were omitted because only counts were visible.
