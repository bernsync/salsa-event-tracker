# User Sharing and Permission Plan

## Goal

Allow invited users to see only the parts of Noam's private Salsa Festival Tracker data that they are explicitly granted, such as attended events, reviews, or full trips, without exposing unrelated travel, PTO, notes, Schengen calculations, or owner identifiers in the public repo.

## Current State

The app currently treats signed-in users as a broad private-access group:

- Public users can read `events`, `event_editions`, and `schengen_countries`.
- Signed-in users can request private/auth-gated tables such as `reviews`, `trips`, and `personal_trips`.
- Frontend visibility is mostly controlled by `isSignedIn()`.
- Private trip attendance is inferred from `personal_trip_places.event_edition_id`.

This is not granular enough for multi-user sharing. Someone who should only know which festivals Noam is attending must not receive full trip rows, city padding, PTO, notes, Schengen counts, or reviews.

## Access Model

Use explicit capability scopes instead of broad roles. Roles can be UI shortcuts later, but database enforcement should check scopes.

Recommended scopes:

| Scope | Meaning |
| --- | --- |
| `attendance.read` | Can see event editions Noam is attending, but not trip dates beyond the event link. |
| `reviews.read` | Can see Noam's reviews. |
| `trips.read` | Can see full private trip rows and city segments. |
| `trips.write` | Can create/update/delete private trip rows. |
| `pto.read` | Can see PTO rows. |
| `schengen.read` | Can see Schengen-impacting trip calculations. |
| `sharing.admin` | Can grant/revoke permissions for Noam's shared data. |

Initial MVP should implement `attendance.read`, `reviews.read`, and `trips.read`. Leave write/admin UI for a later phase unless needed immediately.

## Database Design

Add a permission table:

```sql
create table public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  grantee_user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (owner_id, grantee_user_id, scope),
  check (scope in (
    'attendance.read',
    'reviews.read',
    'trips.read',
    'trips.write',
    'pto.read',
    'schengen.read',
    'sharing.admin'
  ))
);
```

Add helper functions:

```sql
create or replace function public.has_permission(target_owner_id uuid, required_scope text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_owner_id = auth.uid()
    or exists (
      select 1
      from public.user_permissions p
      where p.owner_id = target_owner_id
        and p.grantee_user_id = auth.uid()
        and p.scope = required_scope
    );
$$;
```

Consider a second helper for any-of checks if queries need combined scopes.

## Attendance Exposure

Do not grant `attendance.read` users direct read access to `personal_trips` or `personal_trip_places`.

Instead, create a narrow attendance table or view that exposes only event attendance:

Preferred table:

```sql
create table public.shared_event_attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_edition_id uuid not null references public.event_editions(id) on delete cascade,
  access_level text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (owner_id, event_edition_id)
);
```

This table can be maintained from trip imports or a controlled sync query. It avoids leaking travel-only segments.

RLS:

```sql
alter table public.shared_event_attendance enable row level security;

create policy "read own or permitted attendance"
on public.shared_event_attendance
for select
using (public.has_permission(owner_id, 'attendance.read'));

create policy "owner writes attendance"
on public.shared_event_attendance
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
```

MVP sync option:

```sql
insert into public.shared_event_attendance (owner_id, event_edition_id)
select distinct owner_id, event_edition_id
from public.personal_trip_places
where event_edition_id is not null
on conflict (owner_id, event_edition_id) do nothing;
```

Later, make this automatic via trigger or controlled trip-save logic.

## RLS Policy Changes

Update private table policies to use scopes:

- `reviews`: owner can read/write; grantees with `reviews.read` can read only.
- `personal_trips`: owner can read/write; grantees with `trips.read` can read only.
- `personal_trip_places`: owner can read/write; grantees with `trips.read` can read only.
- `personal_pto_days`: owner can read/write; grantees with `pto.read` can read only.

Do not let `attendance.read` read `personal_trip_places`; it should only read `shared_event_attendance`.

Example read policy:

```sql
create policy "read own or permitted reviews"
on public.reviews
for select
using (public.has_permission(owner_id, 'reviews.read'));
```

Write policies should remain owner-only until explicit collaborator editing is needed.

