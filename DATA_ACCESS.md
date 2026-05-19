# Data Access Model

Supabase is the source of truth for durable app data. Before adding a new table, column, import, automation output, or user-entered feature, classify the data into one of these access levels.

## Access Levels

Working names in conversation:

- `public`: public app/reference data.
- `owner`: my user only.
- `authenticated`: any signed-in user.
- `app role`: app-wide role granted through `app_user_roles`.

| Access level | Meaning | Examples |
| --- | --- | --- |
| `public` | Anyone can read it, including logged-out visitors. Writes should come from admin scripts or service-role workflows only. | Festival names, public event editions, official websites, public Schengen country lookup |
| `authenticated` | Any signed-in app user can read it. Logged-out visitors cannot. Writes depend on the feature and should be discussed first. | Future community-only rankings, signed-in-only shared notes |
| `owner` | Only the owning user can read or change it. For Noam-only data, the row owner should be Noam's Supabase auth user. | Personal trips, Schengen day tracking, events I am attending, private notes |
| `app role` | A signed-in user with a role in `app_user_roles`. Current roles are `owner`, `admin`, and `viewer`; private-data reads are granted to `owner` and `admin`. | Temporary helper access, admin-only support workflows |

Default to `owner` if the data includes personal travel, attendance plans, visa-day calculations, private reviews, or anything that could reveal location/history/preferences. Default to `public` only when the data is already public official festival information.

## Required Discussion Before Adding Data

Every time new durable data is added, explicitly answer:

1. What table stores it?
2. Is the row `public`, `authenticated`, or `owner`?
3. Who can insert it?
4. Who can update/delete it?
5. Does it include personal travel or visa-related information?

If the answer is unclear, stop and ask before adding the data.

## Recommended Table Columns

For tables that may contain private or mixed-access rows, include:

```sql
owner_id uuid references auth.users(id) on delete cascade,
access_level text not null default 'owner'
  check (access_level in ('public', 'authenticated', 'owner'))
```

Always set `owner_id` for `owner` rows. `public` system tables such as `events`, `event_editions`, and `schengen_countries` may use simpler RLS policies without `owner_id` if they only contain public reference data.

## App Role Pattern

The current role-based access policy is intentionally conservative. The role table and policies have been managed directly in Supabase so far:

- `owner` and `admin` roles can read private trips, trip places, PTO days, and reviews.
- Private writes still require the signed-in user to own the row.
- `viewer` is reserved for future signed-in features and does not read private travel/review data by default.

Bootstrap role assignments from the Supabase SQL editor or another service-role workflow. Do not put role-management secrets in frontend files.

## RLS Pattern For Mixed-Access Tables

```sql
alter table public.example_table enable row level security;

drop policy if exists "read by access level" on public.example_table;
drop policy if exists "insert own rows" on public.example_table;
drop policy if exists "update own rows" on public.example_table;
drop policy if exists "delete own rows" on public.example_table;

create policy "read by access level"
on public.example_table
for select
using (
  access_level = 'public'
  or (access_level = 'authenticated' and (select auth.uid()) is not null)
  or (access_level = 'owner' and owner_id = (select auth.uid()))
);

create policy "insert own rows"
on public.example_table
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and access_level in ('authenticated', 'owner')
);

create policy "update own rows"
on public.example_table
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "delete own rows"
on public.example_table
for delete
to authenticated
using (owner_id = (select auth.uid()));
```

Use service-role scripts or manually reviewed SQL for admin-managed public reference data. Never put service-role keys in frontend files.

## Current Table Classification

| Table | Access level | Notes |
| --- | --- | --- |
| `events` | `public` | Festival brand/reference data, style tags, and public watchlist flag. |
| `event_editions` | `public` | Public edition dates and official details. |
| `dance_styles` | `public` | Public style taxonomy used to normalize event style tags. |
| `schengen_countries` | `public` | Public reference lookup. |
| `reviews` | `owner` | Personal review data behind login. Revisit access before any community review launch. |
| `personal_trips` | `owner` | Private travel and visa planning data. |
| `personal_trip_places` | `owner` | Private city/date rows for trip and Schengen calculations. |
| `personal_pto_days` | `owner` | Private PTO rows linked to personal travel. |
| `app_user_roles` | `authenticated` / admin-managed | Signed-in users can read their own role; `owner`/`admin` roles can manage app role rows. |
| `trips` | `owner` | Private travel and visa planning data unless explicitly reclassified. |
