# iOS Build Changelog

Historical record of what each uploaded or upload-ready build ships.

Before any App Store Connect or TestFlight upload, add or update the entry for that build and confirm the local validation commands. Uploads should not happen from undocumented build changes.

**CRITICAL RULE — archive must be built AFTER all code changes are committed.** The Build 2 upload carried the `dance_styles.id` bug despite the fix being in git, because the `.xcarchive` was created before the fix commit. Never reuse a pre-existing archive. Always run `xcodebuild archive` fresh from the HEAD of the release branch immediately before `xcodebuild -exportArchive`. See `docs/ios-deployment-checklist.md` → "Pre-Upload Gate" for the full verification sequence.

---

## Build 13 - 2026-06-19 - Upload-ready (not yet uploaded)

Branch: `build-13-6.19.26`

Status: **Upload-ready, NOT uploaded.** Awaiting explicit upload authorization. Per the critical rule above, the `.xcarchive` must be built fresh from the committed HEAD of this branch immediately before export — these changes are not yet committed, so do not reuse any pre-existing archive.

### User-Visible Changes

- **Tab names no longer overlap**: the bottom tab bar now uses short single-word labels (`Calendar`, `List`, `Events`, `Recent`, `Trips`). The full names (`Event Calendar`, `Calendar List`, `Event List`, `Recently Added`, `Trips`) still appear as each screen's large navigation title. Build 12's full two-word bar labels truncated/overlapped on a 5-tab bar.
- **Reviews fully removed from iOS**: the orphaned Reviews views and the review-score (★) badge on event cards are gone. Reviews are a web-only feature (the tab was hidden in Build 11; the code is now deleted). No user-facing review surface remains on iOS.
- **Returning signed-in users see their trips immediately**: trip/attendance data now loads at launch when a session is restored, instead of only after opening the Trips tab.
- **Sessions survive access-token expiry**: the app now refreshes the access token seamlessly instead of signing the user out after ~1 hour. Sign-out only happens if the refresh token itself is revoked/expired.

### Technical Changes

