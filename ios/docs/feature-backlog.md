# Feature Backlog

Post-MVP ideas. Do not build during initial implementation.

**Legend:**
- In app — implemented
- Backlog — viable, no significant obstacle
- Obstacle — viable but requires design work or new infrastructure

## Token auto-refresh
**Status: Known limitation**
Access tokens expire after 1 hour. Current plan signs user out on 401. Seamless refresh requires `POST /auth/v1/token?grant_type=refresh_token` and a retry loop.

## Push notifications for event reminders
**Status: Backlog**
Use `UNUserNotificationCenter` for local notifications.

## Watchlist / saved events
**Status: Backlog**
`Event.watchlist` field already exists. Add toggle on EventDetailSheet.

## iCal / calendar export
**Status: Backlog**
Generate `.ics` from EventEdition, share via UIActivityViewController.
