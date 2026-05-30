# Kalshi as Data Source Project Scope

## Overview

This project will build a read-only analytics dashboard that treats Kalshi prediction market data as a forward-looking data source for fundamentals research. The product will focus on extracting signals from market prices, implied probabilities, volume, liquidity, contract metadata, and market-resolution rules.

The main question is: can prediction market prices provide useful, timely context for macro fundamentals, company KPIs, and event-driven research before official data, earnings releases, or public announcements arrive?

## Product Thesis

Kalshi markets often encode expectations about measurable future outcomes. For research workflows, those expectations can be useful even when the user has no intent to trade.

The dashboard should help answer questions like:

- What is the market-implied probability of a macro outcome?
- How have expectations changed over the past hour, day, week, or release cycle?
- Which markets are moving unusually relative to their recent history?
- Which company, sector, or economic themes have active prediction markets?
- Are prediction-market expectations diverging from traditional indicators, surveys, sell-side estimates, or official release calendars?

## Research Notes

Current Kalshi API documentation exposes public discovery and market-data endpoints for series, events, markets, trades, orderbooks, candlesticks, live data, structured targets, milestones, multivariate events, and historical data. The relevant first-pass endpoints are:

- `GET /trade-api/v2/series`
- `GET /trade-api/v2/events`
- `GET /trade-api/v2/markets`
- `GET /trade-api/v2/markets/{ticker}`
- `GET /trade-api/v2/markets/{ticker}/orderbook`
- `GET /trade-api/v2/markets/{ticker}/trades`
- `GET /trade-api/v2/markets/{ticker}/candlesticks`
- `GET /trade-api/v2/markets/candlesticks`
- `GET /trade-api/v2/search/tags_by_categories`
- Historical market and candlestick endpoints where supported.

Observed category and tag coverage includes:

- Economics: inflation, Fed, GDP, growth, jobs and economy, housing, global central banks, oil and energy, economic daily markets.
- Financials: companies, KPIs, product launches, markets, IPOs, indices, M&A, CEOs, foreign exchange, matchups, interest rates.
- Companies: CEO changes, layoffs, app rankings, product launches, S&P 500 additions/removals, litigation/regulatory events, and company-specific operating metrics.
- Other useful categories for later expansion: commodities, crypto, climate/weather, politics/elections, science and technology, transportation, world, and sports.

Example series surfaced during exploration included CPI, core PCE, durable goods, industrial production, housing starts, FOMC dissent count, Treasury yield, S&P 500 ranges, IPO comparison markets, Spotify subscribers, Planet Fitness subscribers, Vail Resorts KPI, Coinbase volume, Tesla product-launch questions, OpenAI/Anthropic IPO comparison, company CEO succession, and M&A outcomes.

Sources:

- Kalshi API docs: https://docs.kalshi.com/
- Markets endpoint docs: https://docs.kalshi.com/api-reference/market/get-markets
- Series endpoint docs: https://docs.kalshi.com/api-reference/market/get-series-list
- Category tags endpoint docs: https://docs.kalshi.com/api-reference/search/get-tags-for-series-categories
- Orderbook endpoint docs: https://docs.kalshi.com/api-reference/market/get-market-orderbook

## Scope

The first version should be a research dashboard, not a trading tool. It should ingest Kalshi market data, store snapshots and derived metrics, and provide analyst-friendly views for monitoring and comparing implied probabilities.

### In Scope

- Read-only Kalshi API integration.
- Market, event, and series discovery.
- Price, spread, volume, liquidity, and open-interest tracking.
- Candlestick ingestion where available.
- Optional orderbook snapshots for liquidity and depth analysis.
- Market classification into macro, company, KPI, policy, and event-driven themes.
- Probability, movement, and liquidity analytics.
- Dashboard views for exploration, watchlists, charts, and theme-level summaries.
- Clear separation between raw API fields and derived calculations.

### Out of Scope

- Trading, order placement, order cancellation, or order management.
- Portfolio, balance, positions, fills tied to a user account, funding, or withdrawals.
- Automated trading strategies.
- Investment recommendations.
- User-generated public forecasts in the initial version.

## Recommended Tech Stack

### Application

- **Frontend:** Next.js with React and TypeScript.
- **UI:** Tailwind CSS plus shadcn/ui for tables, filters, cards, dialogs, tabs, and forms.
- **Charts:** Recharts for simple time series and bar charts; consider Plotly only if distribution/curve interactions become more complex.
- **Tables:** TanStack Table for dense market grids, filtering, sorting, pinned columns, and row expansion.
- **State and Fetching:** TanStack Query for client-side cache and refresh behavior.

### Backend

- **API Layer:** Next.js route handlers or a small Fastify service in TypeScript. Start inside Next.js unless ingestion complexity forces a separate service.
- **Ingestion Workers:** Node.js/TypeScript scripts run on a schedule. Use a queue only after polling cadence and failure handling require it.
- **Database:** PostgreSQL as the primary store.
- **Time Series:** TimescaleDB extension if the project begins collecting frequent price/orderbook snapshots. Plain PostgreSQL is fine for the first prototype.
- **ORM/Migrations:** Prisma for schema management and type-safe access.
- **Caching:** Redis only if dashboard query latency or rate limiting becomes a problem. Avoid it in the first version unless needed.

