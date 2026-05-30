import { describe, expect, it } from "vitest";
import { deriveQuote, normalizeCandlesticks, summarizeOrderbook } from "@/app/lib/analytics";
import { classifyMarket } from "@/app/lib/classification";
import { normalizeMarket } from "@/app/lib/analytics";

describe("derived Kalshi analytics", () => {
  it("computes midpoint, spread, and probability change from dollar fields", () => {
    const quote = deriveQuote({
      ticker: "KXCPI-TEST",
      yes_bid_dollars: "0.40",
      yes_ask_dollars: "0.46",
      previous_yes_bid_dollars: "0.37",
      previous_yes_ask_dollars: "0.41",
      volume_24h_fp: "1250"
    });

    expect(quote.midpoint_price).toBeCloseTo(0.43);
    expect(quote.implied_probability_mid).toBeCloseTo(0.43);
    expect(quote.bid_ask_spread).toBeCloseTo(0.06);
    expect(quote.probability_change_bps).toBeCloseTo(400);
    expect(quote.volume_24h).toBe(1250);
  });

  it("summarizes implied asks and top-of-book depth", () => {
    const summary = summarizeOrderbook(
      {
        orderbook_fp: {
          yes_dollars: [
            ["0.22", "10"],
            ["0.31", "20"]
          ],
          no_dollars: [
            ["0.62", "5"],
            ["0.66", "15"]
          ]
        }
      },
      "KXTEST"
    );

    expect(summary.best_yes_bid).toBeCloseTo(0.31);
    expect(summary.implied_yes_ask).toBeCloseTo(0.34);
    expect(summary.spread).toBeCloseTo(0.03);
    expect(summary.depth_1).toBe(35);
  });

  it("normalizes candle timestamps and price fields", () => {
    const candles = normalizeCandlesticks(
      [
        {
          end_period_ts: 1_700_000_000,
          price: { open_dollars: "0.2", high_dollars: "0.3", low_dollars: "0.1", close_dollars: "0.25" },
          volume_fp: "42"
        }
      ],
      "KXTEST",
      60
    );

    expect(candles[0].period_end_at).toBe("2023-11-14T22:13:20.000Z");
    expect(candles[0].period_start_at).toBe("2023-11-14T21:13:20.000Z");
    expect(candles[0].price_close).toBe(0.25);
    expect(candles[0].volume).toBe(42);
  });

  it("classifies inflation markets into the macro inflation theme", () => {
    const market = normalizeMarket({
      ticker: "KXCPI-TEST",
      event_ticker: "KXCPI",
      title: "Will CPI inflation exceed 3%?",
      status: "open"
    });

    const classified = classifyMarket(market);
    expect(classified.themes[0].slug).toBe("macro.inflation");
    expect(classified.classification_confidence).toBeGreaterThan(0.4);
  });
});
