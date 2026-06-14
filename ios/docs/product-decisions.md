# Product Decisions

Stable decisions that should not be re-litigated without discussion.

| Decision | Rationale |
|---|---|
| No third-party Supabase Swift SDK | REST API is simple; URLSession + JSONDecoder keeps the dependency graph small |
| `@Observable` throughout (no `ObservableObject`) | iOS 17+ target; `@Observable` gives per-property tracking |
| No SwiftData / CoreData | All data is fetched fresh on launch from Supabase; caching adds complexity |
| `KeychainAccess` for token storage | System Keychain is the only acceptable storage for auth tokens |
| No sign-up flow in the app | The app is personal/owner-only; signups are disabled in the Supabase dashboard |
| Tab bar with 5 tabs mirrors web | Maintains mental model parity with the web app |
| Trips/Reviews auth-gated via `ContentUnavailableView` | Clear, native, zero-engineering sign-in prompt |
