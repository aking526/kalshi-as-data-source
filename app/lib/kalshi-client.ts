import {
  kalshiMarketSchema,
  kalshiCandlesticksResponseSchema,
  kalshiEventsResponseSchema,
  kalshiMarketsResponseSchema,
  kalshiOrderbookResponseSchema,
  kalshiSeriesResponseSchema
} from "@/app/lib/kalshi-schemas";
import { classifyMarket } from "@/app/lib/classification";
import {
  deriveQuote,
  normalizeCandlesticks,
  normalizeMarket,
  summarizeOrderbook
} from "@/app/lib/analytics";
import { sampleCandlesticks, sampleMarkets, sampleOrderbook } from "@/app/lib/sample-data";
import type {
  ApiEnvelope,
  ClassifiedMarket,
  Event,
  MarketCandlestick,
  OrderbookSummary,
  Series
} from "@/app/lib/types";

const KALSHI_BASE_URL = "https://external-api.kalshi.com/trade-api/v2";
const DEFAULT_RESEARCH_SERIES = [
  "KXCPI",
  "KXFED",
  "KXSPX",
  "KXIPO",
  "KXCOMPANIES",
  "KXOIL"
];

type FetchResult<T> = {
  payload: T;
  latencyMs: number;
};

async function fetchKalshiJson<T>(path: string, searchParams?: URLSearchParams): Promise<FetchResult<T>> {
  const startedAt = performance.now();
  const url = new URL(`${KALSHI_BASE_URL}${path}`);
  searchParams?.forEach((value, key) => {
    if (value !== "") url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    },
    signal: AbortSignal.timeout(6_000),
    next: { revalidate: 45 }
  });

  if (!response.ok) {
    throw new Error(`Kalshi ${response.status}: ${await response.text()}`);
  }

  return {
    payload: (await response.json()) as T,
    latencyMs: Math.round(performance.now() - startedAt)
  };
}

function envelope<T>(
  data: T,
  source: "live" | "sample",
  ok: boolean,
  message: string,
  latencyMs?: number,
  cursor?: string
): ApiEnvelope<T> {
  return {
    data,
    source,
    observed_at: new Date().toISOString(),
    api_health: {
      ok,
      message,
      latency_ms: latencyMs
    },
    cursor
  };
}

function forwardParams(input: URLSearchParams, allowed: string[]) {
  const output = new URLSearchParams();
  for (const key of allowed) {
    const value = input.get(key);
    if (value) output.set(key, value);
  }
  return output;
}

export async function getMarkets(input: URLSearchParams): Promise<ApiEnvelope<ClassifiedMarket[]>> {
  const params = forwardParams(input, [
    "limit",
    "cursor",
    "status",
    "series_ticker",
    "event_ticker",
    "tickers",
    "min_close_ts",
    "max_close_ts",
    "min_updated_ts",
    "mve_filter"
  ]);
  if (!params.has("limit")) params.set("limit", "250");
  if (!params.has("status")) params.set("status", "active");

  try {
    const startedAt = performance.now();
    const responses = await fetchResearchMarketPayloads(params);
    const parsed = {
      markets: responses.flatMap((payload) => kalshiMarketsResponseSchema.parse(payload).markets),
      cursor: responses.length === 1 ? kalshiMarketsResponseSchema.parse(responses[0]).cursor : undefined
    };
    const observedAt = new Date().toISOString();
    const markets = parsed.markets
      .map((raw) => {
        const market = normalizeMarket(raw);
        return classifyMarket(market, deriveQuote(raw, observedAt));
      })
      .filter((market, index, all) => all.findIndex((item) => item.ticker === market.ticker) === index);
    const filtered = filterMarkets(markets, input);
    return envelope(
      filtered,
      "live",
      true,
      "Kalshi live market data",
      Math.round(performance.now() - startedAt),
      parsed.cursor ?? undefined
    );
  } catch (error) {
    const filtered = filterMarkets(sampleMarkets, input);
    return envelope(
      filtered,
      "sample",
      false,
      error instanceof Error ? `Live request failed; showing sample data. ${error.message}` : "Live request failed.",
      undefined
    );
  }
}

