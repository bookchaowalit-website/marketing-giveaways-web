# Giveaways — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `giveaways`, evidence Live→Prototype: entry
> collection, weighted random winner selection, referral entries and a public results page were removed) on 2026-10-23.

## What it is

A client-only CRUD list of giveaway tickets, footed "NO DRAW ENGINE / CRUD DEMO".

## Who it is for

A portfolio visitor looking at a bold, small form-and-list UI; at most a note-keeping aid for someone planning a
giveaway.

## What works today

1. One sample ticket ("Sticker pack"); add tickets with a title (≤ 80), details (≤ 400) and status Open, Draft or
   Closed. A blank title is rejected; blank details become "No details".
2. Search by title, details or status; re-stamp a ticket's status; remove it. A status line reports each action.
3. Tickets persist in `localStorage` and are validated on load.
4. `/api/mcp` answers JSON-RPC (`initialize`, `ping`, `tools/list`, `tools/call`) with one honest `get_app_info` tool;
   unknown tools and methods return JSON-RPC errors.
5. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No entry collection from participants, no random or weighted winner draw, no referral entries, no results page.
- No account, sharing or sync; clearing site data deletes the tickets.

## Live URL and deploy state

- Live: https://giveaways.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-giveaways-frontend` is deployed by CLI only. Its Git link names the old repository
  (`bookchaowalit/bookchaowalit-giveaways-frontend`), so a push to `main` does not deploy. The last production deploy
  is the CVE patch (2026-10-23 12:20, CLI, commit 613a01f); later commits (tests, Sentry, the hydration fix) stay
  undeployed until the owner reconnects Vercel Git to this repository (owner action D9).
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `marketing-giveaways-web`, org
  `personal-yu0`); it takes effect on the next deploy.

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route. No server storage, no personal data collected.
