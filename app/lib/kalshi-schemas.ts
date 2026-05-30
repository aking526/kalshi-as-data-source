import { z } from "zod";

const looseRecord = z.object({}).catchall(z.unknown());
const optionalDollars = z.union([z.string(), z.number()]).optional().nullable();

export const kalshiMarketSchema = looseRecord.extend({
  ticker: z.string(),
  event_ticker: z.string().optional(),
  series_ticker: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  market_type: z.string().optional(),
  strike_type: z.string().optional(),
  status: z.string().optional(),
  yes_sub_title: z.string().optional(),
  no_sub_title: z.string().optional(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  expected_expiration_time: z.string().optional(),
  expiration_time: z.string().optional(),
  settlement_ts: z.union([z.string(), z.number()]).optional(),
  settlement_value_dollars: optionalDollars,
  yes_bid_dollars: optionalDollars,
  yes_ask_dollars: optionalDollars,
  no_bid_dollars: optionalDollars,
  no_ask_dollars: optionalDollars,
  last_price_dollars: optionalDollars,
  previous_price_dollars: optionalDollars,
  previous_yes_bid_dollars: optionalDollars,
  previous_yes_ask_dollars: optionalDollars,
  volume_fp: optionalDollars,
  volume_24h_fp: optionalDollars,
  open_interest_fp: optionalDollars,
  liquidity_dollars: optionalDollars,
  notional_value_dollars: optionalDollars,
  rules_primary: z.string().optional(),
  rules_secondary: z.string().optional(),
  custom_strike: looseRecord.optional(),
  price_level_structure: z.string().optional()
});

export const kalshiMarketsResponseSchema = z.object({
  markets: z.array(kalshiMarketSchema),
  cursor: z.string().optional().nullable()
});

export const kalshiSeriesSchema = looseRecord.extend({
  ticker: z.string(),
  title: z.string().optional(),
  category: z.string().optional(),
  frequency: z.string().optional(),
  tags: z.array(z.string()).optional(),
  contract_url: z.string().optional(),
  contract_terms_url: z.string().optional(),
  volume: z.number().optional(),
  last_updated_at: z.string().optional()
});

export const kalshiSeriesResponseSchema = z.object({
  series: z.array(kalshiSeriesSchema),
  cursor: z.string().optional().nullable()
});

export const kalshiEventSchema = looseRecord.extend({
  event_ticker: z.string().optional(),
  ticker: z.string().optional(),
  series_ticker: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  mutually_exclusive: z.boolean().optional(),
  expected_expiration_time: z.string().optional(),
  close_time: z.string().optional()
});

export const kalshiEventsResponseSchema = z.object({
  events: z.array(kalshiEventSchema),
  cursor: z.string().optional().nullable()
});

const candlePriceSchema = z
  .object({
    open_dollars: optionalDollars,
    low_dollars: optionalDollars,
    high_dollars: optionalDollars,
    close_dollars: optionalDollars,
    mean_dollars: optionalDollars,
    previous_dollars: optionalDollars,
    min_dollars: optionalDollars,
    max_dollars: optionalDollars
  })
  .partial()
  .optional();

export const kalshiCandlestickSchema = looseRecord.extend({
  end_period_ts: z.number(),
  yes_bid: candlePriceSchema,
  yes_ask: candlePriceSchema,
  price: candlePriceSchema,
  volume_fp: optionalDollars,
  open_interest_fp: optionalDollars
});

export const kalshiCandlesticksResponseSchema = z.union([
  z.object({ candlesticks: z.array(kalshiCandlestickSchema) }),
  z.object({
    markets: z.array(
      z.object({
        market_ticker: z.string(),
        candlesticks: z.array(kalshiCandlestickSchema)
      })
    )
  })
]);

export const orderbookLevelSchema = z.tuple([
  z.union([z.string(), z.number()]),
  z.union([z.string(), z.number()])
]);

export const kalshiOrderbookResponseSchema = z.object({
  orderbook_fp: z
    .object({
      yes_dollars: z.array(orderbookLevelSchema).optional(),
      no_dollars: z.array(orderbookLevelSchema).optional()
    })
    .optional(),
  orderbook: z
    .object({
      yes: z.array(orderbookLevelSchema).optional(),
      no: z.array(orderbookLevelSchema).optional()
    })
    .optional()
});

export type KalshiMarketRaw = z.infer<typeof kalshiMarketSchema>;
export type KalshiCandlestickRaw = z.infer<typeof kalshiCandlestickSchema>;
export type KalshiOrderbookRaw = z.infer<typeof kalshiOrderbookResponseSchema>;
