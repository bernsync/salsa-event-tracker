# Salsa Festivals Tracker

A low-cost tracker for salsa festivals. The current practical version is a browser app in `web/` backed by Supabase.

## Current MVP

- Calendar tab for festivals by month
- Event list with search
- Festival detail pages with website, Instagram, and Facebook links
- Supabase-backed public event data
- Supabase-backed dance style taxonomy
- Supabase-backed Schengen country status
- Private reviews behind login

## Cost-Saving Approach

This version uses GitHub Pages for free hosting and Supabase for the small amount of structured data. Supabase should remain on the free tier for this app's expected data volume.

## Data Source Rule

Supabase is the source of truth for durable app data. Do not add new hardcoded local lists or seed-style datasets for production features. New data-backed features should use Supabase tables first, with local files reserved for UI code and cleanup helpers.

See `DATA_ACCESS.md` for public/authenticated/owner data rules and `DATA_UPDATE_WORKFLOW.md` for remote update and automation options.

## Development Notes

Default new JavaScript functionality to small modules instead of adding more logic to `web/app.js`. Keep `app.js` focused on rendering, state coordination, and event wiring; put reusable formatting, parsing, link generation, API helpers, and other isolated behavior in dedicated files under `web/`, with focused tests when the behavior is non-trivial.

## How To Open

Either open `web/index.html` in a browser, or run this from the `web` folder:

```powershell
node server.js
```

Then open `http://127.0.0.1:8000`.

If you prefer Python, run this from the `web` folder instead:

```powershell
python -m http.server 8000
```

## Checks And Reports

Run the lightweight syntax and unit checks with:

```powershell
npm.cmd run check
npm.cmd test
```

Use `npm.cmd run data-quality` with Supabase environment variables set to write `audit/data-quality-report.md` and `audit/data-quality-report.json`.

The weekly event-edition refresh workflow writes `audit/event-edition-refresh.json`; review that artifact directly when you need to inspect candidates.

## GitHub Pages

This project includes a root `index.html` that redirects to the app in `web/`, so GitHub Pages can publish from the repository root.

In GitHub:

1. Create a repository.
2. Upload or push this project folder.
3. Go to Settings -> Pages.
4. Set Source to `Deploy from a branch`.
5. Select branch `main` and folder `/root`.
6. Save.

Your app will be available at `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`.

## Likely Next Features

- CSV import and export
- Better calendar grouping by week/month
- Country and date filters
- Website text parser for semi-manual event import
- Community reviews after the private tracker is useful
