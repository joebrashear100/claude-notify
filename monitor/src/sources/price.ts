import { httpGet } from "../http.js";
import type { Signal, SourceContext, SourceResult } from "../types.js";

/** Watches intraday price moves via the public Yahoo Finance chart endpoint. */
export async function checkPrice(ctx: SourceContext): Promise<SourceResult> {
  const { config, state, seed } = ctx;
  const signals: Signal[] = [];
  const errors: string[] = [];

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      config.ticker,
    )}?range=2d&interval=1d`;
    const res = await httpGet(url);
    if (!res.ok) {
      errors.push(`price: HTTP ${res.status}`);
      return { signals, errors };
    }

    const data = JSON.parse(res.text);
    const meta = data?.chart?.result?.[0]?.meta;
    const price: unknown = meta?.regularMarketPrice;
    const prev: unknown = meta?.chartPreviousClose ?? meta?.previousClose;
    const volume: number = typeof meta?.regularMarketVolume === "number" ? meta.regularMarketVolume : 0;

    if (typeof price !== "number" || typeof prev !== "number" || prev === 0) {
      errors.push("price: missing price fields in payload");
      return { signals, errors };
    }

    const pct = ((price - prev) / prev) * 100;
    const big = Math.abs(pct) >= config.priceMovePct;
    if (!big) return { signals, errors };

    const today = new Date().toISOString().slice(0, 10);
    const bucket: "up" | "down" = pct >= 0 ? "up" : "down";
    const alreadyAlerted =
      state.price?.date === today && state.price?.bucket === bucket;

    if (!seed && !alreadyAlerted) {
      const sign = pct >= 0 ? "+" : "";
      signals.push({
        tier: 1,
        source: "price",
        id: `price-${today}-${bucket}`,
        title: `${config.ticker} ${sign}${pct.toFixed(1)}% to $${price.toFixed(2)}`,
        message: `Daily move ${sign}${pct.toFixed(2)}% from prev close $${prev.toFixed(
          2,
        )}. Volume ${new Intl.NumberFormat("en-US").format(volume)}.`,
        url: `https://finance.yahoo.com/quote/${config.ticker}`,
      });
    }
    state.price = { date: today, bucket };
  } catch (e) {
    errors.push(`price: ${(e as Error).message}`);
  }

  return { signals, errors };
}
