# Roadmap

## Immediate

- Add AI context and repo documentation.
- Document Cloudflare Pages as preferred hosting and GitHub Pages as fallback.
- Keep Supabase documented as the core data/auth layer.
- Split large frontend work into PR-sized tasks.

## Cloudflare Migration

- Create Cloudflare Pages project.
- Verify root vs `web/` output choice.
- Verify Supabase reads and auth redirects.
- Verify service worker and manifest behavior.
- Keep GitHub Pages live until Cloudflare is stable.

## Frontend

- Extract reusable event-card, empty-state, action/link, filter, and modal primitives where low-risk.
- Improve mobile event-card hierarchy.
- Improve toolbar and filter wrapping.
- Add clearer loading, empty, signed-out, and error states.

## Product

- Improve saved/attended event workflows.
- Improve personal trip and Schengen planning ergonomics.
- Improve private reviews.
- Add admin-friendly public event update workflows.
- Consider organizer submissions and moderation after access rules are defined.

## Later

- Custom domain.
- Community-facing reviews, if access model and moderation are clear.
- Organizer dashboard, if submissions become frequent enough.
- Additional backend services only if Supabase cannot cover the use case cleanly.