### Development and Deployment

- **Package Manager:** pnpm.
- **Validation:** Zod for API response validation and derived metric inputs.
- **Testing:** Vitest for calculations and ingestion transforms; Playwright for key dashboard flows once the UI exists.
- **Deployment:** Vercel for the dashboard, with a separate scheduled worker if Vercel Cron is too constrained.
- **Secrets:** Environment variables for Kalshi API credentials if authenticated read-only endpoints are used.

## System Architecture

```text
Kalshi API
  -> Ingestion jobs
  -> Raw response validation
  -> PostgreSQL tables
  -> Derived analytics jobs
  -> Next.js API routes
  -> Dashboard views
```

The app should favor durable snapshots over purely live API calls. Kalshi's current market view is useful, but the research value comes from preserving how expectations evolve over time.

## Data Model

The schema should preserve Kalshi's object hierarchy while adding research-specific derived tables.

### Core Entities

```text
series
  ticker
  title
  category
  frequency
  tags
  settlement_sources
  contract_url
  contract_terms_url
  volume
  last_updated_at

events
  event_ticker
  series_ticker
  title
  category
  status
  mutually_exclusive
  expected_expiration_at
  close_at
  settlement_sources
  raw_payload

markets
  ticker
  event_ticker
  series_ticker
  title
  subtitle
  market_type
  strike_type
  status
  yes_sub_title
  no_sub_title
  open_at
  close_at
  expiration_at
  settlement_at
  settlement_value
  rules_primary
  rules_secondary
  custom_strike
  price_level_structure
  raw_payload
```

### Time Series Tables

```text
market_snapshots
  id
  market_ticker
  observed_at
  yes_bid
  yes_ask
  no_bid
  no_ask
  last_price
  previous_price
  midpoint_price
  implied_probability_mid
  bid_ask_spread
  volume
  volume_24h
  open_interest
  liquidity
  notional_value

market_candlesticks
  market_ticker
  period_start_at
  period_end_at
  interval_minutes
  yes_bid_open
  yes_bid_high
  yes_bid_low
  yes_bid_close
  yes_ask_open
  yes_ask_high
  yes_ask_low
  yes_ask_close
  price_open
  price_high
  price_low
  price_close
  price_mean
  volume
  open_interest

orderbook_snapshots
  id
  market_ticker
  observed_at
  best_yes_bid
  best_no_bid
  implied_yes_ask
  implied_no_ask
  spread
  depth_1
  depth_5
  depth_10

orderbook_levels
  snapshot_id
  side
  price
  quantity
  level_index
```

### Research Tables

```text
themes
  id
  slug
  name
  description
  theme_type

market_theme_map
  market_ticker
  theme_id
  confidence
  source

watchlists
  id
  name
  description

watchlist_items
  watchlist_id
  market_ticker
  notes

derived_signals
  id
  market_ticker
  observed_at
  signal_type
  value
  window
  metadata

external_reference_series
  id
  provider
  external_id
  name
  category
  units
  frequency
```

## Derived Metrics

### Price and Probability

- `midpoint_price = (yes_bid + yes_ask) / 2` when both sides exist.
- `implied_probability_mid = midpoint_price` for standard binary markets priced from 0 to 1.
- `spread = yes_ask - yes_bid`.
- `price_change = current_midpoint - prior_midpoint`.
- `probability_change_bps = price_change * 10_000`.
- `normalized_event_probability` for mutually exclusive bucket markets when the sum of midpoints is meaningfully above or below 1.

### Liquidity

- Bid/ask spread by market and by theme.
- Depth at top levels where orderbook data is collected.
- Volume and 24-hour volume trend.
- Open-interest trend.
- Liquidity-adjusted movement score to avoid over-weighting thin markets.

### Movement and Signal Detection

- Largest probability movers by hour/day/week.
- New active markets in tracked themes.
- Markets with abnormal volume or spread compression.
- Markets approaching close or resolution.
- Divergence between related markets, such as CPI month-over-month vs annual inflation, Fed decision probabilities vs Treasury-yield markets, or company KPI markets vs broader equity-index markets.

## Dashboard Views

### Home

A compact overview of tracked themes, major probability moves, high-volume markets, markets nearing resolution, and stale or failed ingestion status.

### Market Explorer

A dense searchable table over series, events, and markets with filters for category, tags, status, close date, volume, liquidity, spread, theme, and market type.

Expected columns:

- Market title.
- Category and tags.
- Current implied probability.
- Change over 1h, 24h, 7d.
- Spread.
- Volume and 24h volume.
- Open interest.
- Close and expected expiration time.
- Rules/source links.

### Macro Dashboard

Focused on Economics and related Financials series:

