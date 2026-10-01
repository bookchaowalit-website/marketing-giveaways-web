# Giveaways

Simple giveaway entries.

## Features
- Add, re-stamp (Open/Draft/Closed) and remove entries
- Search by title, details or status
- localStorage persistence (validated on load)

## Limitations
- Local only

## Run
```bash
npm ci
npm run dev
```

## Checks
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI runs the same four checks on every push (`.github/workflows/ci.yml`).

## Honesty
Portfolio demo. Not multi-tenant SaaS. Prefer local-only state over fake production claims.

## Configuration

- `NEXT_PUBLIC_SITE_URL` (optional): canonical origin used for metadata, `/sitemap.xml`, `/robots.txt` and the MCP app info. Defaults to `https://giveaways.bookchaowalit.com`; must be an absolute http(s) URL.
