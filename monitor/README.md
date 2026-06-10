# SNDK signal monitor

A self-contained, scheduled monitor for the SNDK / NAND-cycle thesis. It checks
free, structured data sources, dedupes against persisted state, and pushes
**tiered ntfy alerts** by invoking the `claude-notify` CLI.

It is designed to run as a **GitHub Actions cron job** (see
`.github/workflows/monitor.yml`) — no server to manage.

## What it watches (free sources only)

| Source | Signal | Tier |
| --- | --- | --- |
| **Yahoo Finance** | SNDK daily move ≥ `priceMovePct` (default 5%) | 1 |
| **Google News RSS** | New headlines for Samsung NAND, TrendForce, Nvidia, Kioxia, YMTC, hyperscaler capex, BiCS, capacity | 1–3 |
| **SEC EDGAR** | New filings: 8-K / 10-Q / 10-K (T2), Form 4 insider / 13F / 13D / 13G (T4) | 2 / 4 |
| **FRED** *(needs key)* | New CPI, payrolls, Fed-funds observations | 3 |

Tiers map to ntfy priority via `claude-notify` levels: **T1 → error (max push)**,
**T2 → warning (high)**, **T3/T4 → info (default)**.

### Paywalled sources (not automated)

TrendForce's contract index, SemiAnalysis, The Elec, and Digitimes are
subscription-only with no free API. The news scan catches when *other* outlets
report on them, but the primary feeds aren't ingested. To add one, drop a new
file in `src/sources/` returning `Signal[]` and register it in `run.ts`.

## Setup

1. **Subscribe to an ntfy topic.** Pick a hard-to-guess name (anyone who knows a
   public topic can read it) and subscribe in the [ntfy app](https://ntfy.sh).
2. **Add repository secrets** (Settings → Secrets and variables → Actions):
   - `NTFY_TOPIC` *(required)* — your topic name.
   - `NTFY_SERVER` *(optional)* — self-hosted base URL (default `https://ntfy.sh`).
   - `NTFY_TOKEN` *(optional)* — bearer token for a protected topic.
   - `FRED_API_KEY` *(optional)* — free key from
     <https://fredaccount.stlouisfed.org/apikeys> to enable the macro source.
   - `CONTACT_EMAIL` *(optional)* — sent in the EDGAR User-Agent, per SEC etiquette.
3. **Merge to the default branch.** Scheduled workflows only fire from the
   default branch. After merge, the monitor runs every 30 minutes; trigger it
   manually anytime via the **Run workflow** button (workflow_dispatch).

The first run captures a **baseline** (no alerts) and sends a single
"monitor initialized" notification. Subsequent runs alert only on new items.

## State

State lives as `state.json` on a dedicated `monitor-state` branch, committed with
`[skip ci]` so it never triggers other workflows. Delete that branch to reset the
baseline.

## Run locally

```bash
npm ci
npm run build           # build the claude-notify CLI (the monitor shells out to it)
npm run build:monitor   # compile monitor/src -> monitor/dist
CLAUDE_NOTIFY_NTFY_TOPIC=my-topic STATE_FILE=monitor/state.json npm run monitor
```

Without `CLAUDE_NOTIFY_NTFY_TOPIC`, signals are logged to the console instead of
pushed — handy for a dry run.

## Tuning

Edit `src/config.ts`: price threshold, news queries and their tiers, EDGAR forms,
FRED series. Environment overrides: `MONITOR_TICKER`, `MONITOR_PRICE_MOVE_PCT`,
`CONTACT_EMAIL`.
