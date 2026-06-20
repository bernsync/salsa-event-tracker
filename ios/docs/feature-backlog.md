# Feature Backlog

Post-MVP ideas. Do not build during initial implementation.

**Legend:**
- In app — implemented
- Backlog — viable, no significant obstacle
- Obstacle — viable but requires design work or new infrastructure

## Build 3 (2026-06-14) — Calendar & Filter Parity

**Shipped:**

- **Calendar correct month/timezone**: `DateUtils` now uses local device timezone; "today" always matches the device calendar date.
- **Calendar weekday order**: Grid starts on Sunday (matching web app).
- **Calendar selected date ring**: Selected date shows an accent-colored stroke ring; today keeps the filled accent circle. Matches web app visual treatment.
- **Calendar month-jump picker**: Scrollable filter bar with a "Jump" picker (months with events), "Attended only" toggle, and "Hide duplicates" toggle — matching web app.
- **EventList filters**: Year, Month, Country, Size pickers + Sort + Past events toggle — full parity with web app Calendar List filters.
- **FestivalList filters**: Year, Month, Country, Size pickers — full parity with web app Event List filters.
- **App icon**: Crimson gradient, white calendar card, red header with salsa dancer couple silhouette + musical notes.

---

## Token auto-refresh
**Status: In app (Build 13)**
Access tokens expire after 1 hour. `AuthService.validAccessToken()` now refreshes seamlessly via `POST /auth/v1/token?grant_type=refresh_token` when the token is within 60s of expiry, persisting the rotated tokens to the Keychain; `loadPrivateData` routes through it. A failed refresh (revoked/expired refresh token) clears the session and surfaces `authExpired`. Restored sessions are kept even when the access token has expired, so returning users no longer get signed out on launch.

## Push notifications for event reminders
**Status: Backlog**
Use `UNUserNotificationCenter` for local notifications.

## Watchlist / saved events
**Status: Backlog**
`Event.watchlist` field already exists. Add toggle on EventDetailSheet.

## iCal / calendar export
**Status: Backlog**
Generate `.ics` from EventEdition, share via UIActivityViewController.
