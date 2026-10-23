# Giveaways

A browser-only list of giveaway entries ("tickets"): add a prize or campaign with how-to-enter details and a status,
search the rack, re-stamp the status and remove tickets. It is a local CRUD demo: there is no entry collection from
other people, no random winner draw and no results page.

Live: https://giveaways.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does

- Add tickets with a title (80 characters), details (400) and status Open / Draft / Closed.
- Search by title, details or status; change a ticket's status; remove it.
- Tickets are stored in `localStorage` and validated on load (bad JSON, unknown statuses, impossible dates dropped).

## What it does not do

- No public entry form, no weighted or random winner selection, no referral entries, no results page, no account.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: entry rules, MCP handler + route, site/robots/sitemap, home render, Sentry scrubbing
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Configuration

- `NEXT_PUBLIC_SITE_URL` (optional): canonical origin for metadata, `/sitemap.xml`, `/robots.txt` and the MCP app
  info. Defaults to `https://giveaways.bookchaowalit.com`; must be an absolute http(s) URL.
- `NEXT_PUBLIC_SENTRY_DSN` (optional): turns on error reporting; unset means Sentry is off.

## Code map

- `lib/entries.ts`: sample ticket, create/clip/search rules and stored-entry parsing (used by the page).
- `lib/mcp.ts` + `app/api/mcp/route.ts`: JSON-RPC endpoint with one `get_app_info` tool (static app descriptor; the
  tickets live only in the visitor's browser, so there is nothing else to serve).
- `lib/site.ts`: canonical URL, robots and sitemap.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped.
- `lib/related-projects.ts` + `app/more-projects/page.tsx`: portfolio link page (copied per repository, not a package).
