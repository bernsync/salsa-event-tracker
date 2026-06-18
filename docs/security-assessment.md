# Salsa Event Tracker Security Assessment

> Last updated: 2026-06-18. This assessment maps the current web, Supabase, automation, and iOS architecture against the security and operations controls raised in the review. Items are marked as current posture, required pre-launch verification, or future launch gates.

---

## 1. Current Architecture

Salsa Event Tracker is not a purely local app. It has a static browser app in `web/`, Supabase-backed data/auth, reviewed data-update scripts, GitHub Pages hosting today, a planned Cloudflare Pages migration, and an iOS client that talks to Supabase.

Supabase currently owns the sensitive backend surface:

- Public reference data: events, event editions, dance styles, and Schengen country lookup.
- Private owner-scoped data: trips, trip places, PTO days, and reviews.
- Auth: email/password sign-in through Supabase Auth.
- Authorization: row-level security (RLS) and `app_user_roles`.

The frontend uses a publishable Supabase key in `web/supabase-config.js`. That is expected. Service-role keys, database passwords, and long-lived helper tokens must never be committed or shipped to the browser or iOS app.

---

## 2. Authentication, Abuse Controls, and RLS

### What is already documented

`SUPABASE.md`, `DATA_ACCESS.md`, and `ios/docs/engineering-standards.md` already define the most important backend rules:

- Disable public signups before real use.
- Verify RLS blocks anonymous reads of private trip/review tables.
- Keep service-role credentials out of frontend and iOS code.
- Use separate helper accounts and remove or downgrade temporary admin access.
- Obscure email-based auth errors to reduce account enumeration.
- Set Supabase auth rate limits.

### Required controls

1. **Rate limit login.** Supabase Auth sign-in must be rate limited. The current engineering checklist calls for 5 email sign-ins per hour; verify this in the Supabase dashboard before broad use. Priority: **required before real private data use**.

2. **Rate limit sign-up.** Public signups are expected to be disabled for the current owner/helper model. If public signups are enabled later, apply Supabase sign-up limits, CAPTCHA or equivalent bot defense where appropriate, email verification, and abuse alerts. Priority: **required before public accounts**.

3. **Rate limit password reset and email flows.** A password-forgotten flow is not visible in the current browser UI, but Supabase supports recovery emails. If enabled, rate limit reset requests, use generic success/error copy, restrict redirect URLs, and audit delivery. Priority: **required before exposing password reset**.

4. **Email verification.** With public signups disabled, broad email verification is less relevant today. If users can self-register, require email verification before private features or write access. Priority: **required before public signups**.

5. **RLS smoke tests.** For every release that changes private tables or auth flows, verify signed-out users cannot read `reviews`, `trips`, `personal_trips`, `personal_trip_places`, or `personal_pto_days`; verify non-owner users cannot read, update, or delete another user's rows; verify the publishable key cannot mutate public event tables. Priority: **required for auth/data changes**.

---

## 3. CSRF, Sessions, and Browser Surface

The current browser app calls Supabase directly with bearer tokens and the publishable key. It does not appear to use a custom cookie-authenticated backend, so traditional CSRF protection is not currently applicable.

CSRF becomes required if any future backend, Supabase Edge Function, admin panel, or server-rendered page uses cookies for authentication. At that point, every state-changing route must validate a CSRF token and use secure, HTTP-only, same-site cookies.

The current CSP in `web/index.html` is a strong baseline: scripts and styles are self-only, Supabase is the only external `connect-src`, `object-src` is disabled, and `frame-ancestors` is denied. Recheck the CSP whenever Cloudflare Pages, preview deployments, analytics, fonts, maps, or payment scripts are added.

---

## 4. DNS, Email, HTTPS, and TLS

### Current posture

The current production/fallback URL is GitHub Pages under `https://bernsync.github.io/salsa-event-tracker/web/`. Cloudflare Pages is the preferred target host after verification. Supabase endpoints already use HTTPS.

### Required controls before custom production domains or email

