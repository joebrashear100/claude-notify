import type { Config } from "./types.js";

/**
 * Default monitor configuration tuned for the SNDK / NAND-cycle thesis.
 *
 * Tier mapping follows the thesis:
 *   Tier 1 - immediate movers (price shocks, Samsung supply, TrendForce, Nvidia)
 *   Tier 2 - structural (earnings filings, hyperscaler capex, Kioxia/YMTC)
 *   Tier 3 - macro/cyclical (CPI, jobs, Fed, capacity timing)
 *   Tier 4 - sentiment/positioning (insider Form 4, 13F, short interest)
 */
export const defaultConfig: Config = {
  ticker: process.env.MONITOR_TICKER ?? "SNDK",
  priceMovePct: Number(process.env.MONITOR_PRICE_MOVE_PCT ?? "5"),

  edgarForms: ["8-K", "10-Q", "10-K", "4", "13F-HR", "SC 13D", "SC 13G"],
  edgarFormTiers: {
    "8-K": 2,
    "10-Q": 2,
    "10-K": 2,
    "4": 4,
    "13F-HR": 4,
    "SC 13D": 4,
    "SC 13G": 4,
  },

  newsQueries: [
    // Tier 1 - immediate movers
    { label: "Samsung NAND supply", tier: 1, query: "Samsung NAND production OR capex OR strike OR contract price" },
    { label: "TrendForce NAND pricing", tier: 1, query: "TrendForce NAND flash contract price" },
    { label: "Nvidia AI storage", tier: 1, query: "Nvidia Rubin OR Feynman memory OR storage NAND" },
    { label: "SanDisk / SNDK", tier: 1, query: "SanDisk SNDK NAND earnings OR pricing OR guidance" },
    // Tier 2 - structural
    { label: "Hyperscaler SSD capex", tier: 2, query: "hyperscaler enterprise SSD procurement OR data center NAND demand" },
    { label: "Kioxia", tier: 2, query: "Kioxia NAND OR IPO OR joint venture" },
    { label: "YMTC", tier: 2, query: "YMTC NAND market share OR export controls" },
    { label: "BiCS / 3D NAND", tier: 2, query: "BiCS 332-layer NAND OR 3D NAND yield ramp" },
    // Tier 3 - capacity/cycle
    { label: "NAND capacity expansion", tier: 3, query: "NAND fab capacity expansion OR groundbreaking Samsung OR SK Hynix OR Micron" },
  ],

  // Tier 3 macro releases (only active when FRED_API_KEY is set)
  fredSeries: [
    { id: "CPIAUCSL", label: "CPI", tier: 3 },
    { id: "PAYEMS", label: "Nonfarm payrolls", tier: 3 },
    { id: "FEDFUNDS", label: "Fed funds rate", tier: 3 },
  ],

  contactEmail: process.env.CONTACT_EMAIL ?? "monitor@example.com",
  // Must exceed the total items concurrently present across all news feeds
  // (~100 per query); otherwise old-but-still-listed items get truncated from
  // state and re-alert. Google News only lists recent items, so this bounds it.
  maxSeen: 2500,
  maxNewsPerQuery: 5,
};
