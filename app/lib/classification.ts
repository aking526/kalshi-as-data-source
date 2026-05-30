import type { ClassifiedMarket, Market, MarketQuote, Theme } from "@/app/lib/types";

export const THEMES: Theme[] = [
  {
    slug: "macro.inflation",
    name: "Inflation",
    description: "CPI, PCE, prices, used cars, and high-inflation release markets.",
    theme_type: "macro"
  },
  {
    slug: "macro.rates",
    name: "Rates",
    description: "Fed decisions, FOMC dissent, Treasury yields, and global central banks.",
    theme_type: "macro"
  },
  {
    slug: "macro.growth",
    name: "Growth",
    description: "GDP, industrial production, durable goods, and consumer sentiment.",
    theme_type: "macro"
  },
  {
    slug: "macro.labor",
    name: "Labor",
    description: "Jobs, unemployment, layoffs, claims, and wage markets.",
    theme_type: "macro"
  },
  {
    slug: "macro.housing",
    name: "Housing",
    description: "Housing starts, home prices, inventory, mortgage, and rental markets.",
    theme_type: "macro"
  },
  {
    slug: "macro.energy",
    name: "Energy",
    description: "Oil, gas, natural gas, power, fuel, and energy-price markets.",
    theme_type: "macro"
  },
  {
    slug: "company.kpi",
    name: "Company KPIs",
    description: "Subscribers, app rank, sales, volume, usage, and operating metrics.",
    theme_type: "company"
  },
  {
    slug: "company.product",
    name: "Product Launches",
    description: "Launches, releases, model announcements, and technology milestones.",
    theme_type: "company"
  },
  {
    slug: "company.management",
    name: "Management",
    description: "CEO succession, executive changes, and management events.",
    theme_type: "company"
  },
  {
    slug: "company.ma_ipo",
    name: "M&A / IPO",
    description: "IPO, acquisition, merger, and public-market listing outcomes.",
    theme_type: "company"
  },
  {
    slug: "company.regulatory",
    name: "Regulatory",
    description: "Antitrust, litigation, FDA, SEC, court, and regulatory risk.",
    theme_type: "company"
  },
  {
    slug: "markets.indices",
    name: "Indices",
    description: "Equity index levels, inclusions, removals, and market ranges.",
    theme_type: "markets"
  },
  {
    slug: "markets.fx",
    name: "FX",
    description: "Foreign exchange and currency-market outcomes.",
    theme_type: "markets"
  },
  {
    slug: "markets.crypto",
    name: "Crypto",
    description: "Bitcoin, Ethereum, token prices, and crypto-market events.",
    theme_type: "markets"
  },
  {
    slug: "policy.elections",
    name: "Elections",
    description: "Election, nomination, administration, and legislative outcomes.",
    theme_type: "policy"
  },
  {
    slug: "policy.courts_regulation",
    name: "Courts / Policy",
    description: "Court decisions, agency rules, policy changes, and regulation.",
    theme_type: "policy"
  }
];

const rules: Array<{ slug: string; terms: string[] }> = [
  { slug: "macro.inflation", terms: ["cpi", "pce", "inflation", "prices", "used car", "rent"] },
  { slug: "macro.rates", terms: ["fed", "fomc", "rate", "treasury", "yield", "central bank"] },
  { slug: "macro.growth", terms: ["gdp", "growth", "industrial production", "durable", "sentiment"] },
  { slug: "macro.labor", terms: ["jobs", "payroll", "unemployment", "layoff", "claims", "wage"] },
  { slug: "macro.housing", terms: ["housing", "home", "mortgage", "rent", "starts"] },
  { slug: "macro.energy", terms: ["oil", "gas", "energy", "fuel", "natural gas", "brent", "wti"] },
  { slug: "company.kpi", terms: ["subscriber", "users", "sales", "deliveries", "volume", "revenue", "app rank"] },
  { slug: "company.product", terms: ["launch", "release", "product", "model", "iphone", "ai", "openai", "anthropic"] },
  { slug: "company.management", terms: ["ceo", "cfo", "succession", "resign", "executive"] },
  { slug: "company.ma_ipo", terms: ["ipo", "acquisition", "merger", "m&a", "buyout", "listing"] },
  { slug: "company.regulatory", terms: ["antitrust", "lawsuit", "litigation", "fda", "sec", "regulatory"] },
  { slug: "markets.indices", terms: ["s&p", "nasdaq", "dow", "index", "russell", "market close"] },
  { slug: "markets.fx", terms: ["fx", "foreign exchange", "dollar", "euro", "yen", "currency"] },
  { slug: "markets.crypto", terms: ["bitcoin", "btc", "ethereum", "eth", "crypto", "token"] },
  { slug: "policy.elections", terms: ["election", "president", "senate", "house", "nominee", "primary"] },
  { slug: "policy.courts_regulation", terms: ["supreme court", "court", "policy", "regulation", "agency", "tariff"] }
];

export function classifyMarket(market: Market, quote?: MarketQuote): ClassifiedMarket {
  const text = [
    market.ticker,
    market.event_ticker,
    market.series_ticker,
    market.title,
    market.subtitle,
    market.category,
    ...market.tags
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matches = rules
    .map((rule) => ({
      theme: THEMES.find((theme) => theme.slug === rule.slug),
      hits: rule.terms.filter((term) => text.includes(term)).length
    }))
    .filter((match): match is { theme: Theme; hits: number } => Boolean(match.theme) && match.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  const themes = dedupeThemes(matches.map((match) => match.theme));
  const fallbackTheme = THEMES.find((theme) => theme.slug === "markets.indices")!;

  return {
    ...market,
    themes: themes.length > 0 ? themes.slice(0, 3) : [fallbackTheme],
    classification_confidence: themes.length > 0 ? Math.min(0.95, 0.45 + matches[0].hits * 0.18) : 0.2,
    derived_quote: quote
  };
}

function dedupeThemes(themes: Theme[]) {
  const seen = new Set<string>();
  return themes.filter((theme) => {
    if (seen.has(theme.slug)) return false;
    seen.add(theme.slug);
    return true;
  });
}