1. **Enforce HTTPS.** Cloudflare Pages and GitHub Pages should serve the app over HTTPS only. On Cloudflare, set Always Use HTTPS or equivalent redirect/rewrite rules and reject plain HTTP in production. Priority: **required before Cloudflare production cutover**.

2. **Set minimum TLS version.** Configure Cloudflare's minimum TLS version to at least TLS 1.2; prefer TLS 1.3 where supported. Priority: **required before Cloudflare production cutover**.

3. **Enable HSTS deliberately.** Enable HSTS only after the production domain, redirects, Supabase auth redirects, and rollback plan are stable. Priority: **recommended after Cloudflare verification**.

4. **Configure SPF, DKIM, and DMARC.** If the project sends email from a custom domain for auth, support, or announcements, configure SPF, DKIM, and DMARC with the mail provider. Start DMARC in monitoring mode, then tighten once delivery is verified. Priority: **required before sending mail from a project domain**.

5. **Enable DNSSEC.** If using a custom domain with a DNS provider that supports DNSSEC, enable it and document the registrar/DNS owner. Priority: **recommended before custom-domain launch**.

---

## 5. Admin Routes, Backups, and Honeypots

The app currently has no custom `/admin`, `/backup`, or hosted data-export route. Administrative access is through Supabase and reviewed scripts/workflows, which is the right place for it.

Do not add live-data routes at obvious paths such as `/admin`, `/backup`, `/exports`, or predictable object-storage prefixes. If honeypot routes are added later, they must be disconnected from real data and should feed alerts into traffic/security instrumentation.

Private export scripts such as `scripts/export-private-data.mjs` must continue to run locally or in tightly controlled workflows with helper credentials supplied through environment variables, never committed files.

---

## 6. Traffic Tracking, Instrumentation, and Incident Visibility

The project needs more explicit production instrumentation before it has broader users or public accounts.

Required before wider release:

1. **Cloudflare analytics/security events.** Capture high-level traffic, WAF/security events, TLS mode, redirects, and unusual path probes. Do not log sensitive query strings or tokens.

2. **Supabase Auth and PostgREST monitoring.** Review failed login spikes, password recovery attempts, 401/403 patterns, RLS denials, and unexpected write attempts with the publishable key.

3. **GitHub Actions audit trail.** Keep data-update workflows reviewed and issue/PR-driven. Service-role or helper credentials should be GitHub secrets only, scoped narrowly, and rotated after helper access ends.

4. **Privacy-preserving logs.** Logs must not contain passwords, refresh/access tokens, full private trip itineraries, private notes, review drafts, or visa-day calculations.

---

## 7. Hosting, Ports, SSH, and Runner Hardening

The production web app is static, so there is no app-owned production server to SSH into today. The local `web/server.js` binds only to `127.0.0.1:8000`, which is appropriate for development.

If the Mini PC/self-hosted runner plan or any app-managed host goes live, the following are required:

- SSH key-only access; disable password authentication and root login.
- Firewall deny-by-default; open only the ports required by the runner/service.
- Keep the runner untrusted relative to production secrets unless absolutely necessary.
- Scope GitHub runner labels so unrelated workflows cannot land on the machine.
- Patch the OS/runtime regularly and document ownership.
- Rotate SSH keys and GitHub/Supabase tokens after helper access or suspected exposure.

---

## 8. Caching and Service Worker Strategy

The service worker should cache only same-origin static app assets. It must not cache Supabase API responses that include private trips, reviews, PTO, auth responses, access tokens, refresh tokens, or user-specific derived data.

The iOS app now keeps a device-local cache of public/reference data only: events, event editions, dance styles, and Schengen country lookup. The cache is written under Application Support, excluded from device backups, and protected with `completeUntilFirstUserAuthentication`. This is low risk because the cached data is intentionally public; private trips and reviews are still not cached on disk.

Before expanding offline support, document:

- Which public resources are cacheable.
- TTL and invalidation behavior for event/reference data.
- Whether any private data can be cached on disk in web or iOS clients.
- How users can clear local cached private state.

Default stance: cache public festival/reference data only; do not persist auth-gated private travel/review data outside Supabase unless there is a separate security review.

