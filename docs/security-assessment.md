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
- Private trip/review data appears to live in memory only. No `UserDefaults`, `FileManager`, or on-disk cache usage was found in the iOS app source.
- No `print`, `NSLog`, or `Logger` usage was found in the iOS app source, so tokens and private data are not currently being written to device logs.
- `Info.plist` has no `NSAppTransportSecurity` exceptions, so App Transport Security remains enabled. Supabase is called over HTTPS.
- The only third-party iOS package is KeychainAccess 4.2.2, pinned in `Package.resolved`.

### Required follow-up

1. **Set explicit Keychain accessibility.** `AuthService` uses the KeychainAccess default accessibility. Before broad TestFlight or App Store use, set and document the intended class explicitly, preferably a device-local option such as `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` unless background auth refresh requires a different class. Priority: **medium**.

2. **Decide whether refresh tokens should be used or removed.** The app stores the refresh token but currently treats expired access tokens by clearing the session and forcing sign-in. That is safe but may be confusing. Either implement Supabase token refresh with the same Keychain protections or stop storing unused refresh tokens. Priority: **low/medium**.

3. **Keep private data out of offline caches.** If offline iOS support is added later, private trips, PTO days, reviews, and Schengen calculations need a separate storage/security review, including file protection, backup exclusion, and user-visible data reset. Priority: **required before offline private-data caching**.

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

## 11. Near-Term Security Checklist

Before the next production/security review, verify:

- Supabase public signups are disabled unless intentionally launching public accounts.
- Login, sign-up, token refresh, and password reset rate limits are configured.
- Opaque auth errors are enabled.
- RLS smoke tests pass for all private tables.
- GitHub Pages/Cloudflare Pages serve HTTPS only.
- Cloudflare production uses TLS 1.2 minimum or higher.
- CSP still matches the exact external services in use.
- Service worker cache does not include auth-gated API responses.
- iOS Keychain token storage uses an explicit accessibility class.
- iOS still has no ATS exceptions, private on-disk cache, or sensitive logging.
- No service-role key, database password, helper password, or long-lived auth token exists in repo files.
- Any custom domain has documented SPF/DKIM/DMARC and DNSSEC decisions.
