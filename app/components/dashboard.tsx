"use client";

import {
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  DatabaseZap,
  ExternalLink,
  Factory,
  Gauge,
  LineChart,
  Loader2,
  Search,
  ShieldCheck,
  Table2,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { QueryProvider } from "@/app/components/query-provider";
import { THEMES } from "@/app/lib/classification";
import type {
  ApiEnvelope,
  ClassifiedMarket,
  MarketCandlestick,
  OrderbookSummary,
  ThemeType
} from "@/app/lib/types";
import { formatCompact, formatDate, formatPercent, formatSignedBps } from "@/app/lib/utils";
import { summarizeMarkets } from "@/app/lib/analytics";

type MarketEnvelope = ApiEnvelope<ClassifiedMarket[]>;
type CandleEnvelope = ApiEnvelope<MarketCandlestick[]>;
type OrderbookEnvelope = ApiEnvelope<OrderbookSummary>;
type ViewKey = "home" | "explorer" | "macro" | "company" | "themes" | "watchlist";

const columnHelper = createColumnHelper<ClassifiedMarket>();

function fetchJson<T>(url: string): Promise<T> {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return response.json() as Promise<T>;
  });
}

export function Dashboard() {
  return (
    <QueryProvider>
      <DashboardShell />
    </QueryProvider>
  );
}

