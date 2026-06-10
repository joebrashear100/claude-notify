import { httpGet } from "../http.js";
import type { Signal, SourceContext, SourceResult } from "../types.js";

/**
 * Watches FRED for newly released macro data (CPI, payrolls, Fed funds).
 * No-ops with a note when FRED_API_KEY is not configured (a free key from
 * https://fredaccount.stlouisfed.org/apikeys enables this source).
 */
export async function checkMacro(ctx: SourceContext): Promise<SourceResult> {
  const { config, state, seed } = ctx;
  const signals: Signal[] = [];
  const errors: string[] = [];

  const key = process.env.FRED_API_KEY;
  if (!key) {
    errors.push("macro: skipped (FRED_API_KEY not set)");
    return { signals, errors };
  }

  const macro = state.macro ?? {};

  for (const series of config.fredSeries) {
    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}` +
        `&api_key=${key}&file_type=json&sort_order=desc&limit=1`;
      const res = await httpGet(url);
      if (!res.ok) {
        errors.push(`macro[${series.label}]: HTTP ${res.status}`);
        continue;
      }

      const data = JSON.parse(res.text);
      const obs = data?.observations?.[0];
      const date: string | undefined = obs?.date;
      const value: string | undefined = obs?.value;
      if (!date || value === undefined) {
        errors.push(`macro[${series.label}]: no observations`);
        continue;
      }

      const prevDate = macro[series.id];
      const isNew = prevDate === undefined ? true : date > prevDate;
      if (isNew && !seed) {
        signals.push({
          tier: series.tier,
          source: "macro",
          id: `macro-${series.id}-${date}`,
          title: `${series.label} update: ${value}`,
          message: `New FRED observation for ${series.label} (${series.id}) dated ${date}.`,
          url: `https://fred.stlouisfed.org/series/${series.id}`,
        });
      }
      macro[series.id] = date;
    } catch (e) {
      errors.push(`macro[${series.label}]: ${(e as Error).message}`);
    }
  }

  state.macro = macro;
  return { signals, errors };
}
