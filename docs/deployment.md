# Deployment

## Current Production/Fallback

GitHub Pages currently serves from the repository root. The root `index.html` redirects visitors into `web/`, and `404.html` redirects GitHub Pages misses into `/salsa-event-tracker/web/`.

Current GitHub Pages style:

```text
https://bernsync.github.io/salsa-event-tracker/web/
```

## Preferred Target

Cloudflare Pages should become the preferred production host after verification. GitHub Pages should remain live as fallback during the migration.

Target shape:

```text
Cloudflare Pages frontend
+ Supabase database/auth
+ GitHub Actions for audits and reviewed data updates
```

## Cloudflare Pages Setup Checklist

- Connect the Cloudflare Pages project to the GitHub repository.
- Use `main` as the production branch.
- Decide whether Cloudflare serves the repository root or `web/`.
- If serving `web/`, verify whether the root redirect is still needed for Cloudflare.
- If serving root, verify the redirect lands in the app correctly.
- Configure preview deployments for branches/PRs.
- Verify `web/index.html` CSP still allows Supabase.
- Verify `web/manifest.json` loads.
- Verify `web/sw.js` caches only the intended same-origin app assets.
- Verify public Supabase reads.
- Verify auth-gated trips and reviews after Supabase redirect settings are updated.
- Keep GitHub Pages as fallback until Cloudflare production is stable.

## Supabase Auth Checklist

When Cloudflare URLs are known, update Supabase auth settings as needed:

- Site URL.
- Additional redirect URLs.
- Any localhost development redirect URL still needed for testing.
- Any Cloudflare preview URL policy, if previews need auth.

Also update `web/supabase-config.js` if the frontend redirect URL changes.

## Rollback

If Cloudflare deployment fails, keep the GitHub Pages URL available and avoid removing the root GitHub Pages redirects until Cloudflare has been verified.
