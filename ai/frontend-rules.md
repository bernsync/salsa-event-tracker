# Frontend Rules

- Build mobile-first and verify narrow screens.
- Keep app behavior incremental; avoid broad rewrites.
- Prefer small modules under `web/` for reusable logic.
- Keep `web/app.js` focused on rendering coordination, state, and event wiring.
- Add focused tests for non-trivial parsing, mapping, date, link, or calculation logic.
- Preserve Supabase as the durable data source.
- Do not add production hardcoded event lists.
- Keep Cloudflare Pages as the preferred target host and GitHub Pages as fallback until migration is complete.
- Be careful with service worker cache changes.
- Be careful with auth redirect changes.
- Preserve accessibility basics: labels, keyboard behavior, focus states, contrast, and non-overlapping mobile UI.
- Use existing visual language unless a task explicitly asks to redesign a surface.
- Prefer reusable card, filter, modal, empty-state, and action patterns over one-off markup.
