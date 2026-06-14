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

## Pre-launch Supabase security checklist (REQUIRED — do before first real use)

These are one-time manual steps in the Supabase dashboard. None require code changes. **Do not skip.**

### 1. Disable public signups
Supabase Dashboard → Authentication → Providers → Email → toggle **"Enable Email Signups"** OFF.

Smoke test — must return `{"code":422,...}` or similar error, never `200`:
```bash
curl -X POST "https://gikiqligsfldjfrwllsa.supabase.co/auth/v1/signup" \
  -H "apikey: sb_publishable_cEHlxpSG8Zl0Q2DxGIpwpw_9EdPcHS-" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'
```

### 2. Disable schema introspection
Supabase Dashboard → Settings → API → toggle **"Enable Schema Introspection"** (also "Expose schema") OFF.

Verify: `GET /rest/v1/` with only the anon key should return an empty object or 401, not an OpenAPI schema.

### 3. Verify RLS and anon role on private tables
Run both commands — each must return `[]` (empty array). If either returns rows, RLS is misconfigured and private data is exposed to anyone with the anon key:

```bash
curl "https://gikiqligsfldjfrwllsa.supabase.co/rest/v1/personal_trips?select=*" \
  -H "apikey: sb_publishable_cEHlxpSG8Zl0Q2DxGIpwpw_9EdPcHS-"

curl "https://gikiqligsfldjfrwllsa.supabase.co/rest/v1/reviews?select=*" \
  -H "apikey: sb_publishable_cEHlxpSG8Zl0Q2DxGIpwpw_9EdPcHS-"
```

If rows are returned: go to Supabase Dashboard → Table Editor → confirm RLS is ON for `personal_trips`, `personal_trip_places`, `personal_pto_days`, and `reviews`. Also run in the SQL editor:
```sql
REVOKE ALL ON personal_trips FROM anon;
REVOKE ALL ON personal_trip_places FROM anon;
REVOKE ALL ON personal_pto_days FROM anon;
REVOKE ALL ON reviews FROM anon;
```

### 4. Set auth rate limits
Supabase Dashboard → Authentication → Rate Limits:
- Email sign-ins per hour: **5**
- Token refresh per hour: **30**

### 5. Enable opaque auth errors
Supabase Dashboard → Authentication → Settings → enable **"Obscure email-based errors"**.
This prevents an attacker from enumerating valid email addresses via different error messages.
