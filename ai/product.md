# Product Brief

## Goal

Salsa Festivals Tracker helps dancers discover, compare, and plan around salsa, bachata, mambo, and Latin dance festivals.

## Primary Users

- Traveling social dancers choosing events by date and location.
- Festival attendees checking official links, venues, and schedule context.
- The app owner tracking personal trips, reviews, attendance, and Schengen impact.
- Future organizers or helpers submitting event updates for review.

## Core Workflows

- Browse public festivals by calendar month.
- Search and filter public event editions by name, city, country, date, size, and style.
- Open official website, ticket, Instagram, Facebook, and calendar links.
- Sign in to view owner/private trips and reviews.
- Review data-quality reports and update public event data through controlled workflows.

## Product Direction

This is a frontend-first app with a real backend. Cloudflare Pages is the preferred target host, GitHub Pages is the current/fallback host, and Supabase is the core data and auth layer.

## Not Now

- Do not replace Supabase with static JSON or Google Sheets as the main data source.
- Do not add another backend unless a specific product need justifies it.
- Do not build a social network, marketplace, or ticketing platform before the discovery and owner-planning workflows are excellent.
- Do not redesign the entire app in one pass.
