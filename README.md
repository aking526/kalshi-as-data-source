# Kalshi as Data Source

Read-only Kalshi prediction-market analytics prototype for fundamentals research.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The app proxies read-only Kalshi endpoints through Next.js route handlers and falls back to clearly marked sample data when live requests fail or hit rate limits.
