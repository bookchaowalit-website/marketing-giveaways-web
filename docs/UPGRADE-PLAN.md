# Upgrade plan

## Current state

Score: 7/10 (was 5/10) — working local ticket rack with create/search/re-stamp/remove, CI and unit tests; still no e2e coverage.

## Backlog

- P1: Add a Playwright smoke test (add entry, search, re-stamp, remove) once a browser runner is available in CI.
- P2: Export/import the local rack as JSON so entries survive a browser reset.
- P2: Self-host the display fonts to avoid a Google Fonts fetch at build time.

## Done in this pass

- CI (`.github/workflows/ci.yml`): `npm ci`, lint, typecheck, vitest, `next build`.
- Fixed lint errors in `app/api/mcp/route.ts`; the endpoint now uses a typed JSON-RPC handler (`lib/mcp.ts`) with proper error codes and an honest `get_app_info` tool.
- `/more-projects` renders from `lib/related-projects.ts` (was 978 lines of hand-unrolled links plus an unused copy of the data) and no longer links to itself.
- Entry logic extracted to `lib/entries.ts` with validation of stored data; entries can now be re-stamped (Open/Draft/Closed), completing the README's CRUD claim.
- The ticket is a real `<form>` (Enter submits, `required`, length limits); removed the stale `app/page.tsx.backup`.

## Done in this pass (pass 2)

- Canonical host is config-driven: `lib/site.ts` resolves `NEXT_PUBLIC_SITE_URL` (validated, clear error on a non-http(s) value) and feeds `metadataBase`, generated `app/sitemap.ts` / `app/robots.ts` and the MCP `get_app_info` URL; removed the stale template `public/sitemap.xml` / `robots.txt` (they pointed at `bookchaowalit.com` and a `*.vercel.app` name that differs from the project URL). Tested in `lib/site.test.ts`.

## Done in this pass (pass 3)
- Edge-case pass on `lib/entries.ts` (regression tests in `lib/entries.test.ts`):
  - Stored entries only checked `typeof createdAt === "number"`; a value such
    as `1e20` passed and `new Date(...).toISOString()` in the rack threw a
    RangeError, crashing the page on load. Timestamps must now be in Date range.
  - Repeated ids in storage were kept (duplicate React keys); a leading BOM
    made the saved list unreadable.
  - Invisible-only titles were accepted; clipping could cut an emoji in half.
  - Header counter read "01 TICKETS"; now "01 TICKET" (`ticketCount`).