async function fetchResearchMarketPayloads(params: URLSearchParams) {
  if (params.has("series_ticker") || params.has("event_ticker") || params.has("tickers")) {
    const { payload } = await fetchKalshiJson<unknown>("/markets", params);
    return [payload];
  }

  const limit = params.get("limit") ?? "250";
  const perSeriesLimit = String(Math.max(20, Math.floor(Number(limit) / 4)));
  const payloads: unknown[] = [];
  for (const seriesTicker of DEFAULT_RESEARCH_SERIES) {
    const seriesParams = new URLSearchParams(params);
    seriesParams.set("series_ticker", seriesTicker);
    seriesParams.set("limit", perSeriesLimit);
    const { payload } = await fetchKalshiJson<unknown>("/markets", seriesParams);
    if (kalshiMarketsResponseSchema.safeParse(payload).success) payloads.push(payload);
  }

  if (payloads.length > 0) return payloads;
  const { payload } = await fetchKalshiJson<unknown>("/markets", params);
  return [payload];
}

export async function getMarket(ticker: string): Promise<ApiEnvelope<ClassifiedMarket>> {
  try {
    const { payload, latencyMs } = await fetchKalshiJson<unknown>(`/markets/${encodeURIComponent(ticker)}`);
    const selected =
      kalshiMarketSchema.safeParse((payload as { market?: unknown }).market).data ??
      kalshiMarketSchema.safeParse(payload).data;
    if (!selected) throw new Error("Unexpected market detail response shape");
    const observedAt = new Date().toISOString();
    return envelope(
      classifyMarket(normalizeMarket(selected), deriveQuote(selected, observedAt)),
      "live",
      true,
      "Kalshi live market detail",
      latencyMs
    );
  } catch (error) {
    const selected = sampleMarkets.find((market) => market.ticker === ticker) ?? sampleMarkets[0];
    return envelope(
      selected,
      "sample",
      false,
      error instanceof Error ? `Live request failed; showing sample detail. ${error.message}` : "Live request failed."
    );
  }
}

export async function getSeries(input: URLSearchParams): Promise<ApiEnvelope<Series[]>> {
  const params = forwardParams(input, ["limit", "cursor", "category", "tags"]);
  if (!params.has("limit")) params.set("limit", "100");

  try {
    const { payload, latencyMs } = await fetchKalshiJson<unknown>("/series", params);
    const parsed = kalshiSeriesResponseSchema.parse(payload);
    const data = parsed.series.map((series) => ({
      ticker: series.ticker,
      title: series.title ?? series.ticker,
      category: series.category,
      frequency: series.frequency,
      tags: series.tags ?? [],
      contract_url: series.contract_url,
      contract_terms_url: series.contract_terms_url,
      volume: series.volume,
      last_updated_at: series.last_updated_at
    }));
    return envelope(data, "live", true, "Kalshi live series data", latencyMs, parsed.cursor ?? undefined);
  } catch (error) {
    const data = Array.from(new Set(sampleMarkets.map((market) => market.series_ticker).filter(Boolean))).map(
      (ticker) => ({
        ticker: ticker!,
        title: ticker!,
        tags: []
      })
    );
    return envelope(
      data,
      "sample",
      false,
      error instanceof Error ? `Live request failed; showing sample series. ${error.message}` : "Live request failed."
    );
  }
}

