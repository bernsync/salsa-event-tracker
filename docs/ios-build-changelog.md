# iOS Build Changelog

Historical record of what each uploaded or upload-ready build ships.

Before any App Store Connect or TestFlight upload, add or update the entry for that build and confirm the local validation commands. Uploads should not happen from undocumented build changes.

## Build 2 - 2026-06-14 - Pending Upload

Branch: `build-2-2026-06-14` (PR #71)

Status: PR open. Not yet uploaded.

### User-Visible Changes

**Bug fixes**
- Fixed crash on launch: "column dance_styles.id does not exist" — the `dance_styles` Supabase table has no `id` column; the iOS query was incorrectly requesting it. Removed `id` from the select; `DanceStyle` now uses `slug` as its identifier (matching the web app).
- Fixed missing Sign In button: the Sign In toolbar button in `RootView` was invisible because `TabView` has no `NavigationStack` parent. Added a prominent **Sign In** button directly inside the "Sign In Required" screen in both the Trips and Reviews tabs.

### Technical Changes

- `SupabaseService.fetchDanceStyles`: removed `id` from select query (`name,slug,is_active,sort_order` to match web).
- `DanceStyle`: `id: String` changed to `var id: String { slug }` (computed, not decoded).
- `AppModel`: added `var showLogin: Bool = false` so any view can trigger the login sheet.
- `RootView`: removed local `@State private var showLogin`; now uses `model.showLogin`.
- `ReviewsView`, `TripsView`: `ContentUnavailableView` updated to include a Sign In action button.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 2`, `MARKETING_VERSION = 1.0`.
- Simulator build: pending.
- Device archive: pending.
- App Store Connect upload: pending.

### Known Risks / Follow-Up Testing

- Verify dance styles load and appear correctly in any filter UI that references them.
- Verify login sheet presents when tapping Sign In from Trips and Reviews tabs while signed out.
- Verify that after login, private data (trips, reviews) loads correctly.

---

## Build 1 - 2026-06-14 - Not Uploaded

Branch: `main` (initial iOS app scaffolding)

Status: Initial build. Never uploaded. Superseded by Build 2.

### Notes

First working scaffold of the Salsa Event Tracker iOS app. Contained the `dance_styles.id` crash and missing login button; both fixed in Build 2.