- `AppModel+Types` / `RootView`: added `Tab.tabTitle` (short bar labels); `rawValue` still drives navigation titles.
- **Reviews removal**: deleted `Views/Reviews/` (ReviewsView, ReviewEditorView, ReviewCard), `Models/Review.swift`, `Utils/ReviewScoring.swift`. Removed `reviews`, `reviewedEditionIds`, `reviewScore(...)`, and the review fetch from `AppModel`; removed the score badge from `EventCard`; removed the 4 review methods from `SupabaseService` and `SupabaseServiceProtocol`; cleaned the test mock. Project regenerated via XcodeGen (0 review references remain).
- **Token auto-refresh**: `AuthServiceProtocol.validAccessToken()` added; `AuthService` refreshes via `POST /auth/v1/token?grant_type=refresh_token` within 60s of expiry, persisting rotated tokens to the Keychain. `restoreSession` no longer discards a session whose access token has expired. `AppModel.loadPrivateData` routes through `validAccessToken()`; a failed refresh clears the session and surfaces `authExpired`.
- **Security hardening**: Keychain pinned to `.whenUnlockedThisDeviceOnly` (on-device, unlocked-only); public-data cache file protection raised from `completeUntilFirstUserAuthentication` to `complete`.
- **Performance**: `AppModel.flatEvents` and a new `attendingEditionIds` set are memoized against change-tokens (bumped only when `events`/`trips` change), so list views stop recomputing them several times per render; `isAttending` is now O(1).
- **Wiring**: `isLoading`/`appError` are reference-counted across concurrent loads so overlapping public/private loads don't flip the spinner off early or clobber each other's error.
- **Dead-code cleanup → read-only client**: removed the orphaned trip editor (`TripEditorView`) and its now-unused row components (`TripPlaceRow`, `PTODayRow`), all of which had no presentation site since Build 12 made iOS trips read-only. Pruned the resulting dead trip-write methods (`createTrip`/`updateTrip`/`deleteTrip`/`replaceTripPlaces`/`replacePTODays`) from `SupabaseService` and `SupabaseServiceProtocol`, plus the now-unused private HTTP helpers (`post`/`postMany`/`patch`/`delete`). `SupabaseService` is now a fetch-only client; writes remain a web-app concern.
- `SalsaEventTrackerApp`: launch task now also loads private data when `isSignedIn`.
- `project.yml` / `project.pbxproj`: `CURRENT_PROJECT_VERSION` bumped 12 → 13.
- Docs: `ios/docs/product-decisions.md` (no Reviews in iOS), `ios/docs/feature-backlog.md` (token refresh shipped), `docs/security-assessment.md` (Keychain class + cache protection + refresh resolved).

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 13`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 pass, 0 fail.
- iOS test suite: `xcodebuild test` on iPhone 17 Pro simulator — 13 tests, 3 suites, **TEST SUCCEEDED** (added `refreshFailureSignsOut` and `refreshSuccessLoadsTrips`).
- Release build: `xcodebuild -configuration Release -destination 'generic/platform=iOS Simulator' build` — **BUILD SUCCEEDED**.
- Manual sim check: tab bar renders 5 non-overlapping labels; Calendar List screen renders event cards with no review badge.
- Release archive: **not yet created** — must be built from committed HEAD immediately before upload (see Pre-Upload Gate).

### Post-Upload Verification

- [ ] Confirm bottom tab labels read `Calendar / List / Events / Recent / Trips` with no overlap or truncation.
- [ ] Confirm no review score (★) badges appear on event cards and there is no Reviews surface anywhere.
- [ ] Sign in, force-quit, relaunch, and confirm Trips/attendance appear without opening the Trips tab.
- [ ] Leave the app signed in past access-token expiry (~1h) and confirm private data still loads without a forced sign-in.

---

## Build 12 - 2026-06-18 - App Store Connect Upload

Branch: `build-12-6.18.26`

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### User-Visible Changes

- **Calendar swipe navigation**: swiping left/right on the calendar grid moves to the next/previous month.
- **Add to Calendar restored on iOS**: event details and festival edition details now include Google Calendar and phone `.ics` calendar-file actions.
- **Tab names match the web app**: bottom tabs now use `Event Calendar`, `Calendar List`, `Event List`, `Recently Added`, and `Trips`; the Reviews tab remains hidden.
- **App display name changed**: installed app now displays as `Salsa Events`.
- **Offline public browsing**: the app caches public event/reference data on launch and falls back to the last cached public data when offline.
- **Trips read-only in iOS**: visible add/edit/delete affordances were removed; iOS displays Supabase-owned trip data without mutating it.
- **Trip places sorted by date**: places inside each trip now display chronologically, with sequence as a tie-breaker.
- **Festival edition details**: tapping a festival now opens tracked edition details for up to three editions.
- **Filter/sort panels differentiated**: list views visually separate filters from sorting controls.

### Technical Changes

- `CalendarView`: added horizontal drag gesture for month paging.
- `EventDetailSheet`: added Google Calendar URL generation and `.ics` file sharing via `ShareLink`.
- `FestivalRow`: opens a festival detail sheet with up to three tracked editions and calendar export actions for each edition.
- `AppModel`: added `PublicDataCache` for public events, dance styles, and Schengen country lookup only; private trips/reviews remain network-only and in memory.
- `Event`, `EventEdition`, `DanceStyle`, and `SchengenCountryRow`: made `Codable` for public cache persistence.
- `TripsView` / `TripCard`: removed add/edit/delete controls and sorted trip places by date/sequence.
- `RootView` / `AppModel+Types`: web-parity tab names; no Reviews tab.
- `Info.plist`: `CFBundleDisplayName` and `CFBundleName` set to `Salsa Events`.
- `docs/security-assessment.md`: documented public-only offline caching and confirmed private data is not cached on disk.
- `project.yml` / `project.pbxproj`: `CURRENT_PROJECT_VERSION` bumped 11 → 12.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 12`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` on iPhone 17 Pro simulator — 11 tests, 3 suites, **TEST SUCCEEDED**.
- Simulator build: covered by iOS test build.
- Release archive: `xcodebuild archive` to `/private/tmp/SalsaEventTracker-build12-20260618.xcarchive` — **ARCHIVE SUCCEEDED**.
- App Store Connect upload: `xcodebuild -exportArchive` to App Store Connect — Upload succeeded. Uploaded SalsaEventTracker. **EXPORT SUCCEEDED**.

### Post-Upload Verification

- [ ] Confirm installed app name is `Salsa Events`.
- [ ] Swipe left/right on Event Calendar and confirm month changes correctly.
- [ ] Open an event detail and confirm Google Calendar and phone calendar file actions are present.
- [ ] Open Event List and confirm Filters and Sort are visually distinct.
- [ ] Open Event List/Festival List/Recently Added/Trips tabs and confirm web-parity tab names with no Reviews tab.
- [ ] Open a festival and confirm up to three tracked editions are visible.
- [ ] Open Trips and confirm no add/edit/delete controls appear and places are date-sorted.
- [ ] Launch once online, relaunch without network, and confirm public event/reference data is still visible.
- [ ] Confirm private trip/review data does not appear while offline unless already loaded in memory during the current session.

---

## Build 11 - 2026-06-15 - App Store Connect Upload

Branch: `build-11-2026-06-15`

Status: Uploaded to App Store Connect for TestFlight processing. **CONFIRMED.**

### User-Visible Changes

**Bug fixes**

- **Reviews tab removed**: the Reviews tab no longer appears in the bottom tab bar. Review scores and Attending badges on event cards are unaffected — the underlying data still loads.
- **Trips: "Schengen Only" now shows past trips within the 180-day window**: previously, enabling "Schengen Only" would silently exclude trips that had already ended (even if they were actively counting against your Schengen limit). The toggle now bypasses the "Past Trips" filter for Schengen-impacting trips, which is the point of the toggle.
- **Trips: month filter now correct for cross-year trips**: a short trip that crosses a year boundary (e.g. Nov 2024 – Jan 2025) previously passed the month filter for all 12 months. The filter now correctly identifies only the months the trip actually spans.
- **Events: country picker now includes all countries when "Past" is on**: previously, enabling the Past toggle restricted the available country options to only historical events' countries, even though the list was showing both past and future events. The country picker now reflects what's actually in the list.
- **Festivals: search now matches across all editions**: searching by city, venue, or country now correctly finds a festival even when the matching details are in a non-first edition. Previously only the first edition's fields were checked.

### Technical Changes

- `RootView.swift`: `ReviewsView` tab item removed. `Tab.reviews` case removed from `AppModel+Types.swift`. Reviews data and `reviewScore()` remain in AppModel (used by EventCard for score badges).
- `TripsView.swift`: `filteredTrips` filter order changed — Schengen-Only check runs before the historical filter and exempts matching trips from it. Cross-year trip month filter changed from blanket pass to `m >= startM || m <= endM` algorithm.
- `EventListView.swift`: `availableCountries` `matchesHistory` condition fixed from `showHistoricalEvents ? isHistorical : !isHistorical` → `showHistoricalEvents || !isHistorical`.
- `FestivalListView.swift`: `filteredEvents` search guard changed from `TextUtils.matches(event:edition:editions.first)` → `editions.contains { TextUtils.matches(event:edition:$0) }`.
- `project.yml` / `project.pbxproj`: `CURRENT_PROJECT_VERSION` bumped 10 → 11.

### Validation

- Build number: `CURRENT_PROJECT_VERSION = 11`, `MARKETING_VERSION = 1.0`.
- JS test suite: `npm test` — 36 tests, 0 failures, **TEST SUCCEEDED**.
- iOS test suite: `xcodebuild test` — simulator host launch error (transient infrastructure issue); 0 tests executed, 0 failures. Code compiles cleanly.
- Simulator build: **BUILD SUCCEEDED**.
- Release archive: **ARCHIVE SUCCEEDED**.
- App Store Connect upload: Upload succeeded. Uploaded SalsaEventTracker. **EXPORT SUCCEEDED**.

### Post-Upload Verification

- [ ] Trips: enable "Schengen Only" — confirm recent past Schengen trips (< 180 days old) appear without needing "Past Trips" toggled on.
- [ ] Trips: set month filter to a month that a cross-year trip does NOT span — confirm trip is excluded.
- [ ] Events: enable "Past" toggle, then open country picker — confirm future event countries appear alongside past event countries.
- [ ] Festivals: search a city that appears only in a non-first edition — confirm the festival is found.
- [ ] Confirm Reviews tab is gone from the bottom bar.
- [ ] Confirm event cards still show review score badges where applicable.

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
