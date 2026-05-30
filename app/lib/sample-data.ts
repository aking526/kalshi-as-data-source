import type { ClassifiedMarket, MarketCandlestick, OrderbookSummary } from "@/app/lib/types";
import { classifyMarket } from "@/app/lib/classification";
import { deriveQuote, normalizeMarket, summarizeOrderbook } from "@/app/lib/analytics";
import type { KalshiMarketRaw } from "@/app/lib/kalshi-schemas";

const now = new Date("2026-05-30T14:00:00.000Z").toISOString();

const rawMarkets: KalshiMarketRaw[] = [
  {
    ticker: "KXCPI-26JUN-T29",
    event_ticker: "KXCPI-26JUN",
    series_ticker: "KXCPI",
    title: "Will CPI inflation be above 2.9% in June 2026?",
    subtitle: "CPI year-over-year release bucket",
    market_type: "binary",
    status: "open",
    yes_bid_dollars: "0.4200",
    yes_ask_dollars: "0.4700",
    no_bid_dollars: "0.5300",
    no_ask_dollars: "0.5800",
    previous_yes_bid_dollars: "0.3900",
    previous_yes_ask_dollars: "0.4400",
    last_price_dollars: "0.4500",
    volume_fp: "18520",
    volume_24h_fp: "4260",
    open_interest_fp: "32940",
    liquidity_dollars: "18500",
    notional_value_dollars: "8100",
    close_time: "2026-06-12T12:30:00Z",
    expected_expiration_time: "2026-06-12T13:00:00Z",
    rules_primary: "Resolves based on the official CPI release.",
    rules_secondary: "Uses the first released value from the Bureau of Labor Statistics."
  },
  {
    ticker: "KXFED-26JUN-CUT",
    event_ticker: "KXFED-26JUN",
    series_ticker: "KXFED",
    title: "Will the Fed cut rates at the June 2026 meeting?",
    subtitle: "FOMC target range decision",
    market_type: "binary",
    status: "open",
    yes_bid_dollars: "0.3100",
    yes_ask_dollars: "0.3500",
    previous_yes_bid_dollars: "0.3500",
    previous_yes_ask_dollars: "0.3900",
    volume_fp: "24800",
    volume_24h_fp: "6900",
    open_interest_fp: "50500",
    liquidity_dollars: "22600",
    notional_value_dollars: "7700",
    close_time: "2026-06-17T18:00:00Z",
    expected_expiration_time: "2026-06-17T18:30:00Z",
    rules_primary: "Resolves to Yes if the Federal Reserve lowers the target range."
  },
  {
    ticker: "KXSPX-26MAY30-T6600",
    event_ticker: "KXSPX-26MAY30",
    series_ticker: "KXSPX",
    title: "Will the S&P 500 close above 6,600 today?",
    subtitle: "Daily index close range",
    market_type: "binary",
    status: "open",
    yes_bid_dollars: "0.1800",
    yes_ask_dollars: "0.2100",
    previous_yes_bid_dollars: "0.1200",
    previous_yes_ask_dollars: "0.1500",
    volume_fp: "112000",
    volume_24h_fp: "112000",
    open_interest_fp: "78000",
    liquidity_dollars: "45800",
    notional_value_dollars: "22100",
    close_time: "2026-05-30T20:00:00Z",
    expected_expiration_time: "2026-05-30T20:15:00Z",
    rules_primary: "Resolves based on official S&P 500 closing level."
  },
  {
    ticker: "KXCOINBASE-26Q2-VOL",
    event_ticker: "KXCOINBASE-26Q2",
    series_ticker: "KXCOMPANIES",
    title: "Will Coinbase spot trading volume exceed $350B in Q2?",
    subtitle: "Company KPI market",
    market_type: "binary",
    status: "open",
    yes_bid_dollars: "0.5400",
    yes_ask_dollars: "0.6100",
    previous_yes_bid_dollars: "0.5000",
    previous_yes_ask_dollars: "0.5700",
    volume_fp: "7200",
    volume_24h_fp: "940",
    open_interest_fp: "11900",
    liquidity_dollars: "5900",
    notional_value_dollars: "4100",
    close_time: "2026-07-15T20:00:00Z",
    expected_expiration_time: "2026-08-01T20:00:00Z",
    rules_primary: "Resolves using Coinbase quarterly reported spot trading volume."
  },
  {
    ticker: "KXOPENAI-IPO-26",
    event_ticker: "KXOPENAI-IPO",
    series_ticker: "KXIPO",
    title: "Will OpenAI file for an IPO before the end of 2026?",
    subtitle: "Company IPO comparison",
    market_type: "binary",
    status: "open",
    yes_bid_dollars: "0.2200",
    yes_ask_dollars: "0.2900",
    previous_yes_bid_dollars: "0.2500",
    previous_yes_ask_dollars: "0.3200",
    volume_fp: "15400",
    volume_24h_fp: "1300",
    open_interest_fp: "21400",
    liquidity_dollars: "8900",
    notional_value_dollars: "5300",
    close_time: "2026-12-31T23:59:00Z",
    expected_expiration_time: "2027-01-05T16:00:00Z",
    rules_primary: "Resolves based on public filing records."
  },
  {
    ticker: "KXOIL-26JUN-T85",
    event_ticker: "KXOIL-26JUN",
    series_ticker: "KXOIL",
    title: "Will WTI oil settle above $85 in June 2026?",
    subtitle: "Energy price range",
    market_type: "binary",
    status: "open",
    yes_bid_dollars: "0.2700",
    yes_ask_dollars: "0.3300",
    previous_yes_bid_dollars: "0.2800",
    previous_yes_ask_dollars: "0.3400",
    volume_fp: "9900",
    volume_24h_fp: "1580",
    open_interest_fp: "17200",
    liquidity_dollars: "7600",
    notional_value_dollars: "3300",
    close_time: "2026-06-30T20:00:00Z",
    expected_expiration_time: "2026-07-01T13:00:00Z",
    rules_primary: "Resolves based on referenced WTI settlement price."
  }
];

