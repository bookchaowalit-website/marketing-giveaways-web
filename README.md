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
