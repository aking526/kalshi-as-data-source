export type SettlementSource = {
  name: string;
  url?: string;
};

export type Series = {
  ticker: string;
  title: string;
  category?: string;
  frequency?: string;
  tags: string[];
  settlement_sources?: SettlementSource[];
  contract_url?: string;
  contract_terms_url?: string;
  volume?: number;
  last_updated_at?: string;
};

export type Event = {
  event_ticker: string;
  series_ticker?: string;
  title: string;
  category?: string;
  status?: string;
  mutually_exclusive?: boolean;
  expected_expiration_at?: string;
  close_at?: string;
  settlement_sources?: SettlementSource[];
};

export type Market = {
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
  expected_expiration_at?: string;
  settlement_value?: string;
  rules_primary?: string;
  rules_secondary?: string;
  custom_strike?: Record<string, unknown>;
  price_level_structure?: string;
  category?: string;
  tags: string[];
  raw: Record<string, unknown>;
};

export type MarketQuote = {
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
  price_change?: number;
  probability_change_bps?: number;
  volume?: number;
  volume_24h?: number;
  open_interest?: number;
  liquidity?: number;
  notional_value?: number;
};

export type MarketCandlestick = {
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
};

export type OrderbookLevel = {
  side: "yes" | "no";
  price: number;
  quantity: number;
  level_index: number;
};

export type OrderbookSummary = {
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
  levels: OrderbookLevel[];
};

export type ThemeType = "macro" | "company" | "markets" | "policy";

export type Theme = {
  slug: string;
  name: string;
  description: string;
  theme_type: ThemeType;
};

export type ClassifiedMarket = Market & {
  themes: Theme[];
  classification_confidence: number;
  derived_quote?: MarketQuote;
};

export type ApiEnvelope<T> = {
  data: T;
  source: "live" | "sample";
  observed_at: string;
  api_health: {
    ok: boolean;
    message: string;
    latency_ms?: number;
  };
  cursor?: string;
};
