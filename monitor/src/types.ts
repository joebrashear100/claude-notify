/** Signal tiers, mirroring the monitoring thesis (1 = fastest mover). */
export type Tier = 1 | 2 | 3 | 4;

/** A single news search to run against Google News RSS. */
export interface NewsQuery {
  /** Raw search query. */
  query: string;
  /** Tier (drives notification priority). */
  tier: Tier;
  /** Short human label used in the alert. */
  label: string;
}

/** A FRED economic series to watch for new data releases. */
export interface FredSeries {
  id: string;
  label: string;
  tier: Tier;
}

/** Static monitor configuration. */
export interface Config {
  /** Equity ticker to track. */
  ticker: string;
  /** Absolute daily % move that fires a Tier-1 price alert. */
  priceMovePct: number;
  /** EDGAR form types worth alerting on. */
  edgarForms: string[];
  /** Tier assigned to each EDGAR form type. */
  edgarFormTiers: Record<string, Tier>;
  /** News searches to run. */
  newsQueries: NewsQuery[];
  /** FRED series to watch (requires FRED_API_KEY). */
  fredSeries: FredSeries[];
  /** Contact string sent in the EDGAR User-Agent header (SEC asks for this). */
  contactEmail: string;
  /** Cap on remembered ids per source to bound state growth. */
  maxSeen: number;
  /** Max new news alerts emitted per query per run (extras are silently seen). */
  maxNewsPerQuery: number;
}

/** A detected, actionable signal. */
export interface Signal {
  tier: Tier;
  /** Source key: "price" | "edgar" | "news" | "macro". */
  source: string;
  /** Stable dedupe id. */
  id: string;
  title: string;
  message: string;
  url?: string;
}

/** Persisted state carried across runs (stored as JSON). */
export interface MonitorState {
  /** Set once the baseline has been captured, so we don't alert on history. */
  initialized?: boolean;
  /** Last price alert, to avoid repeat alerts for the same day/direction. */
  price?: { date: string; bucket: "up" | "down" };
  /** Seen EDGAR accession numbers. */
  filings?: string[];
  /** Seen news item ids. */
  news?: string[];
  /** Per-series last observation date already alerted. */
  macro?: Record<string, string>;
}

/** Inputs handed to each source check. */
export interface SourceContext {
  config: Config;
  state: MonitorState;
  /** True on the very first run: capture baseline, emit no signals. */
  seed: boolean;
}

/** Output of a source check. */
export interface SourceResult {
  signals: Signal[];
  /** Non-fatal problems to log (a failing source never aborts the run). */
  errors: string[];
}
