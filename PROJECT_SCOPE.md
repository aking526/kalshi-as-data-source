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

The first version should be a research dashboard, not a trading tool. For the prototype, it should query Kalshi directly, transform API responses at request/render time, and provide analyst-friendly views for monitoring and comparing implied probabilities without operating a database.

### In Scope

- Read-only Kalshi API integration.
- Market, event, and series discovery.
- Price, spread, volume, liquidity, and open-interest tracking.
- Candlestick reads where available.
- Optional orderbook reads for liquidity and depth analysis.
- Market classification into macro, company, KPI, policy, and event-driven themes.
- Probability, movement, and liquidity analytics.
- Dashboard views for exploration, charts, and theme-level summaries.
- Clear separation between raw API fields and derived calculations.

### Out of Scope

- Trading, order placement, order cancellation, or order management.
- Portfolio, balance, positions, fills tied to a user account, funding, or withdrawals.
- Automated trading strategies.
- Investment recommendations.
- User-generated public forecasts in the initial version.
- Persistent storage, scheduled ingestion jobs, account systems, or backend-managed watchlists in the prototype.

## Recommended Tech Stack

### Application

- **Frontend:** Next.js with React and TypeScript.
- **UI:** Tailwind CSS plus shadcn/ui for tables, filters, cards, dialogs, tabs, and forms.
- **Charts:** Recharts for simple time series and bar charts; consider Plotly only if distribution/curve interactions become more complex.
- **Tables:** TanStack Table for dense market grids, filtering, sorting, pinned columns, and row expansion.
- **State and Fetching:** TanStack Query for client-side cache and refresh behavior.

### Backend

- **API Layer:** Next.js route handlers that proxy read-only Kalshi requests, normalize responses, and keep any API credentials server-side if needed.
- **Data Access:** Direct calls to Kalshi endpoints on page load, user search, filter changes, and chart requests.
- **Runtime Validation:** Zod schemas for Kalshi responses and derived metric inputs.
- **Caching:** Use framework/request-level caching where appropriate. Avoid Redis or any separate cache service in the prototype.
- **Persistence:** None for the prototype. Browser `localStorage` can be used only for UI preferences or a personal watchlist.

### Development and Deployment

- **Package Manager:** pnpm.
- **Validation:** Zod for API response validation and derived metric inputs.
- **Testing:** Vitest for calculations and API transforms; Playwright for key dashboard flows once the UI exists.
- **Deployment:** Vercel for the dashboard.
- **Secrets:** Environment variables for Kalshi API credentials if authenticated read-only endpoints are used.

## System Architecture

```text
Kalshi API
  -> Next.js route handlers
  -> Response validation and normalization
  -> Request-time derived metrics
  -> Dashboard views
  -> Optional browser localStorage for UI preferences/watchlists
```

The prototype should favor simplicity: use Kalshi's current market data and available candlestick endpoints instead of maintaining its own historical store. The limitation is that the app only sees history Kalshi provides at query time; durable internal history can be added later if the concept proves useful.

## Runtime Data Shapes

The prototype does not need database tables. It should use TypeScript types and Zod schemas that preserve Kalshi's object hierarchy while adding request-time derived fields for dashboard display.

### Core API Shapes

```ts
type Series = {
  ticker: string;
  title: string;
  category?: string;
  frequency?: string;
  tags: string[];
  settlement_sources?: Array<{ name: string; url?: string }>;
  contract_url?: string;
  contract_terms_url?: string;
  volume?: number;
  last_updated_at?: string;
}

type Event = {
  event_ticker: string;
  series_ticker?: string;
  title: string;
  category?: string;
  status?: string;
  mutually_exclusive?: boolean;
  expected_expiration_at?: string;
  close_at?: string;
  settlement_sources?: Array<{ name: string; url?: string }>;
}

type Market = {
  ticker: string;
  event_ticker: string;
  series_ticker?: string;
  title: string;
  subtitle?: string;
  market_type?: string;
  strike_type?: string;
  status: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  open_at?: string;
  close_at?: string;
  expiration_at?: string;
  settlement_at?: string;
  settlement_value?: string;
  rules_primary?: string;
  rules_secondary?: string;
  custom_strike?: Record<string, unknown>;
  price_level_structure?: string;
}
```

### Derived Dashboard Shapes

```ts
type MarketQuote = {
  market_ticker: string;
  observed_at: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  previous_price?: number;
  midpoint_price?: number;
  implied_probability_mid?: number;
  bid_ask_spread?: number;
  volume?: number;
  volume_24h?: number;
  open_interest?: number;
  liquidity?: number;
  notional_value?: number;
}

type MarketCandlestick = {
  market_ticker: string;
  period_start_at: string;
  period_end_at: string;
  interval_minutes: number;
  yes_bid_open?: number;
  yes_bid_high?: number;
  yes_bid_low?: number;
  yes_bid_close?: number;
  yes_ask_open?: number;
  yes_ask_high?: number;
  yes_ask_low?: number;
  yes_ask_close?: number;
  price_open?: number;
  price_high?: number;
  price_low?: number;
  price_close?: number;
  price_mean?: number;
  volume?: number;
  open_interest?: number;
}

type OrderbookSummary = {
  market_ticker: string;
  observed_at: string;
  best_yes_bid?: number;
  best_no_bid?: number;
  implied_yes_ask?: number;
  implied_no_ask?: number;
  spread?: number;
  depth_1?: number;
  depth_5?: number;
  depth_10?: number;
}

type OrderbookLevel = {
  side: "yes" | "no";
  price: number;
  quantity: number;
  level_index: number;
}

type Theme = {
  slug: string;
  name: string;
  description: string;
  theme_type: "macro" | "company" | "markets" | "policy";
}

type ClassifiedMarket = Market & {
  themes: Theme[];
  classification_confidence: number;
  derived_quote?: MarketQuote;
}
```