function DashboardShell() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewKey>("home");
  const [themeFilter, setThemeFilter] = useState("all");
  const [selectedTicker, setSelectedTicker] = useState<string | undefined>();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "probability_change_bps", desc: true }
  ]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("kalshi-signals-watchlist");
    if (stored) setWatchlist(JSON.parse(stored) as string[]);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kalshi-signals-watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const marketParams = useMemo(() => {
    const params = new URLSearchParams({ limit: "250", status: "active" });
    if (query) params.set("q", query);
    if (themeFilter !== "all") params.set("theme", themeFilter);
    return params;
  }, [query, themeFilter]);

  const marketsQuery = useQuery({
    queryKey: ["markets", marketParams.toString()],
    queryFn: () => fetchJson<MarketEnvelope>(`/api/kalshi/markets?${marketParams.toString()}`)
  });

  const markets = useMemo(() => marketsQuery.data?.data ?? [], [marketsQuery.data?.data]);
  const selectedMarket = useMemo(() => {
    return markets.find((market) => market.ticker === selectedTicker) ?? markets[0];
  }, [markets, selectedTicker]);

  useEffect(() => {
    if (!selectedTicker && markets[0]) setSelectedTicker(markets[0].ticker);
  }, [markets, selectedTicker]);

  const candlesQuery = useQuery({
    queryKey: ["candlesticks", selectedMarket?.ticker, marketsQuery.data?.source],
    enabled: Boolean(selectedMarket?.ticker),
    queryFn: () =>
      fetchJson<CandleEnvelope>(
        `/api/kalshi/markets/${encodeURIComponent(selectedMarket!.ticker)}/candlesticks${
          marketsQuery.data?.source === "sample" ? "?sample=1" : ""
        }`
      )
  });

  const orderbookQuery = useQuery({
    queryKey: ["orderbook", selectedMarket?.ticker, marketsQuery.data?.source],
    enabled: Boolean(selectedMarket?.ticker),
    queryFn: () =>
      fetchJson<OrderbookEnvelope>(
        `/api/kalshi/markets/${encodeURIComponent(selectedMarket!.ticker)}/orderbook${
          marketsQuery.data?.source === "sample" ? "?sample=1" : ""
        }`
      )
  });

  const filteredMarkets = useMemo(() => {
    let output = markets;
    if (view === "macro") output = output.filter((market) => market.themes.some((theme) => theme.theme_type === "macro"));
    if (view === "company")
      output = output.filter((market) => market.themes.some((theme) => theme.theme_type === "company"));
    if (view === "watchlist") output = output.filter((market) => watchlist.includes(market.ticker));
    return output;
  }, [markets, view, watchlist]);

  const summary = useMemo(() => summarizeMarkets(filteredMarkets), [filteredMarkets]);
  const themeRollups = useMemo(() => buildThemeRollups(filteredMarkets), [filteredMarkets]);
  const selectedIsSaved = Boolean(selectedMarket && watchlist.includes(selectedMarket.ticker));

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Market",
        cell: (info) => (
          <button className="market-title" onClick={() => setSelectedTicker(info.row.original.ticker)}>
            <span>{info.getValue()}</span>
            <small>{info.row.original.ticker}</small>
          </button>
        )
      }),
      columnHelper.accessor((row) => row.themes[0]?.name ?? "Unclassified", {
        id: "theme",
        header: "Theme",
        cell: (info) => <span className="theme-chip">{info.getValue()}</span>
      }),
      columnHelper.accessor((row) => row.derived_quote?.implied_probability_mid, {
        id: "implied_probability_mid",
        header: "Probability",
        cell: (info) => <strong>{formatPercent(info.getValue())}</strong>
      }),
      columnHelper.accessor((row) => row.derived_quote?.probability_change_bps, {
        id: "probability_change_bps",
        header: "24h Chg",
        cell: (info) => <Change value={info.getValue()} />
      }),
      columnHelper.accessor((row) => row.derived_quote?.bid_ask_spread, {
        id: "spread",
        header: "Spread",
        cell: (info) => formatPercent(info.getValue(), 1)
      }),
      columnHelper.accessor((row) => row.derived_quote?.volume_24h, {
        id: "volume_24h",
        header: "Vol 24h",
        cell: (info) => formatCompact(info.getValue())
      }),
      columnHelper.accessor((row) => row.derived_quote?.open_interest, {
        id: "open_interest",
        header: "Open Int.",
        cell: (info) => formatCompact(info.getValue())
      }),
      columnHelper.accessor("close_at", {
        header: "Close",
        cell: (info) => formatDate(info.getValue())
      })
    ],
    []
  );

  // TanStack Table intentionally returns imperative helpers that React Compiler should not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredMarkets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">KS</div>
          <div>
            <strong>Kalshi Signals</strong>
            <span>Research dashboard</span>
          </div>
        </div>
        <nav className="nav-list">
          <NavButton active={view === "home"} icon={<BarChart3 />} label="Home" onClick={() => setView("home")} />
          <NavButton
            active={view === "explorer"}
            icon={<Table2 />}
            label="Market Explorer"
            onClick={() => setView("explorer")}
          />
          <NavButton active={view === "macro"} icon={<Factory />} label="Macro" onClick={() => setView("macro")} />
          <NavButton
            active={view === "company"}
            icon={<Building2 />}
            label="Company/KPI"
            onClick={() => setView("company")}
          />
          <NavButton active={view === "themes"} icon={<LineChart />} label="Themes" onClick={() => setView("themes")} />
          <NavButton
            active={view === "watchlist"}
            icon={<Bookmark />}
            label="Watchlist"
            onClick={() => setView("watchlist")}
          />
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={16} />
          <span>Read-only prototype. No trading endpoints are exposed.</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{titleForView(view)}</h1>
            <p>Market probabilities, movement, liquidity, and themes.</p>
          </div>
          <div className="topbar-tools">
            <label className="search-box">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search markets" />
            </label>
            <HealthBadge envelope={marketsQuery.data} loading={marketsQuery.isLoading} />
          </div>
        </header>

        <div className="summary-grid">
          <MetricCard icon={<DatabaseZap />} label="Tracked markets" value={String(summary.count)} detail={`${summary.active} open`} />
          <MetricCard icon={<Gauge />} label="Average spread" value={formatPercent(summary.avgSpread, 1)} detail="yes bid/ask" />
          <MetricCard icon={<CircleDollarSign />} label="24h volume" value={formatCompact(summary.totalVolume24h)} detail="contracts" />
          <MetricCard
            icon={<CalendarClock />}
            label="Largest move"
            value={formatSignedBps(summary.topMover?.derived_quote?.probability_change_bps)}
            detail={summary.topMover?.ticker ?? "n/a"}
          />
        </div>

        <section className="content-grid">
          <div className="main-column">
            <Toolbar
              selectedTheme={themeFilter}
              onThemeChange={setThemeFilter}
              source={marketsQuery.data?.source}
              count={filteredMarkets.length}
            />
            <ThemeStrip rollups={themeRollups} />

            {view === "themes" ? (
              <ThemeBoard rollups={themeRollups} />
            ) : (
              <MarketTable
                table={table}
                loading={marketsQuery.isLoading}
                selectedTicker={selectedMarket?.ticker}
                onSelect={setSelectedTicker}
              />
            )}
          </div>

          <DetailRail
            market={selectedMarket}
            candles={candlesQuery.data?.data ?? []}
            orderbook={orderbookQuery.data?.data}
            loading={candlesQuery.isLoading || orderbookQuery.isLoading}
            saved={selectedIsSaved}
            onToggleSaved={() => {
              if (!selectedMarket) return;
              setWatchlist((current) =>
                current.includes(selectedMarket.ticker)
                  ? current.filter((ticker) => ticker !== selectedMarket.ticker)
                  : [...current, selectedMarket.ticker]
              );
            }}
          />
        </section>
      </section>
    </main>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "nav-button active" : "nav-button"} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {active ? <ChevronRight size={14} /> : null}
    </button>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Toolbar({
  selectedTheme,
  onThemeChange,
  source,
  count
}: {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
  source?: "live" | "sample";
  count: number;
}) {
  return (
    <div className="toolbar">
      <div>
        <strong>Market Explorer</strong>
        <span>{count} rows</span>
      </div>
      <select value={selectedTheme} onChange={(event) => onThemeChange(event.target.value)} aria-label="Theme filter">
        <option value="all">All themes</option>
        {THEMES.map((theme) => (
          <option key={theme.slug} value={theme.slug}>
            {theme.name}
          </option>
        ))}
      </select>
      <span className={source === "live" ? "source-pill live" : "source-pill"}>{source ?? "loading"}</span>
    </div>
  );
}

