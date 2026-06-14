# Salsa Event Tracker iOS — Engineering Standards

> Read before making any change to `ios/`. These rules apply permanently.

## File size limits

| Layer | Soft limit | Hard limit | Action |
|---|---|---|---|
| View (root) | 250 lines | 400 lines | Extract sub-views or split by concern |
| Service | 300 lines | 500 lines | Split by sub-domain (auth vs. data) |
| AppModel | 300 lines | 500 lines | Extract extension files (see below) |
| Model | 100 lines | 200 lines | Split if domains are distinct |
| Utility | 80 lines | 150 lines | Split if unrelated helpers accumulate |

## AppModel

`AppModel.swift` starts as a single file. When it exceeds the hard limit, extract extensions:

| Extension file | Domain |
|---|---|
| `AppModel+Types.swift` | All enums, structs, and type aliases (`Tab`, `EventSortOption`, `AppError`) |
| `AppModel+Auth.swift` | Auth callbacks, sign-in/sign-out, token-expiry recovery |
| `AppModel+Data.swift` | Public and private data loading from Supabase |
| `AppModel+Filters.swift` | Derived computed properties, sort, filter |

Rules:
- Stored properties and `init` stay in `AppModel.swift`.
- `AppModel+Types.swift` is extracted from day one — do not define `enum` or support types inline in `AppModel.swift`.
- Never put `UserDefaults`, `Keychain`, or networking logic directly in `AppModel.swift`; delegate to services.

## Service layer

- Every service used by `AppModel` must have a protocol counterpart (`SupabaseServiceProtocol`, `AuthServiceProtocol`).
- Services must not import `SwiftUI`. Only `Foundation`, `KeychainAccess`, `URLSession`.
- `SupabaseConfig.swift` is the only file that contains the Supabase URL and anon key.
- Auth tokens live only in the Keychain (via `KeychainAccess`). Never in `UserDefaults`, logs, or printed strings.
- Never log auth tokens, user IDs, or private row content at any log level.

## Model layer

- Models are pure `Codable` + `Identifiable` structs. No `@Observable`, no business logic.
- `ReviewCategory` enum belongs in `Review.swift`. All other support enums belong in `AppModel+Types.swift`.

## Testing

- Utility functions with branching logic must be unit tested: `SchengenCalculator.daysUsed`, `TextUtils.matches`, `ReviewScoring.totalScore`, `DateUtils.calendarGrid`.
- `AppModel` loading logic must be tested against mock services. No real network calls in tests.
- Test file: `SalsaEventTrackerTests/AppModelTests.swift`.

## Adding a feature — checklist

- [ ] Which `AppModel` property or extension does the feature's state belong in?
- [ ] Does any new service need a protocol counterpart before injection?
- [ ] Does any new view file have a clear size budget?
- [ ] Are there new `Decodable` fields? Update model struct and `CodingKeys`.
- [ ] Does the feature add new auth-gated views? Verify `model.isSignedIn` check is in place.
- [ ] After implementation: does any file exceed its hard limit?

## Pre-commit checklist

- [ ] Does any modified file exceed its hard limit?
- [ ] Are auth tokens, user IDs, or private data referenced in any `print()` or log statement?
- [ ] Does any new service skip its protocol counterpart?
- [ ] Does any new `enum` or support type live inline in `AppModel.swift` instead of `AppModel+Types.swift`?
- [ ] Does any new view exceed 250 lines without extracting sub-views?
