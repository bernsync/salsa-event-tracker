# Prior Edition Backfill

Supabase tracks edition rows separately from festival rows. If an event card says there is no tracked prior edition, that means the older edition is missing from Supabase, not that the festival has no history.

Use this file as the reviewed source queue for backfilling older editions. Add rows to `public.event_editions` only after checking an official source: official website, official Facebook event/page, official Instagram post, or official ticketing page. Do not use Salsa Vida as an official source.

When a backfill SQL file has been run, it can be deleted. Keep this file as the ongoing queue of still-missing prior editions.

## Backfill Priority

These festivals have a 2026 edition in Supabase but do not currently have an older tracked edition row:

| Festival | 2026 edition tracked | Official source priority | Status |
| --- | --- | --- | --- |
| Agozar | Dec 18-20, 2026 | Facebook page and Instagram | Needs prior edition row |
| Amsterdam International Salsa Marathon | Oct 16-18, 2026 | International Salsa Festival website/Facebook | Needs prior edition row |
| Baila New York | Jun 19-22, 2026 | Instagram and ticketing page | Needs prior edition row |
| Brussels Mambo Weekend | Sep 4-7, 2026 | Facebook event/page and Weezevent | Backfilled in Supabase for 2025 |
| Brussels Salsa Marathon | Dec 4-7, 2026 | Instagram/Facebook | Needs prior edition row |
| Chocolate Mambo Marathon | Jun 26-28, 2026 | Official website/Instagram | Needs prior edition row |
| Cologne Salsa Congress | May 22-24, 2026 | Official website/Instagram/Facebook | Needs prior edition row |
| Croatia Summer Salsa Festival | Jun 8-15, 2026 | Official website/Instagram/Facebook | Needs prior edition row |
| Dance Marathon Germany | Jul 31-Aug 3, 2026 | Official website/Instagram | Needs prior edition row |
| El Sol | Nov 12-16, 2026 | Official website/Facebook/Instagram | Needs prior edition row |
| Empire Sensual Movement | Jul 31-Aug 3, 2026 | ESM NYC website/Instagram | Needs prior edition row |
| Jeju Latin Culture Festival | Jun 18-22, 2026 | Official website/Instagram | Needs prior edition row |
| London Salsa Marathon | Jul 23-27, 2026 | Official website/Facebook/Instagram | Backfilled in Supabase for 2025 |
| Mambo y Nada Mas | May 29-31, 2026 | The Dance House website/Facebook | Needs prior edition row |
| Perfectly Mambo | Aug 21-23, 2026 | Official website/Instagram | Needs prior edition row |
| Pink Marathon | Oct 23-25, 2026 | Instagram and ticketing page | Needs prior edition row |
| Salsa King Festival | Sep 16-20, 2026 | Official website/Instagram/Facebook | Needs prior edition row |
| Salsa Spring Festival | May 21-24, 2026 | Official website/Instagram | Needs prior edition row |
| Smyrna Mambo Getaway | May 21-24, 2026 | Official website/Instagram/Facebook | Needs prior edition row |
| Vilnius Salsa Festival | May 14-18, 2026 | Official website/Facebook/Instagram | Needs prior edition row |
| Vivaz | Jul 16-19, 2026 | Agozar Events website/Instagram | Needs prior edition row |

## Field Rules

- Store festival-level fields in `public.events`: `name`, `organizer`, `website`, `instagram`, `facebook`, `visibility`.
- Store edition-level fields in `public.event_editions`: `start_date`, `end_date`, `city`, `country`, `venue`, `tickets`, `price`, `currency`, `djs`, `artists`, `event_size`, `travel`, `notes`, `added_on`, `visibility`.
- Leave unknown fields null instead of copying values from another year.
- If an official page gives only dates and location, backfill dates/location and keep the rest null.
- If a source is a Facebook event, include the URL in the ticket/source notes when possible.
