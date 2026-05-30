import type {
  ClassifiedMarket,
  Market,
  MarketCandlestick,
  MarketQuote,
  OrderbookLevel,
  OrderbookSummary
} from "@/app/lib/types";
import type { KalshiCandlestickRaw, KalshiMarketRaw, KalshiOrderbookRaw } from "@/app/lib/kalshi-schemas";

export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function parseTimestamp(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return new Date(value * 1000).toISOString();
  return String(value);
}

export function normalizeMarket(raw: KalshiMarketRaw): Market {
  return {
    ticker: raw.ticker,
    event_ticker: raw.event_ticker ?? "",
    series_ticker: raw.series_ticker,
    title: raw.title ?? raw.ticker,
    subtitle: raw.subtitle,
    market_type: raw.market_type,
    strike_type: raw.strike_type,
    status: raw.status ?? "unknown",
    yes_sub_title: raw.yes_sub_title,
    no_sub_title: raw.no_sub_title,
    open_at: raw.open_time,
    close_at: raw.close_time,
    expiration_at: raw.expiration_time,
    expected_expiration_at: raw.expected_expiration_time,
    settlement_at: parseTimestamp(raw.settlement_ts),
    settlement_value: raw.settlement_value_dollars ? String(raw.settlement_value_dollars) : undefined,
    rules_primary: raw.rules_primary,
    rules_secondary: raw.rules_secondary,
    custom_strike: raw.custom_strike,
    price_level_structure: raw.price_level_structure,
    category: typeof raw.category === "string" ? raw.category : undefined,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag: unknown): tag is string => typeof tag === "string")
      : [],
    raw
  };
}

export function deriveQuote(raw: KalshiMarketRaw, observedAt = new Date().toISOString()): MarketQuote {
  const yesBid = parseNumber(raw.yes_bid_dollars);
  const yesAsk = parseNumber(raw.yes_ask_dollars);
  const noBid = parseNumber(raw.no_bid_dollars);
  const noAsk = parseNumber(raw.no_ask_dollars);
  const lastPrice = parseNumber(raw.last_price_dollars);
  const previousPrice = parseNumber(raw.previous_price_dollars);
  const previousBid = parseNumber(raw.previous_yes_bid_dollars);
  const previousAsk = parseNumber(raw.previous_yes_ask_dollars);
  const midpoint = yesBid !== undefined && yesAsk !== undefined ? (yesBid + yesAsk) / 2 : lastPrice;
  const previousMidpoint =
    previousBid !== undefined && previousAsk !== undefined ? (previousBid + previousAsk) / 2 : previousPrice;
  const priceChange =
    midpoint !== undefined && previousMidpoint !== undefined ? midpoint - previousMidpoint : undefined;

  return {
    market_ticker: raw.ticker,
    observed_at: observedAt,
    yes_bid: yesBid,
    yes_ask: yesAsk,
    no_bid: noBid,
    no_ask: noAsk,
    last_price: lastPrice,
    previous_price: previousPrice,
    midpoint_price: midpoint,
    implied_probability_mid: midpoint,
    bid_ask_spread: yesBid !== undefined && yesAsk !== undefined ? yesAsk - yesBid : undefined,
    price_change: priceChange,
    probability_change_bps: priceChange !== undefined ? priceChange * 10_000 : undefined,
    volume: parseNumber(raw.volume_fp),
    volume_24h: parseNumber(raw.volume_24h_fp),
    open_interest: parseNumber(raw.open_interest_fp),
    liquidity: parseNumber(raw.liquidity_dollars),
    notional_value: parseNumber(raw.notional_value_dollars)
  };
}

