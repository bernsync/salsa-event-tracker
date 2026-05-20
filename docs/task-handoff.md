# Task Handoff

Use this template when starting a new section of roadmap work.

## Task Template

```md
## Goal

What user/product outcome should this change deliver?

## Likely Files

- path/to/file

## Acceptance Criteria

- Observable result 1.
- Observable result 2.
- Mobile behavior is checked when UI changes.
- Supabase access rules are preserved when data changes.

## Out Of Scope

- Explicitly list tempting follow-up work that should not be included.

## Checks

- npm.cmd run check
- npm.cmd test
- Manual browser check, if UI or deployment behavior changes.
```

## Default Rules

- Keep changes PR-sized.
- Prefer incremental improvements over whole-app rewrites.
- Preserve Supabase as source of truth.
- Do not add production static datasets.
- Do not add backend services without a specific product need.
- Preserve GitHub Pages fallback until Cloudflare migration is complete.
- Update docs when architecture, deployment, data access, or task workflow changes.

## Common Sections

### Docs And AI Context

Add or refine `ai/` and `docs/` files. Keep README concise and link to deeper docs.

### Cloudflare Pages Migration

Document and verify hosting, redirects, service worker scope, CSP, Supabase auth redirects, and rollback path.

### Frontend Primitive Extraction

Extract reusable modules from `web/app.js` only where behavior can be preserved and reviewed.

### Mobile UX Polish

Improve layout, card hierarchy, filters, empty/loading states, and auth-gated views on small screens.

### Supabase-Native Product Work

Start with data access classification. Confirm table, owner/access level, read/write rules, and whether personal travel or review data is involved.
