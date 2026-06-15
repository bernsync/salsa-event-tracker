# iOS Build Changelog

Historical record of what each uploaded or upload-ready build ships.

Before any App Store Connect or TestFlight upload, add or update the entry for that build and confirm the local validation commands. Uploads should not happen from undocumented build changes.

**CRITICAL RULE — archive must be built AFTER all code changes are committed.** The Build 2 upload carried the `dance_styles.id` bug despite the fix being in git, because the `.xcarchive` was created before the fix commit. Never reuse a pre-existing archive. Always run `xcodebuild archive` fresh from the HEAD of the release branch immediately before `xcodebuild -exportArchive`. See `docs/ios-deployment-checklist.md` → "Pre-Upload Gate" for the full verification sequence.

---

## Build 10 - 2026-06-15 - App Store Connect Upload

Branch: `build-10-2026-06-15`

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### User-Visible Changes

**New features — web app feature parity**
- **Attending badge**: event cards now show a blue "Attending" pill when a trip place is linked to that event edition.
- **Watchlist badge**: event cards show an orange "Watchlist" pill for watchlisted events you aren't attending.
- **Review score badge**: event cards show a score pill (e.g. `7.4★`) computed from your past reviews of that festival. For upcoming editions the score is drawn from prior editions of the same festival.
- **Event detail — Schengen status**: event detail sheet now shows "Schengen: Yes / No" based on the country.
- **Event detail — prior edition**: event detail sheet now shows a collapsible prior-edition section (dates, city, venue, size, price, DJs, artists, notes) matching the web modal.
- **Festival cards — edition history**: festival rows now show edition history blocks (current year + 2 prior years with dates, city, size) instead of plain year pills.
- **Festival cards — attending/watchlist badges**: festival cards show the same attending/watchlist pills as event cards.
- **Recently Added tab**: new "Recent" tab showing all festival editions added to the database in the last 7 days (full list, not capped at 5).
- **Calendar — trip city chips**: when signed in, calendar cells show a city chip for each trip place active on that date. Selected-day agenda also shows trip and PTO rows.
- **Calendar — PTO chips**: PTO days appear as orange chips on their calendar date.
- **New app icon**: salsa calendar design (red background, dancers, maracas, flamenco dress).

**Bug fixes**
- Calendar "Attended only" and "Hide duplicates" toggles now actually filter events (they were bound to state but the filtering logic ignored them).
- Calendar trip/PTO chips now appear immediately when signing in without needing to navigate away and back.
- Country pickers in Events and Festivals tabs now only show countries available for the currently active year/historical filter, so selecting a country never produces an empty result.
- Festivals tab resets the country filter when year is changed (matching web behavior).

### Technical Changes

- `AppModel`: added `isAttending(editionId:)`, `reviewScore(for:)`, `tripPlacesOn(_:)`, `ptoDaysOn(_:)` helpers. Removed `isSignedIn` guard from `tripPlacesOn`/`ptoDaysOn` — the guard read `authService.session` through a non-`@Observable` path and suppressed re-renders on sign-in; trips array is already empty when signed out.
- `EventCard`: attending, watchlist, score badges; attending state shown as accent border.
- `EventDetailSheet`: Schengen status row; prior edition section; requires `@Environment(AppModel.self)` for schengen lookup.
- `FestivalRow`: attending/watchlist badges; `EditionHistoryBlock` subview replacing year pills.
- `CalendarView`: `eventsOn()` now filters by `calendarAttendedOnly` and `calendarHideDuplicateAttended`; `CalendarTripChip` and `CalendarPTOChip` private views in selected-day agenda; trip/PTO data passed to `CalendarDayCell`.
- `CalendarDayCell`: accepts `tripPlaces` and `ptoDays` and renders chips below event dots.
- `RecentlyAddedView`: new view + `Views/RecentlyAdded/` directory; `RecentlyAddedCard` subview.
- `AppModel+Types`: `Tab.recentlyAdded` case added.
- `RootView`: `RecentlyAddedView` wired as "Recent" tab (sparkles icon).
- `EventListView.availableCountries`: scoped to active historical + year filter state.
- `FestivalListView.availableCountries`: scoped to active year filter; year picker `.onChange` resets `festivalFilterCountry`.
- App icon: `AppIcon-1024.png` replaced with salsa calendar design, resized to 1024×1024.
- `project.yml`: `CURRENT_PROJECT_VERSION` bumped 9 → 10.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 10`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` — All tests passed, **TEST SUCCEEDED**.
- Simulator build: **BUILD SUCCEEDED**.
- Release archive: **ARCHIVE SUCCEEDED**.
- App Store Connect upload: Upload succeeded. Uploaded SalsaEventTracker. **EXPORT SUCCEEDED**.