export async function getEvents(input: URLSearchParams): Promise<ApiEnvelope<Event[]>> {
  const params = forwardParams(input, ["limit", "cursor", "series_ticker", "status", "with_nested_markets"]);
  if (!params.has("limit")) params.set("limit", "100");

  try {
    const { payload, latencyMs } = await fetchKalshiJson<unknown>("/events", params);
    const parsed = kalshiEventsResponseSchema.parse(payload);
    const data = parsed.events.map((event) => ({
      event_ticker: event.event_ticker ?? event.ticker ?? "",
      series_ticker: event.series_ticker,
      title: event.title ?? event.event_ticker ?? event.ticker ?? "Untitled event",
      category: event.category,
      status: event.status,
      mutually_exclusive: event.mutually_exclusive,
      expected_expiration_at: event.expected_expiration_time,
      close_at: event.close_time
    }));
    return envelope(data, "live", true, "Kalshi live events data", latencyMs, parsed.cursor ?? undefined);
  } catch (error) {
    const data = sampleMarkets.map((market) => ({
      event_ticker: market.event_ticker,
      series_ticker: market.series_ticker,
      title: market.subtitle ?? market.title,
      status: market.status,
      close_at: market.close_at
    }));
    return envelope(
      data,
      "sample",
      false,
      error instanceof Error ? `Live request failed; showing sample events. ${error.message}` : "Live request failed."
    );
  }
}

export async function getCandlesticks(
  marketTicker: string,
  input: URLSearchParams
): Promise<ApiEnvelope<MarketCandlestick[]>> {
  if (input.get("sample") === "1") {
    return envelope(sampleCandlesticks(marketTicker), "sample", false, "Sample candlestick data");
  }

  const interval = Number(input.get("period_interval") ?? "60");
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - 60 * 60 * 24 * 7;
  const params = new URLSearchParams({
    market_tickers: marketTicker,
    start_ts: input.get("start_ts") ?? String(startTs),
    end_ts: input.get("end_ts") ?? String(endTs),
    period_interval: String(interval),
    include_latest_before_start: input.get("include_latest_before_start") ?? "true"
  });

  try {
    const { payload, latencyMs } = await fetchKalshiJson<unknown>("/markets/candlesticks", params);
    const parsed = kalshiCandlesticksResponseSchema.parse(payload);
    const candles =
      "markets" in parsed
        ? parsed.markets.find((market) => market.market_ticker === marketTicker)?.candlesticks ?? []
        : parsed.candlesticks;
    return envelope(
      normalizeCandlesticks(candles, marketTicker, interval),
      "live",
      true,
      "Kalshi live candlestick data",
      latencyMs
    );
  } catch (error) {
    return envelope(
      sampleCandlesticks(marketTicker),
      "sample",
      false,
      error instanceof Error ? `Live request failed; showing sample candles. ${error.message}` : "Live request failed."
    );
  }
}

export async function getOrderbook(
  marketTicker: string,
  input: URLSearchParams
): Promise<ApiEnvelope<OrderbookSummary>> {
  if (input.get("sample") === "1") {
    return envelope(sampleOrderbook(marketTicker), "sample", false, "Sample orderbook data");
  }

  const params = forwardParams(input, ["depth"]);
  if (!params.has("depth")) params.set("depth", "10");

  try {
    const { payload, latencyMs } = await fetchKalshiJson<unknown>(
      `/markets/${encodeURIComponent(marketTicker)}/orderbook`,
      params
    );
    const parsed = kalshiOrderbookResponseSchema.parse(payload);
    return envelope(
      summarizeOrderbook(parsed, marketTicker),
      "live",
      true,
      "Kalshi live orderbook data",
      latencyMs
    );
  } catch (error) {
    return envelope(
      sampleOrderbook(marketTicker),
      "sample",
      false,
      error instanceof Error ? `Live request failed; showing sample orderbook. ${error.message}` : "Live request failed."
    );
  }
}

function filterMarkets(markets: ClassifiedMarket[], input: URLSearchParams) {
  const query = input.get("q")?.toLowerCase();
  const status = input.get("status");
  const theme = input.get("theme");
  return markets.filter((market) => {
    const text = `${market.ticker} ${market.title} ${market.subtitle ?? ""}`.toLowerCase();
    const matchesQuery = !query || text.includes(query);
    const matchesStatus = !status || status === "all" || market.status === status || (status === "active" && market.status === "open");
    const matchesTheme = !theme || theme === "all" || market.themes.some((item) => item.slug === theme);
    return matchesQuery && matchesStatus && matchesTheme;
  });
}