- Inflation: CPI, core CPI, PCE, used cars, high-inflation markets.
- Rates: Fed decisions, FOMC dissent, Treasury yields, global central banks.
- Growth: GDP, industrial production, durable goods, consumer sentiment.
- Labor: jobs, layoffs, jobless claims if available.
- Housing: housing starts, home value markets.
- Energy: gas, oil, natural gas, jet fuel.

### Company and KPI Dashboard

Focused on company and sector research:

- KPI markets such as subscribers, app rankings, volume, sales, launches, and usage milestones.
- CEO succession and management-change markets.
- M&A, IPO, antitrust, litigation, and regulatory markets.
- Product launch and technology milestone markets.
- Index inclusion/removal and company-specific event markets.

### Market Detail

Each market page should include:

- Current quote and implied probability.
- Historical price/probability chart.
- Volume, open interest, liquidity, and spread charts.
- Contract rules and settlement sources.
- Related markets in the same event and series.
- Theme memberships and user notes.
- Raw Kalshi payload inspection for debugging.

### Theme Detail

Each theme page should roll up related markets into an analyst-friendly view:

- Theme-level probability movers.
- Active and recently closed markets.
- Event calendar.
- Liquidity and coverage summary.
- Cross-market comparisons.

## Ingestion Strategy

Start with scheduled polling. Websocket support can be added later if the dashboard needs lower-latency updates.

### Phase 1 Polling

- Poll `series` daily or when metadata changes.
- Poll `events` every 15-60 minutes.
- Poll active `markets` every 1-5 minutes for tracked categories.
- Poll candlesticks hourly or daily for markets in watchlists.
- Poll orderbooks only for markets shown on detail pages or high-priority themes.

### Phase 2 Improvements

- Add incremental polling with `min_updated_ts` where available.
- Add theme-aware polling frequency so important watchlists update faster.
- Add historical backfills for newly tracked markets.
- Add retry, dead-letter, and ingestion health tables.
- Add websocket ingestion if near-real-time monitoring becomes a core requirement.

## Market Classification

Kalshi categories and tags should be the first classification layer. The app should then add a local theme taxonomy that is more useful for fundamentals analysis.

Initial theme taxonomy:

- `macro.inflation`
- `macro.rates`
- `macro.growth`
- `macro.labor`
- `macro.housing`
- `macro.energy`
- `company.kpi`
- `company.product`
- `company.management`
- `company.ma_ipo`
- `company.regulatory`
- `markets.indices`
- `markets.fx`
- `markets.crypto`
- `policy.elections`
- `policy.courts_regulation`

Classification should start rule-based using category, tags, series titles, and ticker prefixes. Later, add manual overrides and possibly LLM-assisted classification for messy market titles.

## Analytical Workflows

### Macro Release Monitoring

Track markets tied to scheduled economic releases. Compare implied probabilities before and after release windows, then evaluate whether market expectations beat surveys or lag official releases.

### Company KPI Monitoring

Track KPI-style markets for companies such as subscribers, product releases, app rankings, transaction volume, or management changes. Map each market to the closest company, ticker, sector, KPI type, and expected resolution date.

### Event Risk Dashboard

Track policy, regulatory, litigation, FDA, antitrust, CEO, IPO, and M&A markets. These can be useful context for company-specific risk research.

### Cross-Market Comparisons

Compare related markets:

- CPI vs core CPI vs PCE.
- Fed decision markets vs Treasury-yield markets.
- Oil/gas markets vs inflation markets.
- Company product-launch markets vs KPI markets.
- IPO or M&A comparison markets across peer companies.

## Implementation Milestones

1. Confirm Kalshi API access pattern and whether public endpoints are enough for the initial dashboard.
2. Scaffold Next.js, TypeScript, Tailwind, shadcn/ui, Prisma, PostgreSQL, and Vitest.
3. Implement Zod schemas for `series`, `events`, `markets`, and `market_snapshots`.
4. Build ingestion for category tags, series, events, and active markets.
5. Store market snapshots and compute midpoint probability, spread, movement, volume, and liquidity fields.
6. Build the Market Explorer table.
7. Build Market Detail charts from snapshots and candlesticks.
8. Add the Macro Dashboard for inflation, rates, growth, labor, housing, and energy.
9. Add the Company/KPI Dashboard for KPIs, IPOs, M&A, CEOs, product launches, and regulatory events.
10. Add watchlists, theme pages, and ingestion-health monitoring.
11. Add external data joins for FRED, SEC/company data, earnings calendars, or analyst estimates.

## Open Questions

- Which Kalshi endpoints require authentication for reliable read-only use in production?
- Are historical candlesticks available at the cadence needed for backtesting market-implied signals?
- How should thinly traded markets be weighted or filtered?
- Should sports be excluded entirely from early scope, or used as a high-liquidity test bed for market mechanics?
- What is the right first external comparison dataset: FRED, earnings/KPI data, SEC filings, or market prices?
- Should the dashboard include user accounts/watchlists early, or start as a single-user local research tool?