---

## 9. iOS Client Security

The iOS app has a separate security posture from the browser app because it stores auth state locally and talks directly to Supabase. A targeted code pass covered `SupabaseConfig.swift`, `AuthService.swift`, `SupabaseService.swift`, `AppModel.swift`, `Info.plist`, `ios/project.yml`, and the resolved Swift package pins.

### Current posture

- The Supabase URL and publishable anon key are hardcoded in `SupabaseConfig.swift`. This is acceptable because the key is public by design; RLS must remain the real authorization boundary.
- Access and refresh tokens are stored with KeychainAccess, not `UserDefaults`, files, or SQLite.
- Signing out clears the Keychain and in-memory private trips/reviews.
- Public event/reference data is cached on disk for offline browsing and refreshes on launch when the network is available.
- Private trip/review data appears to live in memory only. No private `UserDefaults`, `FileManager`, or on-disk cache usage was found in the iOS app source.
- No `print`, `NSLog`, or `Logger` usage was found in the iOS app source, so tokens and private data are not currently being written to device logs.
- `Info.plist` has no `NSAppTransportSecurity` exceptions, so App Transport Security remains enabled. Supabase is called over HTTPS.
- The only third-party iOS package is KeychainAccess 4.2.2, pinned in `Package.resolved`.

### Required follow-up

1. **Set explicit Keychain accessibility.** `AuthService` uses the KeychainAccess default accessibility. Before broad TestFlight or App Store use, set and document the intended class explicitly, preferably a device-local option such as `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` unless background auth refresh requires a different class. Priority: **medium**.

2. **Decide whether refresh tokens should be used or removed.** The app stores the refresh token but currently treats expired access tokens by clearing the session and forcing sign-in. That is safe but may be confusing. Either implement Supabase token refresh with the same Keychain protections or stop storing unused refresh tokens. Priority: **low/medium**.

3. **Keep private data out of offline caches.** Offline support currently covers public/reference data only. If private iOS offline support is added later, private trips, PTO days, reviews, and Schengen calculations need a separate storage/security review, including file protection, backup exclusion, and user-visible data reset. Priority: **required before offline private-data caching**.

4. **Use generic production errors for private API failures.** `SupabaseService` currently includes response bodies in thrown errors, and `AppModel` can surface those details in load errors. That is useful during development but should be mapped to generic user-facing messages in production so database/policy details are not exposed unnecessarily. Priority: **low/medium**.

5. **Preserve ATS defaults.** Do not add `NSAppTransportSecurity` exceptions to work around networking problems. If an exception is ever proposed, treat it as a security review item. Priority: **required for every iOS release**.

---

## 10. Payments, Taxes, and Business Operations

There is no Stripe or payment integration in the current app. Before adding paid features, subscriptions, ticket affiliate revenue, or international payments, create an operations plan covering:

- Sales tax, VAT/GST, and international tax obligations.
- Terms of service, privacy policy, refund policy, and support ownership.
- Stripe webhook security, idempotency, signature verification, and replay handling.
- Accounting reconciliation, chargebacks, receipts, and data retention.
- Regional legal and regulatory requirements for travel-related user data.

This is not just a product task; it is a release gate for any monetized version.

---


## 11. Canonical Security Audit & Hardening Checklist

This is the release-blocking checklist for Salsa Event Tracker. Status reflects source review on 2026-06-18; Supabase dashboard policy review, cross-user testing, and deployed-header verification still require manual execution against the live project.

### Priority 1 — Verify data access controls

**Supabase RLS must be reviewed for every table.** Current repo docs classify these known tables: `events`, `event_editions`, `dance_styles`, `schengen_countries`, `reviews`, `personal_trips`, `personal_trip_places`, `personal_pto_days`, `app_user_roles`, and legacy/current `trips`. Public reference tables may be readable by anonymous users; owner/private tables must require RLS ownership or explicit `owner`/`admin` app roles.

**Tables and feature areas from the full checklist:**

