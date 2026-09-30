# Upgrade plan

## Current state

Score: 7/10 (was 5/10) — working local ticket rack with create/search/re-stamp/remove, CI and unit tests; still no e2e coverage.

## Backlog

- P1: Add a Playwright smoke test (add entry, search, re-stamp, remove) once a browser runner is available in CI.
- P1: Replace `public/sitemap.xml` / `robots.txt` hosts with the real deployment host once confirmed.
- P2: Export/import the local rack as JSON so entries survive a browser reset.
- P2: Self-host the display fonts to avoid a Google Fonts fetch at build time.

## Done in this pass

- CI (`.github/workflows/ci.yml`): `npm ci`, lint, typecheck, vitest, `next build`.
- Fixed lint errors in `app/api/mcp/route.ts`; the endpoint now uses a typed JSON-RPC handler (`lib/mcp.ts`) with proper error codes and an honest `get_app_info` tool.
- `/more-projects` renders from `lib/related-projects.ts` (was 978 lines of hand-unrolled links plus an unused copy of the data) and no longer links to itself.
- Entry logic extracted to `lib/entries.ts` with validation of stored data; entries can now be re-stamped (Open/Draft/Closed), completing the README's CRUD claim.
- The ticket is a real `<form>` (Enter submits, `required`, length limits); removed the stale `app/page.tsx.backup`.
