# Salsa Festivals Tracker

A low-cost tracker for salsa festivals in Europe. The current practical version is a browser app in `web/` because it can run on Windows without a Mac or Xcode.

## Current MVP

- Calendar tab for festivals by month
- Event list with search
- Festival detail pages with website, Instagram, and Facebook links
- Manual event creation and editing
- Local personal reviews with category scores
- Browser localStorage persistence
- Sample festivals to make first launch less empty

## Cost-Saving Approach

This version has no backend, no login, and no paid scraping service. Data lives locally in your browser.

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

The earlier native iOS prototype is still included in `SalsaFestivalsTracker.xcodeproj`, but it requires a Mac with Xcode 15 or newer.

## Likely Next Features

- CSV import and export
- Better calendar grouping by week/month
- Country and date filters
- Website text parser for semi-manual event import
- iCloud sync with CloudKit
- Community reviews after the private tracker is useful