### Post-Upload Verification

- [ ] Calendar shows trip city and PTO chips after signing in.
- [ ] "Attended only" and "Hide duplicates" toggles visibly filter events on the calendar.
- [ ] Event cards show attending/watchlist/score badges where applicable.
- [ ] Event detail shows Schengen status and prior edition section.
- [ ] Festival rows show edition history blocks.
- [ ] Recently Added tab shows recent events.
- [ ] Events tab country picker only shows countries relevant to the active year/historical setting.
- [ ] Festivals tab country picker resets when year is changed.
- [ ] New app icon visible on home screen.

---

## Build 8 - 2026-06-15 - App Store Connect Upload

Branch: `build-8-2026-06-15`

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### Root cause note

Build 7's `[Private]` diagnostic prefix confirmed the error is from `loadPrivateData()`. The error message "The data couldn't be read because it is missing" is `DecodingError.keyNotFound` or `DecodingError.valueNotFound`. Build 7 fixed all nullable fields in `Trip`, `TripPlace`, `PTODay`, `EventEdition`, `DanceStyle`, and `SchengenCountryRow`, but `Review` still used the synthesized `Decodable` init with non-optional `userId: String` (decoded from column `user_id`) and `eventEditionId: String`. If the `reviews` table column is named differently than `user_id`, or if `event_edition_id` is null for any review row, the synthesized decode throws `DecodingError.keyNotFound` / `DecodingError.valueNotFound`.

Fix: added `extension Review { init(from:) }` that uses `(try? decode) ?? ""` for `userId` and `eventEditionId`, making Review fully null-safe while preserving the synthesized memberwise initializer.

Also upgraded the AppModel diagnostic: `DecodingError` catch blocks now surface the exact failing key and coding path (e.g. `key 'user_id' not found at 'Index 0'`) instead of just the localized string, eliminating the need for another diagnostic build if further errors occur.

### User-Visible Changes

**Bug fix**
- Fixed persistent "Load failed: [Private] DecodingError: missing" error after login. Root cause: `Review.userId` and `Review.eventEditionId` were the last non-optional fields without null-safe decoding.

### Technical Changes

- `Review.swift`: Added `extension Review { init(from:) }` — `userId` and `eventEditionId` use `(try? decode) ?? ""`; all other fields use `decodeIfPresent`.
- `AppModel.swift`: Added `decodeDetail(_:)` helper — DecodingError catch blocks now show the exact failing key and coding path in the error message (e.g. `[Private] key 'user_id' not found at 'Index 0'`).
- `project.yml` / `project.pbxproj`: `CURRENT_PROJECT_VERSION` bumped 7 → 8.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 8`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` — 11 tests, 3 suites, **TEST SUCCEEDED**.
- Simulator build: **BUILD SUCCEEDED**.
- Release archive: **ARCHIVE SUCCEEDED**.
- App Store Connect upload: Upload succeeded. **EXPORT SUCCEEDED**.

### Post-Upload Verification (required before declaring done)

- [ ] Open app from TestFlight build — confirm no error after login.
- [ ] Confirm trips and reviews load correctly after login.

---

## Build 7 - 2026-06-15 - App Store Connect Upload

Branch: `build-7-2026-06-15`

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### Root cause note

Build 6 fixed nullable fields in `Review` score columns and `TripPlace.travelRole`/`sequence`. The "Load failed: cancelled" error persisted because additional nullable fields in other models were still non-optional. Any `Decodable` struct with a non-optional field receiving a NULL DB value throws `DecodingError`; in Swift structured concurrency, the sibling `async let` task (still awaiting its URLSession response) receives cancellation and throws `URLError(.cancelled)` — which is what surfaces in the catch block.

Remaining fields fixed in this build (all use `(try? decode) ?? fallback` in extension-scoped custom inits, preserving synthesized memberwise initializers):

- `EventEdition`: `startDate`, `endDate`, `city`, `country` → `?? ""`; `visibility` → `?? "public"`
- `DanceStyle`: `isActive` → `?? false`; `sortOrder` → `?? 0`
- `Trip`: `startDate`, `endDate` → `?? ""`; `places`/`ptoDays` arrays → `?? []`
- `TripPlace`: `startDate`, `endDate`, `city`, `country` → `?? ""`
- `PTODay`: `ptoDate` → `?? ""`; `amount` → `?? 1.0`
- `SchengenCountryRow`: `isSchengen` → `?? false`