- `users` / `profiles`: no custom profile table is present in the repo. Supabase `auth.users` must remain inaccessible from anon/client queries; any future profile table needs RLS before launch.
- `reviews`: present and owner-scoped. Verify create/update/delete policies prevent cross-user edits and deletes.
- `favorites`: not present today. If added, treat as owner data unless explicitly made public.
- RSVPs / attendance: private attendance is currently inferred from trip places. The sharing plan requires a narrow `shared_event_attendance` table before exposing attendance to other users.
- photos / uploads: not present today. If added, storage buckets need RLS/storage policies, file type validation, object ownership, size limits, and abuse controls.
- moderation / admin tables: no custom admin UI route exists. `app_user_roles` must be audited so only authorized owner/admin users can grant or use privileged access.
- notifications: not present today. If added, tokens/preferences are private owner data and must not be readable by other users.
- future user-generated content tables: default to owner-scoped or explicitly moderated access until a separate RLS review says otherwise.

**Cross-user authorization tests are required before launch or any auth/RLS change.** Test while logged out, as User A, and as User B. Verify one user cannot edit/delete another user's review, modify another user's profile or private trip data, upload content for another user, read private data, or perform admin actions without an admin role.

### Priority 2 — Review API security

There are no app-owned `/api/*` routes in the current source. The live API surface is Supabase Auth plus Supabase PostgREST calls from `web/api.js` and the iOS `SupabaseService`.

For the current architecture, API review means verifying Supabase RLS, app-role checks, and service-role workflows. If Supabase Edge Functions or custom `/api/*` endpoints are added later, each endpoint must enforce authentication, derive user identity server-side, verify ownership/admin permissions server-side, and reject expired or missing credentials. Frontend checks must only control UI visibility, never authorization.

Unauthenticated/expired/different-user API calls must be tested against every private read/write operation. Expected result: unauthorized requests are rejected and do not leak private rows or policy details.

### Priority 3 — Secrets and environment variables

Only publishable Supabase keys may appear in browser or iOS client code. Current expected public locations are `web/supabase-config.js` and `ios/SalsaEventTracker/Services/SupabaseConfig.swift`.

Service-role keys must remain server-side only. Current GitHub workflows reference `SUPABASE_SERVICE_ROLE_KEY` through GitHub Actions secrets for reviewed data update jobs; the literal key must never appear in repository files, frontend bundles, browser network responses, iOS build artifacts, uploaded audit artifacts, or logs.

Before release, run a secret scan for at least: `key`, `secret`, `token`, `apikey`, `service_role`, `sk_`, and JWT-looking `eyJ` values. Rotate any accidentally exposed credential immediately.

### Priority 4 — Session security

The web app currently stores Supabase access/refresh tokens in `localStorage` through `web/auth-session.js`. That is simple, but it is weaker than secure HTTP-only cookies because any XSS can read localStorage. For the current owner/helper static app model, this risk must be explicitly accepted and controlled through CSP, minimal dependencies, no inline script expansion, and short-lived sessions.

If the product expands to public users or higher-risk private data, move browser sessions behind a backend or Supabase-supported flow that can use secure HTTP-only cookies. Logout must continue to clear local browser state. The iOS app stores tokens in Keychain and still needs an explicit accessibility class as noted in Section 9.

### Priority 5 — Rate limiting and abuse prevention

Supabase Auth rate limits must cover login, signup, token refresh, password reset, and magic links if enabled. Public signup is expected to remain disabled for the current model.

User-action rate limits are required before adding public/community writes: review creation, review editing, photo uploads, RSVPs/attendance updates, comments, and search endpoints. Prefer user-based limits for signed-in actions, IP-based limits for anonymous endpoints, and CAPTCHA or step-up verification for suspicious activity.

### Priority 6 — Security headers

`web/index.html` currently includes a strong CSP meta tag. Deployed response headers still need verification for `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Strict-Transport-Security`.

GitHub Pages has limited custom-header support, so the Cloudflare Pages migration should define these as deployment headers or rules. HSTS should only be enabled after the production domain, redirects, Supabase auth redirects, and rollback plan are stable.

### Priority 7 — Frontend trust validation