## Frontend Changes

Replace `isSignedIn()` gates with capability checks.

Add app state:

```js
permissions: new Set()
```

Load permissions after auth:

- User's own data should imply all owner capabilities.
- Granted scopes should come from `user_permissions`.
- Add helpers:

```js
function can(scope) {
  return isOwnerSession() || state.permissions.has(scope);
}
```

UI behavior:

- Reviews tab: show only if `can("reviews.read")`.
- Trips tab: show only if `can("trips.read")`.
- Attendance badges/filter: show if `can("attendance.read")`.
- PTO summary: show only if `can("pto.read")` or `can("trips.read")`, depending on desired behavior.
- Schengen summary: show only if `can("schengen.read")` or owner.
- Add/edit/delete trip buttons: show only for owner or `can("trips.write")`.

Data loading:

- Load public events for everyone.
- Load shared attendance from `shared_event_attendance` for users with `attendance.read`.
- Load reviews only for users with `reviews.read`.
- Load full personal trips only for users with `trips.read`.
- Load PTO only for users with `pto.read` or full trip access.

## Admin and Grant Workflow

MVP can use manual SQL grants:

```sql
insert into public.user_permissions (owner_id, grantee_user_id, scope, created_by)
values
  ('<OWNER_UUID>', '<GRANTEE_UUID>', 'attendance.read', '<OWNER_UUID>');
```

Good version adds an owner-only Sharing screen:

- Search or enter invited user's email.
- Select scopes with checkboxes.
- Save grants.
- Revoke grants.
- Show current grants.

Do not commit real owner IDs, user IDs, or emails to the repo.

## Migration Phases

### Phase 1: Permission Foundation

- Add `user_permissions`.
- Add `has_permission()`.
- Add RLS policies for permission table.
- Add generic migration docs without real IDs.
- Verify existing owner access still works.

### Phase 2: Attendance-Only Sharing

- Add `shared_event_attendance`.
- Backfill it from `personal_trip_places`.
- Add RLS for owner and `attendance.read`.
- Update frontend to load attendance separately from full trips.
- Ensure attendance users cannot query trip rows.

### Phase 3: Reviews and Trips Scopes

- Update `reviews` RLS for `reviews.read`.
- Update trip table RLS for `trips.read`.
- Add frontend `can(scope)` checks.
- Hide tabs and controls based on capabilities.
- Keep write operations owner-only.

### Phase 4: Sharing UI

- Add a Sharing/settings view for the owner.
- Grant/revoke permissions.
- Show a clear list of what each user can access.
- Add empty states for users with partial access.

### Phase 5: Hardening

- Add RLS test SQL.
- Test with at least three accounts:
  - Owner.
  - Attendance-only user.
  - Reviews-only user.
- Confirm attendance-only user cannot read `personal_trips`, `personal_trip_places`, `reviews`, `personal_pto_days`, or notes.
- Confirm reviews-only user cannot infer trip plans.
- Confirm logged-out users only see public event data.

## Security Rules

- Never expose service-role keys in frontend code.
- Never commit real user IDs, emails, permission grants, private trips, or reviews.
- Treat frontend hiding as convenience only; Supabase RLS is the source of truth.
- Keep attendance-only data narrow. It should answer "which event edition is attended?" and nothing more.
- Do not expose trip labels to attendance-only users if labels include multi-city travel details.

## Estimated Build Size

| Version | Scope | Estimate |
| --- | --- | --- |
| MVP manual grants | Permission table, RLS, attendance-only table, frontend capability gates | 1-2 focused days |
| Usable sharing product | MVP plus reviews/trips scopes and owner Sharing UI | 3-5 days |
| Full multi-user platform | Invites, audit logs, collaboration, write roles, robust tests | 1-2 weeks |

## Open Decisions

- Should attendance visibility mean future events only, historical events only, or all attended events?
- Should reviews be visible without showing exact attendance?
- Should `trips.read` include PTO and Schengen by default, or should those require separate scopes?
- Should grantees be able to see Noam's name/profile, or only the shared data?
- Should permissions be per-owner globally or per event/review/trip item eventually?