export const sampleMarkets: ClassifiedMarket[] = rawMarkets.map((raw) =>
  classifyMarket(normalizeMarket(raw), deriveQuote(raw, now))
);

export function sampleCandlesticks(marketTicker: string): MarketCandlestick[] {
  const market = sampleMarkets.find((item) => item.ticker === marketTicker) ?? sampleMarkets[0];
  const base = market.derived_quote?.midpoint_price ?? 0.5;
  return Array.from({ length: 24 }, (_, index) => {
    const end = new Date(Date.parse(now) - (23 - index) * 60 * 60 * 1000);
    const drift = Math.sin(index / 3) * 0.025 + (index - 12) * 0.001;
    const close = Math.min(0.95, Math.max(0.05, base + drift));
    return {
      market_ticker: marketTicker,
      period_start_at: new Date(end.getTime() - 60 * 60 * 1000).toISOString(),
      period_end_at: end.toISOString(),
      interval_minutes: 60,
      price_open: Math.min(0.95, Math.max(0.05, close - 0.01)),
      price_high: Math.min(0.98, close + 0.025),
      price_low: Math.max(0.02, close - 0.025),
      price_close: close,
      price_mean: close,
      volume: 200 + index * 18,
      open_interest: (market.derived_quote?.open_interest ?? 10000) + index * 50
    };
  });
}

export function sampleOrderbook(marketTicker: string): OrderbookSummary {
  return summarizeOrderbook(
    {
      orderbook_fp: {
        yes_dollars: [
          ["0.18", "130"],
          ["0.26", "85"],
          ["0.34", "75"],
          ["0.42", "210"]
        ],
        no_dollars: [
          ["0.12", "90"],
          ["0.28", "140"],
          ["0.48", "65"],
          ["0.53", "180"]
        ]
      }
    },
    marketTicker,
    now
  );
}
