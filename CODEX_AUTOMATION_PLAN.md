# Event Automation Plan

## Decision

Do not use the OpenAI API for this automation right now.

The current plan is:

- Use GitHub-hosted Actions for deterministic audit-only checks.
- Avoid recurring OpenAI API costs.
- Keep Supabase writes manual for now.
- Prepare a future self-hosted mini PC runner path for Codex/OpenClaw OAuth with your ChatGPT/Codex account.

## What Is Implemented Now

The existing weekly audit workflow remains the production automation path, but it is now shaped around two no-AI checks:

1. **Next-edition discovery**
   - Runs every Sunday.
   - Checks public events that ended from January 1 of the current year through today.
   - Flags events that do not have a future edition in the next 12 months.
   - Opens or updates the `Weekly next-edition discovery` issue.

2. **Upcoming event refresh**
   - Runs every Sunday.
   - Checks public events starting in the next three months.
   - Fetches official source pages and reports date mentions/source fetch failures.
   - Opens or updates the `Upcoming event refresh` issue.

Both checks:

- Read Supabase.
- Fetch official/known source links with deterministic Node code.
- Upload audit artifacts.
- Open/update GitHub issues.
- Do not call OpenAI.
- Do not call Codex.
- Do not mutate Supabase.
- Do not close issues automatically.

## Existing Repo Pieces

- `.github/workflows/weekly-event-edition-refresh.yml`
  - Sunday cron.
  - GitHub-hosted runner.
  - Issues write permission only.
- `scripts/refresh-event-editions.mjs`
  - Loads public event data from Supabase.
  - Checks source links.
  - Produces:
    - `audit/event-edition-refresh.json`
    - `audit/event-edition-refresh.md`
    - `audit/upcoming-event-refresh.md`
- `.github/workflows/upsert-supabase-events.yml`
  - Manual workflow for reviewed event JSON.
  - Still available when you want to apply reviewed inserts/updates.
- `.github/ISSUE_TEMPLATE/new-event.yml`
  - Template for ad hoc public event requests.

## No-API Workflow

### Sunday Audit

```text
GitHub schedule
  -> scripts/refresh-event-editions.mjs
  -> audit artifacts
  -> GitHub issues
  -> human/Codex-in-IDE review
  -> manual upsert workflow or SQL
```

### Ad Hoc New Event

```text
Open GitHub issue with new-event template
  -> label: data-update, new-event
  -> human/Codex-in-IDE review using salsa-festival-auditor skill
  -> reviewed JSON/SQL
  -> manual upsert workflow or Supabase SQL editor
```

This keeps usage cost low because the scheduled automation does not invoke any LLM.

## Future Mini PC Runner Path

When you buy a mini PC, use:

- [MINI_PC_RUNNER_PLAN.md](</c:/Users/noamb/Documents/salsa-event-tracker/MINI_PC_RUNNER_PLAN.md>)

Future target:

```text
GitHub schedule
  -> self-hosted runner on mini PC
  -> local Codex/OpenClaw OAuth session
  -> structured candidate JSON
  -> deterministic validator
  -> restricted Supabase insert/update
  -> GitHub issue comment/close
```

Important future constraints:

- Codex/OpenClaw OAuth credentials stay on your mini PC.
- Do not store personal OAuth/session credentials in GitHub Secrets.
- The model never receives database credentials.
- The model never returns executable SQL.
- Deterministic scripts validate all model output.
- Supabase credential must be restricted to select/insert/update only.
- Delete permission must not exist.

## Future Scripts To Add Later

Add these only when the mini PC runner is ready:

- `scripts/select-event-candidates.mjs`
  - Modes:
    - `next-edition`
    - `upcoming-refresh`
    - `issue-new-events`
- `scripts/run-local-codex-event-agent.mjs`
  - Calls local Codex/OpenClaw, not OpenAI API.
  - Loads the correct skill text.
  - Produces structured JSON.
- `scripts/validate-event-agent-output.mjs`
  - Rejects deletes.
  - Rejects private table changes.
  - Rejects low-confidence rows.
  - Dedupe checks against Supabase.
- `scripts/apply-event-upserts.mjs`
  - Uses restricted Supabase role.
  - Inserts/updates only.
- `scripts/comment-and-close-issue.mjs`
  - Comments summary.
  - Closes only successful automation issues.

## Supabase Permission Goal

For future automated writes, create a dedicated role such as `event_data_bot`.

Grant:

- `select` on:
  - `events`
  - `event_editions`
  - `schengen_countries`
- `insert` on:
  - `events`
  - `event_editions`
- selected-column `update` on:
  - public event metadata fields
  - public edition metadata fields

Do not grant:

- `delete` on any table.
- access to private owner tables:
  - `personal_trips`
  - `personal_trip_places`
  - `personal_pto_days`
  - `reviews`

## Manual Intervention Rules

Open or keep an issue for manual intervention when:

- A source says an event is canceled.
- A source implies an existing row should be deleted.
- Two official sources conflict.
- Only social media hints exist and the page is not fetchable.
- The event appears renamed or merged.
- The event includes private travel/visa/review data.

## Recommended Next Steps

1. Let the Sunday no-API audits run for a week.
2. Use the generated issues with Codex in the IDE to refine source-checking quality.
3. Buy/setup the mini PC when ready.
4. Add the self-hosted runner in dry-run mode.
5. Only enable automated writes after multiple clean dry runs.

