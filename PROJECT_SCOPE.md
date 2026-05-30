# Kalshi as Data Source Project Scope

## Overview

This project will explore how prediction market data from Kalshi can be used as a structured data source for fundamentals analysis. The core idea is to treat market prices, implied probabilities, volume, and contract metadata as live signals about expectations for macroeconomic outcomes, company KPIs, policy events, and other measurable future states.

The initial product will be a read-only web app dashboard that pulls data from the Kalshi API, organizes it into analyst-friendly views, and layers analysis on top of the raw market data.

## Goals

- Build a dashboard for browsing and analyzing Kalshi markets as forward-looking data signals.
- Convert market prices into implied probabilities and comparable time series.
- Track changes in expectations across macro, company, policy, and event-driven markets.
- Surface relationships between prediction market signals and traditional fundamentals.
- Keep the integration read-only: no trading, order placement, account management, or position management.

## Core Dashboard Areas

### Market Explorer

A searchable interface for Kalshi events, markets, categories, and contracts. Users should be able to filter by topic, status, close date, liquidity, volume, and relevance to specific macro or company-level themes.

### Implied Probability Views

Market prices will be translated into implied probabilities so users can compare expectations across markets. The dashboard should show current probabilities, historical probability changes, and major moves over selectable time windows.

### Macro Signals

The app will group markets tied to economic fundamentals such as inflation, interest rates, labor data, GDP, recession risk, energy prices, and policy decisions. These views should make it easy to see what the market is pricing before official data releases.

### Company and KPI Signals

Where available, the dashboard will track markets connected to company performance, product milestones, earnings-related outcomes, regulatory decisions, or sector-specific operating metrics. The goal is to evaluate whether prediction markets can supplement traditional KPI and equity research workflows.

### Event and Catalyst Tracking

Users should be able to monitor upcoming resolution dates, market close dates, major data releases, and catalysts that may affect market-implied expectations.

### Analysis Layer

The application should include lightweight analysis such as:

- Probability change over time.
- Volume and liquidity trends.
- Market movement around news or data releases.
- Cross-market comparisons.
- Spreads between related outcomes.
- Watchlists for themes, companies, and indicators.

## Data Source

The first version will use the Kalshi API in a read-only mode. The app should retrieve public market data and avoid any functionality that places orders, modifies account state, or requires trading permissions.

Potential data objects include:

- Events.
- Markets.
- Contracts.
- Prices.
- Order book snapshots if publicly available and useful.
- Volume, liquidity, open interest, and status fields where available.
- Historical market data where supported.

## Product Principles

- Analyst-first: optimize for comparison, filtering, and interpretation rather than trading execution.
- Read-only by design: the app should function as a research and monitoring tool.
- Transparent calculations: clearly separate raw Kalshi fields from derived metrics.
- Reproducible analysis: preserve transformation logic for implied probabilities, normalization, and aggregations.
- Extensible data model: allow future joins to FRED, SEC filings, earnings data, company KPIs, or news/event calendars.

## Technical Direction

The project will likely include:

- A backend service for scheduled ingestion from the Kalshi API.
- A database for market metadata, price history, and derived analytics.
- A web dashboard frontend for exploration and visualization.
- Jobs or workers for periodic refreshes and historical snapshots.
- Analysis modules for probability conversion, market grouping, and signal generation.

The initial implementation should stay simple: start with public/read-only Kalshi data ingestion, a small normalized schema, and a dashboard focused on a few high-value market categories.

## Initial Milestones

1. Identify the relevant Kalshi API endpoints and authentication requirements for read-only access.
2. Build a small ingestion script for events and markets.
3. Store market metadata and price snapshots locally.
4. Create a basic dashboard with market search, category filters, and implied probability charts.
5. Add macro-focused views for inflation, rates, labor, GDP, and recession-related markets.
6. Add analysis utilities for probability movement, liquidity, and cross-market comparisons.
7. Evaluate whether Kalshi signals provide useful leading or complementary context versus traditional data sources.

## Out of Scope for Initial Version

- Trading or order placement.
- Portfolio or position management.
- Automated trading strategies.
- Account funding, withdrawals, or user brokerage workflows.
- Investment recommendations.