Additionally, error messages now include `[Public]` or `[Private]` prefix and the Swift error type (e.g., `[Private] DecodingError: …`) to make future failures immediately diagnosable without a second build.

### User-Visible Changes

**Bug fix**
- Fixed persistent "Load failed: cancelled" error after login. Root cause: additional nullable DB columns in `EventEdition`, `DanceStyle`, `Trip`, `TripPlace`, and `PTODay` were typed as non-optional in the iOS models; any NULL value triggered the same decode-failure → sibling-cancellation pattern fixed partially in Builds 5 and 6.

### Technical Changes

- `Event.swift`: Added `extension EventEdition { init(from:) }` — null-safe decoding for `startDate`, `endDate`, `city`, `country`, `visibility`.
- `DanceStyle.swift`: Added `extension DanceStyle { init(from:) }` — null-safe decoding for `isActive`, `sortOrder`.
- `Trip.swift`: Added `extension Trip { init(from:) }`, `extension TripPlace { init(from:) }`, `extension PTODay { init(from:) }` — null-safe decoding for all fields with web-mapper fallbacks (`""`, `1.0`, `[]`).
- `SupabaseService.swift`: Added `extension SchengenCountryRow { init(from:) }` — null-safe decoding for `isSchengen`.
- `AppModel.swift`: Error messages now include `[Public]`/`[Private]` source tag and Swift error type for diagnostics.
- `project.yml` / `project.pbxproj`: `CURRENT_PROJECT_VERSION` bumped 6 → 7.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 7`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` — 11 tests, 3 suites, **TEST SUCCEEDED**.
- Simulator build: `xcodebuild -configuration Release -destination 'generic/platform=iOS Simulator' build` — **BUILD SUCCEEDED**.
- Release archive: `xcodebuild -archivePath /private/tmp/SalsaEventTracker-build7-20260615.xcarchive archive` — **ARCHIVE SUCCEEDED**.
- App Store Connect upload: `xcodebuild -exportArchive …` — Upload succeeded. Uploaded SalsaEventTracker. **EXPORT SUCCEEDED**.

### Post-Upload Verification (required before declaring done)

- [ ] Open app from TestFlight build — confirm no error after login.
- [ ] Confirm trips and reviews load correctly after login.
- [ ] Confirm events and calendar load at startup.

---

## Build 6 - 2026-06-15 - App Store Connect Upload

Branch: `build-6-2026-06-15`

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### Root cause note

Build 5 fixed two specific non-optional fields (`Review.reviewedAt`, `Trip.label`). This exposed a broader pattern: the web app handles every nullable DB column with `|| fallback` expressions; the iOS `Decodable` models had non-optional types for many other columns that can be NULL (score fields added incrementally to the reviews schema, `force_show_monday` on event editions, `styles` arrays on events, `travel_role` and `sequence` on trip places). Any NULL value in a decoded row caused `JSONDecoder` to throw `DecodingError`. In `loadPrivateData()`, with two concurrent `async let` tasks, a decode failure in one task causes Swift's structured concurrency runtime to cancel the sibling — the cancelled sibling throws `URLError(.cancelled)`, which is what the user saw as "Load failed: cancelled."

### User-Visible Changes

**Bug fix**
- Fixed "Load failed: cancelled" error that appeared after every login. Root cause: nullable DB columns (primarily review score fields) were typed as non-optional in the iOS models, causing a decode failure that triggered Swift structured concurrency task cancellation.
- Retry button in the error alert now also reloads private data (trips/reviews) when signed in, not just public events/styles/schengen.

### Technical Changes

