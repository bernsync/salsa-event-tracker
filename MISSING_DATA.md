# Missing Event Data

This file replaces the old in-app Data Gaps tab. It is intentionally kept in the repo so the published app stays clean while source-data cleanup remains easy to track in GitHub.

Scope: 2025 and 2026 editions only. 2027 editions are intentionally excluded until most events publish reliable information.

When updating data:
- Put stable fields such as website, Instagram, Facebook, and organizer in `web/event-links.js` under `window.eventLinks`.
- Put edition-specific fields such as venue, ticket link, price, DJs, artists, event size, travel planning, and notes in `web/event-links.js` under `window.eventEditionDetails`.
- Do not copy venues, DJs, prices, ticket links, or travel details across editions unless the exact edition source confirms it.
- Do not use Salsa Vida as an official source.

Event size values:
- `small`: under 200 people
- `medium`: 200-500 people
- `large`: 500-999 people
- `extra large`: 1000+ people

## Summary

- 2025/2026 editions tracked: 63
- Fully filled by current tracked fields: 4
- Records still missing at least one tracked field: 59
- Most common missing fields: event size, travel planning, price, DJs/artists, Facebook

## Missing Fields By Edition

| Date | Event | Missing |
| --- | --- | --- |
| 2026-12-18 | Agozar | Website, venue, ticket link, price, DJs/artists, event size, travel planning |
| 2025-10-02 | Porto Salsa Weekend | Venue, ticket link, price, DJs/artists, event size, travel planning |
| 2025-11-08 | Beats Passion Mambo | Venue, ticket link, price, DJs/artists, event size, travel planning |
| 2026-12-27 | Hamburg Salsa Marathon | Venue, ticket link, price, DJs/artists, event size, travel planning |
| 2026-09-04 | Brussels Mambo Weekend | Instagram, price, DJs/artists, event size, travel planning |
| 2026-10-16 | Amsterdam International Salsa Marathon | Ticket link, price, DJs/artists, event size, travel planning |
| 2026-10-23 | Pink Marathon | Facebook, price, DJs/artists, event size, travel planning |
| 2025-05-29 | Mambo Italiano | Price, DJs/artists, event size, travel planning |
| 2025-11-21 | Transilvania Salsa Fest | Venue, DJs/artists, event size, travel planning |
| 2026-02-05 | Live 2 Mambo: Novotel | Ticket link, price, DJs/artists, event size |
| 2026-02-09 | Live 2 Mambo: Carnival Days | Ticket link, price, DJs/artists, event size |
| 2026-02-12 | Live 2 Mambo: New York Palace | Ticket link, price, DJs/artists, event size |
| 2026-05-29 | Mambo y Nada Mas | Price, DJs/artists, event size, travel planning |
| 2026-06-18 | Jeju Latin Culture Festival | Facebook, price, event size, travel planning |
| 2026-06-19 | Baila New York | Facebook, price, event size, travel planning |
| 2026-06-26 | Chocolate Mambo Marathon | Instagram, Facebook, event size, travel planning |
| 2026-07-31 | Empire Sensual Movement | Facebook, DJs/artists, event size, travel planning |
| 2026-08-21 | Perfectly Mambo | Facebook, DJs/artists, event size, travel planning |
| 2025-01-30 | Live 2 Mambo: Novotel | Ticket link, price, event size |
| 2025-02-03 | Live 2 Mambo: Carnival Days | Ticket link, price, event size |
| 2025-02-06 | Live 2 Mambo: New York Palace | Ticket link, price, event size |
| 2025-08-22 | Hamburg Salsa Weekend | Facebook, event size, travel planning |
| 2025-09-25 | Prague Salsa Marathon | Price, event size, travel planning |
| 2025-10-16 | Back 2 Mambo | Price, DJs/artists, event size |
| 2026-03-13 | Addicted to Salsa Festival | Facebook, event size, travel planning |
| 2026-03-27 | Mambo Italiano | DJs/artists, event size, travel planning |
| 2026-04-17 | Bucharest Salsa Revolution | Price, event size, travel planning |
| 2026-04-24 | Zagreb Salsa Marathon | Price, event size, travel planning |
| 2026-05-21 | Salsa Spring Festival | Facebook, event size, travel planning |
| 2026-05-22 | Cologne Salsa Congress | Facebook, event size, travel planning |
| 2026-07-16 | Vivaz | Facebook, event size, travel planning |
| 2026-07-24 | Hamburg Salsa Weekend | Facebook, event size, travel planning |
| 2026-07-31 | Dance Marathon Germany | Facebook, event size, travel planning |
| 2026-09-18 | Paris Salsa Marathon | Price, event size, travel planning |
| 2026-10-02 | Porto Salsa Weekend | DJs/artists, event size, travel planning |
| 2026-10-16 | Back 2 Mambo | DJs/artists, event size, travel planning |
| 2026-11-06 | Beats Passion Mambo | Price, event size, travel planning |
| 2026-11-12 | El Sol | DJs/artists, event size, travel planning |
| 2026-12-04 | Brussels Salsa Marathon | Facebook, event size, travel planning |
| 2025-03-21 | Amsterdam Salsa Weekend | Price, DJs/artists |
| 2025-03-28 | Bucharest Salsa Revolution | Event size, travel planning |
| 2025-05-02 | 5Star Congress | Event size, travel planning |
| 2025-07-25 | The Dance Hub | Event size, travel planning |
| 2025-08-28 | Berlin Salsa Congress | Price, DJs/artists |
| 2025-09-11 | SalsaRave by CoBeatParty | Price, DJs/artists |
| 2025-09-19 | Paris Salsa Marathon | Event size, travel planning |
| 2025-11-27 | Salsa Grand | Price, DJs/artists |
| 2025-12-27 | Hamburg Salsa Marathon | Event size, travel planning |
| 2026-01-15 | Magic Slovenian Salsa Festival | Event size, travel planning |
| 2026-03-20 | Amsterdam Salsa Weekend | Price, DJs/artists |
| 2026-05-01 | 5Star Congress | Event size, travel planning |
| 2026-05-14 | Vilnius Salsa Festival | Event size, travel planning |
| 2026-07-23 | London Salsa Marathon | Event size, travel planning |
| 2026-08-13 | The Dance Hub | Price, DJs/artists |
| 2026-08-27 | Berlin Salsa Congress | Event size, travel planning |
| 2026-09-10 | SalsaRave by CoBeatParty | Price, DJs/artists |
| 2026-11-27 | Salsa Grand | Price, travel planning |
| 2026-06-08 | Croatia Summer Salsa Festival | Price |
| 2026-09-24 | Prague Salsa Marathon | Price |