function MarketTable({
  table,
  loading,
  selectedTicker,
  onSelect
}: {
  table: ReturnType<typeof useReactTable<ClassifiedMarket>>;
  loading: boolean;
  selectedTicker?: string;
  onSelect: (ticker: string) => void;
}) {
  return (
    <div className="table-panel">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8} className="empty-state">
                <Loader2 className="spin" size={18} /> Loading Kalshi markets
              </td>
            </tr>
          ) : null}
          {!loading && table.getRowModel().rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="empty-state">
                No markets match the current filters.
              </td>
            </tr>
          ) : null}
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={row.original.ticker === selectedTicker ? "selected" : ""}
              onClick={() => onSelect(row.original.ticker)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailRail({
  market,
  candles,
  orderbook,
  loading,
  saved,
  onToggleSaved
}: {
  market?: ClassifiedMarket;
  candles: MarketCandlestick[];
  orderbook?: OrderbookSummary;
  loading: boolean;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  if (!market) {
    return (
      <aside className="detail-rail">
        <div className="panel empty-state">Select a market to inspect its quote, history, rules, and raw payload.</div>
      </aside>
    );
  }

  const quote = market.derived_quote;
  const chartData = candles.map((candle) => ({
    time: formatDate(candle.period_end_at),
    probability: candle.price_close ?? candle.price_mean,
    volume: candle.volume
  }));

  return (
    <aside className="detail-rail">
      <div className="panel market-detail">
        <div className="detail-header">
          <div>
            <span className="theme-chip">{market.themes[0]?.name}</span>
            <h2>{market.title}</h2>
            <p>{market.ticker}</p>
          </div>
          <button className="icon-button" onClick={onToggleSaved} aria-label="Toggle watchlist">
            {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
        </div>

        <div className="quote-grid">
          <DetailMetric label="Implied prob." value={formatPercent(quote?.implied_probability_mid)} />
          <DetailMetric label="24h move" value={formatSignedBps(quote?.probability_change_bps)} />
          <DetailMetric label="Spread" value={formatPercent(quote?.bid_ask_spread, 1)} />
          <DetailMetric label="Liquidity" value={formatCompact(quote?.liquidity)} />
        </div>

        <div className="chart-card">
          <div className="section-heading">
            <strong>Probability history</strong>
            {loading ? <Loader2 className="spin" size={14} /> : null}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="probabilityFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1b8a84" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#1b8a84" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e7edf1" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} domain={[0, 1]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => formatPercent(Number(value))} />
              <Area type="monotone" dataKey="probability" stroke="#1b8a84" fill="url(#probabilityFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="section-heading">
            <strong>Volume and depth</strong>
            <span>Depth 10: {formatCompact(orderbook?.depth_10)}</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData.slice(-12)}>
              <CartesianGrid stroke="#e7edf1" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip formatter={(value) => formatCompact(Number(value))} />
              <Bar dataKey="volume" fill="#56799f" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rules-block">
          <div className="section-heading">
            <strong>Contract rules</strong>
            <ExternalLink size={14} />
          </div>
          <p>{market.rules_primary ?? "Rules are available in the raw Kalshi payload when returned by the API."}</p>
          {market.rules_secondary ? <p>{market.rules_secondary}</p> : null}
        </div>

        <details className="raw-block">
          <summary>Raw Kalshi payload</summary>
          <pre>{JSON.stringify(market.raw, null, 2)}</pre>
        </details>
      </div>
    </aside>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ThemeBoard({ rollups }: { rollups: Array<{ type: ThemeType; label: string; count: number; volume: number; movers: number }> }) {
  return (
    <div className="theme-board">
      {rollups.map((rollup) => (
        <article key={rollup.type} className="theme-rollup">
          <span>{rollup.label}</span>
          <strong>{rollup.count} markets</strong>
          <p>{formatCompact(rollup.volume)} 24h volume</p>
          <Change value={rollup.movers} />
        </article>
      ))}
      {THEMES.map((theme) => (
        <article key={theme.slug} className="theme-definition">
          <span>{theme.theme_type}</span>
          <strong>{theme.name}</strong>
          <p>{theme.description}</p>
        </article>
      ))}
    </div>
  );
}

function ThemeStrip({
  rollups
}: {
  rollups: Array<{ type: ThemeType; label: string; count: number; volume: number; movers: number }>;
}) {
  return (
    <div className="theme-strip">
      {rollups.map((rollup) => (
        <div key={rollup.type}>
          <span>{rollup.label}</span>
          <strong>{rollup.count}</strong>
          <small>{formatSignedBps(rollup.movers)}</small>
        </div>
      ))}
    </div>
  );
}

function HealthBadge({ envelope, loading }: { envelope?: MarketEnvelope; loading: boolean }) {
  if (loading) {
    return (
      <div className="health-badge">
        <Loader2 className="spin" size={16} />
        <span>Checking API</span>
      </div>
    );
  }

  const ok = envelope?.api_health.ok;
  return (
    <div className={ok ? "health-badge ok" : "health-badge warn"} title={envelope?.api_health.message}>
      {ok ? <Wifi size={16} /> : <WifiOff size={16} />}
      <span>{ok ? "Kalshi live" : "Sample fallback"}</span>
    </div>
  );
}

function Change({ value }: { value?: number }) {
  const className = value === undefined ? "change" : value >= 0 ? "change positive" : "change negative";
  return <span className={className}>{formatSignedBps(value)}</span>;
}

function titleForView(view: ViewKey) {
  const map: Record<ViewKey, string> = {
    home: "Prediction market overview",
    explorer: "Market explorer",
    macro: "Macro dashboard",
    company: "Company and KPI dashboard",
    themes: "Theme coverage",
    watchlist: "Browser-local watchlist"
  };
  return map[view];
}

function buildThemeRollups(markets: ClassifiedMarket[]) {
  const types: Array<{ type: ThemeType; label: string }> = [
    { type: "macro", label: "Macro" },
    { type: "company", label: "Company" },
    { type: "markets", label: "Markets" },
    { type: "policy", label: "Policy" }
  ];

  return types.map(({ type, label }) => {
    const matching = markets.filter((market) => market.themes.some((theme) => theme.theme_type === type));
    return {
      type,
      label,
      count: matching.length,
      volume: matching.reduce((sum, market) => sum + (market.derived_quote?.volume_24h ?? 0), 0),
      movers: matching.reduce((sum, market) => sum + Math.abs(market.derived_quote?.probability_change_bps ?? 0), 0)
    };
  });
}