UI controls are not security controls. Patterns such as hiding a delete button for non-admin users are acceptable only as convenience. Backend enforcement must come from Supabase RLS/app-role policies or future server-side endpoint checks.

Review any use of `user.isAdmin`, app roles, or owner checks to confirm the same permission is enforced at the data/API layer. This is especially important for reviews, private trips, shared attendance, role management, and any future moderation/admin workflow.

### Priority 8 — Public data exposure review

While logged out, browse the app, inspect browser network traffic, and inspect Supabase responses. Public responses must not expose emails, private user IDs beyond unavoidable row ownership where explicitly intended, user metadata, admin fields, hidden moderation fields, private trip details, PTO/visa calculations, or review data.

Public event/reference data is expected to remain visible. Any field added to public tables should be reviewed before it is shipped because anonymous users can read those rows by design.

### Priority 9 — Automated security checks

Current CI runs syntax checks and unit tests only. Dedicated security scanning is not yet added.

Add CI/CD coverage for:

- Secret scanning: Gitleaks or TruffleHog.
- Dependency vulnerability scanning: Dependabot and/or npm audit review.
- Basic security linting: CodeQL or equivalent JavaScript analysis.
- Periodic endpoint/RLS smoke testing against a safe Supabase test project or controlled live test users.

Recommended GitHub tooling: TruffleHog, Gitleaks, Dependabot, and CodeQL. Treat security scanner failures as release blockers unless reviewed and explicitly waived.

---

## 12. Definition of Done

The Salsa security checklist is done only when all of the following are true:

- All Supabase tables have RLS enabled unless they are intentionally public read-only reference tables.
- All private/user-generated tables have read/write policies for every operation they support.
- Cross-user authorization testing is complete for logged-out, User A, User B, and admin/non-admin cases.
- Authorization is verified server-side through RLS, app-role policies, or future backend endpoint checks.
- No service-role key, database password, helper password, Stripe key, or long-lived auth token is exposed in repo files, frontend bundles, browser responses, iOS artifacts, logs, or uploaded artifacts.
- Unauthenticated requests cannot read private data or perform private writes.
- Rate limiting is enabled for auth flows and any public/community write actions.
- Security headers are configured and verified in the deployed environment.
- Frontend-only permission checks have matching backend/RLS enforcement.
- Logged-out network inspection shows only intentionally public event/reference data.
- Automated secret, dependency, lint, and endpoint/RLS checks are added to CI/CD or tracked as explicit release blockers.

---

## 13. Near-Term Security Checklist

Before the next production/security review, verify:

- Supabase public signups are disabled unless intentionally launching public accounts.
- Login, sign-up, token refresh, password reset, and magic-link rate limits are configured.
- Opaque auth errors are enabled.
- RLS smoke tests pass for public, owner, private, and app-role tables.
- Cross-user tests pass for logged-out, User A, User B, and admin/non-admin scenarios.
- Direct Supabase/PostgREST calls reject anonymous, expired-token, and wrong-user attempts on private operations.
- GitHub Pages/Cloudflare Pages serve HTTPS only.
- Cloudflare production uses TLS 1.2 minimum or higher.
- Deployed response headers include CSP, frame protection, content-type protection, referrer policy, and HSTS when the domain is ready.
- CSP still matches the exact external services in use.
- Service worker cache does not include auth-gated API responses.
- iOS public-data cache contains only intentionally public/reference rows and remains excluded from backup.
- Browser session-token storage risk is accepted for the static owner/helper model or replaced with secure HTTP-only cookies before public-user expansion.
- iOS Keychain token storage uses an explicit accessibility class.
- iOS still has no ATS exceptions, private on-disk cache, or sensitive logging.
- Secret scanning confirms no service-role key, database password, helper password, Stripe key, or long-lived auth token exists in repo files or artifacts.
- Dedicated security automation is added: Gitleaks or TruffleHog, Dependabot/dependency review, CodeQL or equivalent, and endpoint/RLS smoke tests.
- Any custom domain has documented SPF/DKIM/DMARC and DNSSEC decisions.
