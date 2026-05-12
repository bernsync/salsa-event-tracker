---
name: salsa-festival-auditor
description: Audit and update the Salsa Festivals Tracker event data from official festival sources. Use when the user asks to check festivals for a month/year, historical editions, future editions such as 2027, official names, dates, locations, venues, DJs/artists, organizers, ticket links, websites, Instagram/Facebook accounts, or missing event details in the salsa-event-tracker web app.
---

# Salsa Festival Auditor

Use this skill to verify and update the Salsa Festivals Tracker app data from official or near-official sources.

## Scope

Default repo path:
`C:\Users\noamb\OneDrive\Documents\salsa-event-tracker`

Primary app files:
- `web/seed-events.js`: event editions with city, country, name, startDate, endDate.
- `web/event-links.js`: official source links and detailed fields by canonical event name.
- `web/app.js`: canonical aliases, date corrections, cleanup rules, and app behavior.
- `web/hardcoded-reviews.js`: hardcoded reviews only when the user provides review content.

## Workflow

1. Parse the user request into a target set.
   - If they name a month/year, filter current `seed-events.js` by overlapping date range.
   - If they ask for future data, search each matching festival for the next confirmed edition.
   - If they ask for historical data, verify past edition dates and source links where available.

2. Inspect local data before searching.
   - Search with `rg` or `Select-String` for festival names in `web/seed-events.js`, `web/event-links.js`, and `web/app.js`.
   - Identify duplicate aliases, stale names, wrong dates, missing links, missing organizer, missing venue, missing DJs/artists, and missing ticket link.

3. Verify sources in priority order.
   - Official festival website or official ticket page.
   - Official Instagram/Facebook profile or posts.
   - Organizer website.
   - Reputable event listing only when official sources do not expose the needed field; mark it as lower confidence in the final answer.

4. Capture fields consistently.
   - Official event name.
   - Start and end date in `YYYY-MM-DD`.
   - City and country.
   - Venue.
   - Organizer.
   - Website.
   - Instagram handle, formatted as `@handle`.
   - Facebook URL when useful.
   - Ticket URL or ticket page in `tickets` if the app schema supports it; otherwise use website/ticket page and note the limitation.
   - Price/currency when clearly published.
   - DJs and artists/instructors when clearly published.
   - Notes: short factual summary only.

5. Edit conservatively.
   - Use official names in `seed-events.js`.
   - Add future editions as new rows rather than overwriting historical editions.
   - Put durable details in `event-links.js` by canonical event name.
   - Add aliases in `canonicalEventNames` in `app.js` when old names or common variants should resolve to the official name.
   - Add `eventDateCorrections` in `app.js` when existing localStorage entries need to self-correct.
   - Avoid deleting an event unless the user explicitly asks or it is a known duplicate, test, or incorrect entry.

6. Validate after edits.
   - Run `node --check web\app.js`.
   - Run `node --check web\seed-events.js`.
   - Run `node --check web\event-links.js`.
   - Search for stale old names or duplicate entries.
   - If browser verification is useful, run the local app and check the relevant tab.

7. Final response.
   - Summarize corrected or added events.
   - List any events still needing user confirmation or missing official info.
   - Include source links used.
   - Remind the user to commit and push via GitHub Desktop when changes should go live.

## Data Quality Rules

- Prefer exact official naming even when the organizer brand differs from the festival name.
- Keep organizer separate from event name.
- Calendar display should remain compact; do not add verbose details to calendar chips.
- Weekend events ending Monday should not display Monday unless explicitly intentional, such as Prague Salsa Marathon.
- Do not invent DJs, artists, ticket prices, venues, or organizers. Leave missing fields blank and report them.
- If official sources conflict, use the event website for dates and the social account for recently announced changes, then mention the conflict.
