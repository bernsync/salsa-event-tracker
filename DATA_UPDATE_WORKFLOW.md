# Data Update Workflow

Supabase is the source of truth for durable data. GitHub Actions should be the remote control layer for refreshes, audits, reviewed upserts, and pull requests.

## Access Decision First

Before adding or changing data, classify it:

| Classification | Who can read it | Examples |
| --- | --- | --- |
| `public` | Anyone, logged in or not | Festival names, official websites, public event editions, Schengen lookup |
| `owner` | Only the row owner | Reviews, private trips, events Noam is attending, Schengen day calculations |
| `authenticated` | Any signed-in user | Future community-only rankings or shared notes |

Default to `owner` for anything personal, travel-related, review-related, or visa-related.

## Remote Update Options

### 1. Weekly Audit

The existing workflow `.github/workflows/weekly-event-edition-refresh.yml` runs every Monday and can also be started manually from GitHub Actions. It reads Supabase, checks official sources, and opens or updates an audit issue. It does not mutate Supabase automatically.

Use this for discovery and review.

### 2. Manual Supabase Upsert Workflow

The workflow `.github/workflows/upsert-supabase-events.yml` can be started manually from GitHub Actions.

1. Trigger from GitHub Actions on phone or desktop with `workflow_dispatch`.
2. Paste a small reviewed JSON payload of events or editions.
3. A script validates required fields, dedupes by event name + city + country + dates, and upserts to Supabase using `SUPABASE_SERVICE_ROLE_KEY`.
4. The workflow logs exactly which events and editions it created or updated.

This is best for public festival data after you have verified dates, venues, links, and organizers.

Payload shape:

```json
{
  "events": [
    {
      "name": "World Stars Salsa Festival",
      "organizer": "Koda Production",
      "website": "https://varnasalsafestival.com/",
      "instagram": "@world_stars_salsa_festival",
      "facebook": "https://www.facebook.com/varnasalsafest/",
      "editions": [
        {
          "start_date": "2027-04-22",
          "end_date": "2027-04-26",
          "city": "Albena",
          "country": "Bulgaria",
          "venue": "Hotel Maritim Paradise Blue 5*, Albena Resort",
          "tickets": "https://ticket.varnasalsafestival.com/",
          "event_size": "large",
          "notes": "Official Instagram result screenshot lists 22-26 April 2027."
        }
      ]
    }
  ]
}
```

### 3. Issue-Driven Update Requests

Recommended for phone-first use:

1. Open a GitHub issue using a simple template, for example `Update Amsterdam Salsa Weekend 2027`.
2. Add source links and fields in the issue body.
3. Apply a label such as `data-update`.
4. A GitHub Action parses the issue, creates an audit artifact, and either:
   - posts SQL/JSON for review, or
   - opens a PR with repo/code/docs changes.

This is safer than letting an issue mutate production data immediately.

### 4. PR Automation

For repo changes, use issue-triggered or manual Actions to create branches and PRs. Public data should usually go straight to Supabase; repo changes are for app behavior, workflows, docs, migrations, and skills.

## Safety Rules

- Never put a Supabase service-role key in `web/` or any frontend file.
- Public festival data can be written by service-role workflows after review.
- Owner data must include `owner_id` and be protected by RLS.
- Any automated upsert must log exactly what it inserted or updated.
- Deletions should stay manual until the workflow has a strong review step.

