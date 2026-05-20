# Useful Prompts

Use these prompts when asking Codex or Claude to work on the repo.

## Scope A Task

```text
Scope this issue against the current repo. Identify the smallest PR-sized slices, likely files, acceptance criteria, tests, and out-of-scope items.
```

## Implement A Section

```text
Implement the section described in docs/task-handoff.md. Keep changes incremental, preserve Supabase as source of truth, and run the relevant checks.
```

## Frontend Refactor

```text
Extract a reusable frontend primitive from web/app.js without changing behavior. Prefer a small module under web/ and focused tests if logic is non-trivial.
```

## Mobile UX

```text
Improve this mobile view for 375px width. Check long event names, missing fields, many filters, and auth-gated states. Preserve the current data flow.
```

## Deployment

```text
Update deployment docs for Cloudflare Pages. Include current GitHub Pages fallback, Supabase redirect settings, service worker risks, and verification steps.
```
