# Design System Notes

## Vibe

Nightlife/event discovery, but practical and scannable. The app should feel polished, fast, and useful for repeated planning.

## Layout

- Mobile-first calendar and list views.
- Dense but readable toolbars for filtering.
- Event cards should make date, location, event name, and official links easy to scan.
- Private views should clearly distinguish signed-out, loading, empty, and data states.

## Current Tokens

Core CSS variables live in `web/styles.css` under `:root`, including background, panel, ink, muted, accent, green, blue, amber, line, and shadow values.

## Core Components

Existing or expected reusable patterns:

- Event card
- Festival row/card
- Filter field
- Search box
- Toggle field
- Primary, secondary, and danger actions
- Icon button
- Modal shell
- Empty state
- Calendar event card
- Auth/status panel

## Rules

- Date and location should be visible without opening details.
- Official links and calendar actions should be grouped predictably.
- Long event names must wrap cleanly on mobile.
- Missing venue, ticket, or social links should not create awkward gaps.
- Avoid nested cards.
- Avoid a one-color theme.
- Do not use hero or marketing-page patterns for the app shell.