export function normalizeCandlesticks(
  raw: KalshiCandlestickRaw[],
  marketTicker: string,
  intervalMinutes: number
): MarketCandlestick[] {
  return raw.map((candle) => {
    const periodEnd = new Date(candle.end_period_ts * 1000);
    const periodStart = new Date(periodEnd.getTime() - intervalMinutes * 60 * 1000);
    return {
      market_ticker: marketTicker,
      period_start_at: periodStart.toISOString(),
      period_end_at: periodEnd.toISOString(),
      interval_minutes: intervalMinutes,
      yes_bid_open: parseNumber(candle.yes_bid?.open_dollars),
      yes_bid_high: parseNumber(candle.yes_bid?.high_dollars),
      yes_bid_low: parseNumber(candle.yes_bid?.low_dollars),
      yes_bid_close: parseNumber(candle.yes_bid?.close_dollars),
      yes_ask_open: parseNumber(candle.yes_ask?.open_dollars),
      yes_ask_high: parseNumber(candle.yes_ask?.high_dollars),
      yes_ask_low: parseNumber(candle.yes_ask?.low_dollars),
      yes_ask_close: parseNumber(candle.yes_ask?.close_dollars),
      price_open: parseNumber(candle.price?.open_dollars),
      price_high: parseNumber(candle.price?.high_dollars),
      price_low: parseNumber(candle.price?.low_dollars),
      price_close: parseNumber(candle.price?.close_dollars),
      price_mean: parseNumber(candle.price?.mean_dollars),
      volume: parseNumber(candle.volume_fp),
      open_interest: parseNumber(candle.open_interest_fp)
    };
  });
}

function normalizeRawLevels(levels: Array<[unknown, unknown]> | undefined, side: "yes" | "no"): OrderbookLevel[] {
  return (levels ?? [])
    .map(([price, quantity], index) => ({
      side,
      price: parseNumber(price) ?? 0,
      quantity: parseNumber(quantity) ?? 0,
      level_index: index
    }))
    .filter((level) => level.price > 0 && level.quantity > 0)
    .sort((a, b) => a.price - b.price)
    .map((level, index) => ({ ...level, level_index: index }));
}

function sumTopDepth(levels: OrderbookLevel[], count: number) {
  return levels
    .slice(-count)
    .reduce((sum, level) => sum + level.quantity, 0);
}

export function summarizeOrderbook(
  raw: KalshiOrderbookRaw,
  marketTicker: string,
  observedAt = new Date().toISOString()
): OrderbookSummary {
  const yesSource = raw.orderbook_fp?.yes_dollars ?? raw.orderbook?.yes;
  const noSource = raw.orderbook_fp?.no_dollars ?? raw.orderbook?.no;
  const yes = normalizeRawLevels(yesSource, "yes");
  const no = normalizeRawLevels(noSource, "no");
  const bestYesBid = yes.at(-1)?.price;
  const bestNoBid = no.at(-1)?.price;
  const impliedYesAsk = bestNoBid !== undefined ? 1 - bestNoBid : undefined;
  const impliedNoAsk = bestYesBid !== undefined ? 1 - bestYesBid : undefined;

  return {
    market_ticker: marketTicker,
    observed_at: observedAt,
    best_yes_bid: bestYesBid,
    best_no_bid: bestNoBid,
    implied_yes_ask: impliedYesAsk,
    implied_no_ask: impliedNoAsk,
    spread: bestYesBid !== undefined && impliedYesAsk !== undefined ? impliedYesAsk - bestYesBid : undefined,
    depth_1: sumTopDepth(yes, 1) + sumTopDepth(no, 1),
    depth_5: sumTopDepth(yes, 5) + sumTopDepth(no, 5),
    depth_10: sumTopDepth(yes, 10) + sumTopDepth(no, 10),
    levels: [...yes, ...no]
  };
}

export function summarizeMarkets(markets: ClassifiedMarket[]) {
  const withQuotes = markets.filter((market) => market.derived_quote);
  const active = markets.filter((market) => market.status === "open" || market.status === "active").length;
  const avgSpread =
    average(withQuotes.map((market) => market.derived_quote?.bid_ask_spread).filter(isNumber)) ?? 0;
  const totalVolume24h = withQuotes.reduce((sum, market) => sum + (market.derived_quote?.volume_24h ?? 0), 0);
  const totalOpenInterest = withQuotes.reduce((sum, market) => sum + (market.derived_quote?.open_interest ?? 0), 0);
  const topMover = [...withQuotes].sort(
    (a, b) =>
      Math.abs(b.derived_quote?.probability_change_bps ?? 0) -
      Math.abs(a.derived_quote?.probability_change_bps ?? 0)
  )[0];

  return {
    active,
    count: markets.length,
    avgSpread,
    totalVolume24h,
    totalOpenInterest,
    topMover
  };
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: number[]) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