- `Review`: all 11 score fields (`music_score` … `travel_score`) changed `Int` → `Int?`. `totalScore` computed property and `ReviewScoring.score(for:in:)` use `?? 0` fallback. `ReviewEditorView.populateFromReview()` uses `?? 5` when pre-filling the editor for an existing review with a null score.
- `Event`: added custom `init(from:)` that decodes `styles` with `[]` fallback (Supabase returns `null` for unset array columns). `EventEdition.forceShowMonday` changed `Bool` → `Bool?` to match web app's `|| false` handling.
- `TripPlace`: `travelRole` changed `String` → `String?`; `sequence` changed `Int` → `Int?`. `TripEditorView` updated to use `?? "stay"` / `?? 0`.
- `RootView`: Retry button task now calls `loadPrivateData()` after `loadPublicData()`.
- `project.yml` / `project.pbxproj`: `CURRENT_PROJECT_VERSION` bumped 5 → 6.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 6`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` — 11 tests, 3 suites, **TEST SUCCEEDED**.
- Simulator build: `xcodebuild -scheme SalsaEventTracker -configuration Debug -destination 'generic/platform=iOS Simulator' build` — **BUILD SUCCEEDED**.
- Release archive: `xcodebuild -project ios/SalsaEventTracker.xcodeproj -scheme SalsaEventTracker -configuration Release -destination generic/platform=iOS -archivePath /private/tmp/SalsaEventTracker-build6-20260615.xcarchive -allowProvisioningUpdates archive` — **ARCHIVE SUCCEEDED**.
- App Store Connect upload: `xcodebuild -exportArchive -archivePath /private/tmp/SalsaEventTracker-build6-20260615.xcarchive -exportPath /private/tmp/SalsaEventTracker-build6-20260615-upload -exportOptionsPlist ios/ExportOptions-AppStore.plist -allowProvisioningUpdates` — Upload succeeded. Uploaded SalsaEventTracker. **EXPORT SUCCEEDED**.

### Post-Upload Verification (required before declaring done)

- [ ] Open app from TestFlight build — confirm no error after login.
- [ ] Confirm trips and reviews load correctly after login.
- [ ] Confirm Retry button reloads private data when signed in.

---

## Build 5 - 2026-06-15 - App Store Connect Upload

Branch: `build-5-2026-06-15`

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### Root cause note

After login, `loadPrivateData()` fetched trips and reviews from Supabase. Any row where `reviewed_at` (reviews) or `label` (trips) was NULL caused Swift's `JSONDecoder` to throw a `DecodingError`, surfacing as "Load failed: The data couldn't be read because it is missing." The web app silently handles these with `|| fallback` expressions; the iOS models had them as non-optional Strings.

### User-Visible Changes

**Bug fix**
- Fixed post-login crash: "Load failed: The data couldn't be read because it is missing." — `Review.reviewedAt` and `Trip.label` are now optional; views fall back gracefully to empty string / "Untitled Trip."

### Technical Changes

- `Review.reviewedAt: String` → `String?`; `ReviewCard` and `ReviewsView` updated to handle nil.
- `Trip.label: String` → `String?`; `TripCard` shows "Untitled Trip" for nil, `TripEditorView` populates from `?? ""`.
- `project.yml` / `project.pbxproj`: `CURRENT_PROJECT_VERSION` bumped 4 → 5.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 5`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` — 11 tests, 3 suites, **TEST SUCCEEDED**.
- Simulator build: `xcodebuild -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build` — **BUILD SUCCEEDED**.
- Release archive: `xcodebuild … -archivePath /private/tmp/SalsaEventTracker-build5-20260615.xcarchive … archive` — **ARCHIVE SUCCEEDED**.
- App Store Connect upload: `xcodebuild -exportArchive …` — **EXPORT SUCCEEDED**.

### Post-Upload Verification (required before declaring done)

- [ ] Open app from TestFlight build — confirm no error after login.
- [ ] Confirm trips load and display correctly (including any with a null label showing "Untitled Trip").
- [ ] Confirm reviews load and sort correctly (including any with a null reviewed_at).

---

## Build 4 - 2026-06-14 - App Store Connect Upload