## Derived Metrics

### Price and Probability

- `midpoint_price = (yes_bid + yes_ask) / 2` when both sides exist.
- `implied_probability_mid = midpoint_price` for standard binary markets priced from 0 to 1.
- `spread = yes_ask - yes_bid`.
- `price_change = current_midpoint - prior_midpoint` when prior data is available from Kalshi fields or candlesticks.
- `probability_change_bps = price_change * 10_000`.
- `normalized_event_probability` for mutually exclusive bucket markets when the sum of midpoints is meaningfully above or below 1.

### Liquidity

- Bid/ask spread by market and by theme.
- Depth at top levels where orderbook data is collected.
- Volume and 24-hour volume trend.
- Open-interest trend.
- Liquidity-adjusted movement score to avoid over-weighting thin markets.

### Movement and Signal Detection

- Largest probability movers by hour/day/week when Kalshi candlestick or previous-price fields provide the comparison window.
- New active markets in tracked themes.
- Markets with abnormal volume or spread compression.
- Markets approaching close or resolution.
- Divergence between related markets, such as CPI month-over-month vs annual inflation, Fed decision probabilities vs Treasury-yield markets, or company KPI markets vs broader equity-index markets.

## Dashboard Views

### Home

A compact overview of tracked themes, major probability moves, high-volume markets, markets nearing resolution, and Kalshi API request health.

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
- Theme memberships and optional browser-local notes/watchlist state.
- Raw Kalshi payload inspection for debugging.

### Theme Detail

Each theme page should roll up related markets into an analyst-friendly view:

- Theme-level probability movers.
- Active and recently closed markets.
- Event calendar.
- Liquidity and coverage summary.
- Cross-market comparisons.

## Prototype Data Strategy

Start with direct read-through API requests. The prototype should avoid scheduled ingestion, database migrations, queues, and persistent backend services.

### Phase 1 Live Reads

- Fetch `series` and category tags when the app loads or when filters need them.
- Fetch `events` and active `markets` in response to category, theme, search, and status filters.
- Fetch market detail, candlesticks, trades, and orderbook data only when the user opens a market detail view.
- Use TanStack Query cache settings to avoid refetching identical requests too aggressively during a session.
- Use browser `localStorage` only for personal UI preferences, saved filters, or a lightweight watchlist.

### Prototype Limitations

- No internal historical record beyond what Kalshi returns from current market fields and candlestick endpoints.
- No server-side watchlists or collaboration.
- No durable audit trail of raw API responses.
- No custom backtesting dataset until persistent storage is introduced.
- Dashboard refresh behavior depends on user sessions and frontend/API caching, not background jobs.

### Later Persistent Data Phase

If the prototype shows value, add persistent storage later for:

- Durable market snapshots.
- Backtesting and release-window studies.
- Long-running watchlists.
- Joins to FRED, SEC filings, earnings calendars, company KPI datasets, or market data.
- Ingestion health monitoring and replayable transformations.

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
2. Scaffold Next.js, TypeScript, Tailwind, shadcn/ui, TanStack Query, TanStack Table, Recharts, and Vitest.
3. Implement Zod schemas for `series`, `events`, `markets`, quotes, candlesticks, and orderbook responses.
4. Build read-only API route handlers for category tags, series, events, active markets, market detail, candlesticks, and orderbooks.
5. Compute midpoint probability, spread, movement, volume, and liquidity fields at request/render time.
6. Build the Market Explorer table.
7. Build Market Detail charts from Kalshi current market fields and candlesticks.
8. Add the Macro Dashboard for inflation, rates, growth, labor, housing, and energy.
9. Add the Company/KPI Dashboard for KPIs, IPOs, M&A, CEOs, product launches, and regulatory events.
10. Add browser-local watchlists, theme pages, and API-health indicators.
11. Decide whether the next phase needs persistent storage for backtesting, joins to FRED/SEC/company data, or long-running watchlists.

## Open Questions

- Which Kalshi endpoints require authentication for reliable read-only use in production?
- Are historical candlesticks available at the cadence needed for backtesting market-implied signals?
- How should thinly traded markets be weighted or filtered?
- Should sports be excluded entirely from early scope, or used as a high-liquidity test bed for market mechanics?
- What is the right first external comparison dataset: FRED, earnings/KPI data, SEC filings, or market prices?
- Should watchlists stay browser-local, or does the next phase need user accounts and server-side persistence?