Branch: `build-4-2026-06-14` (PR #TBD)

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### Root cause note

Build 2 was archived from a pre-fix snapshot, so the `dance_styles.id` crash shipped in the binary even though the fix was committed to git. Build 3 (PR #73) was merged to `main` but **never archived or uploaded** — no changelog entry was added (violating the policy), so it silently missed TestFlight. Build 4 supersedes both; all Build 3 features are included here.

### User-Visible Changes

**Bug fix (re-fix)**
- Fixed "column dance_styles.id does not exist" error — the same crash from Build 2. Root cause: the Build 2 archive was built before the fix commit was included. Build 4 archives from the correct HEAD with the fix confirmed in the binary.

**Calendar & filter features (from Build 3 — first TestFlight delivery)**
- Calendar now uses the device's local timezone; "Today" and month boundaries always match the device clock.
- Calendar grid starts on Sunday (matching the web app).
- Selected calendar date shows an accent ring; Today keeps the filled accent circle.
- Calendar filter bar: month-jump picker, Attended-only toggle, Hide-duplicates toggle.
- Events tab: Year, Month, Country, Size, Sort, and Past-events filters in a horizontal scrollable bar.
- Festivals tab: Year, Month, Country, Size filter bar; Recently Added section hidden when filters are active.
- New app icon: crimson gradient, white calendar card, salsa dancer couple silhouette in red header.

### Technical Changes

- `SupabaseService.fetchDanceStyles`: confirmed `select=name,slug,is_active,sort_order` — no `id` column requested.
- `DanceStyle`: `id` remains a computed property (`var id: String { slug }`) — not decoded from JSON.
- `project.yml`: `CURRENT_PROJECT_VERSION` bumped from 2 → 4 (project.yml was stale; Build 3 had only updated `project.pbxproj` directly).
- `project.pbxproj`: regenerated via `xcodegen generate`.
- `AppModel`: festival filter state (`festivalFilterYear/Month/Country/Size`) and calendar filter toggles (`calendarAttendedOnly`, `calendarHideDuplicateAttended`).
- `DateUtils`: all calendar date math uses local timezone.
- `CalendarView`, `CalendarDayCell`: filter bar + visual treatment updates.
- `EventListView`, `FestivalListView`: full filter bar parity with web app.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 4`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` — 11 tests, 3 suites, **TEST SUCCEEDED**.
- Simulator build: `xcodebuild -sdk iphonesimulator -configuration Debug build` — **BUILD SUCCEEDED**.
- Release archive: `xcodebuild -project ios/SalsaEventTracker.xcodeproj -scheme SalsaEventTracker -configuration Release -destination generic/platform=iOS -archivePath /private/tmp/SalsaEventTracker-build4-20260614.xcarchive -allowProvisioningUpdates archive` — **ARCHIVE SUCCEEDED**.
- App Store Connect upload: `xcodebuild -exportArchive -archivePath /private/tmp/SalsaEventTracker-build4-20260614.xcarchive -exportPath /private/tmp/SalsaEventTracker-build4-20260614-upload -exportOptionsPlist ios/ExportOptions-AppStore.plist -allowProvisioningUpdates` — Upload succeeded. Uploaded SalsaEventTracker. **EXPORT SUCCEEDED**.

### Post-Upload Verification (required before declaring done)

- [ ] Open app from TestFlight build — confirm no "dance_styles.id" error on launch.
- [ ] Confirm dance styles appear in any filter picker that references them.
- [ ] Confirm Calendar view shows correct month for today's date.
- [ ] Confirm calendar grid starts on Sunday.
- [ ] Confirm Events tab filter bar shows Year / Month / Country / Size / Sort / Past toggles.
- [ ] Confirm Festivals tab filter bar shows Year / Month / Country / Size toggles.

---

## Build 3 - 2026-06-14 - NOT UPLOADED (policy violation)

Branch: `main` (PR #73)

Status: Merged to main but **never archived or uploaded**. No changelog entry was added at merge time, violating the "document before upload" policy. All Build 3 features are first delivered to TestFlight in Build 4.

### Notes

See Build 4 "User-Visible Changes" for the full feature list. The omission was caught when the TestFlight user (still on Build 2) reported the `dance_styles.id` crash that Build 3 had fixed in code but not shipped.

---

## Build 2 - 2026-06-14 - App Store Connect Upload

Branch: `build-2-2026-06-14` (PR #71)

Status: Uploaded to App Store Connect for TestFlight processing.

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
- Test suite: `xcodebuild test` — 11 tests, 3 suites, **TEST SUCCEEDED**.
- Simulator build: `xcodebuild -project ios/SalsaEventTracker.xcodeproj -scheme SalsaEventTracker -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build` — **BUILD SUCCEEDED**.
- Release archive: `xcodebuild -project ios/SalsaEventTracker.xcodeproj -scheme SalsaEventTracker -configuration Release -destination generic/platform=iOS -archivePath /private/tmp/SalsaEventTracker-build2-20260614.xcarchive -allowProvisioningUpdates archive` — **ARCHIVE SUCCEEDED**.
- App Store Connect upload: `xcodebuild -exportArchive -archivePath /private/tmp/SalsaEventTracker-build2-20260614.xcarchive -exportPath /private/tmp/SalsaEventTracker-build2-20260614-upload -exportOptionsPlist ios/ExportOptions-AppStore.plist -allowProvisioningUpdates` — Upload succeeded. Uploaded SalsaEventTracker. **EXPORT SUCCEEDED**.

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
