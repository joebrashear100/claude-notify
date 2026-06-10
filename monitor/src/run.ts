import { defaultConfig } from "./config.js";
import { dispatch } from "./notify.js";
import { loadState, saveState } from "./state.js";
import { checkEdgar } from "./sources/edgar.js";
import { checkMacro } from "./sources/macro.js";
import { checkNews } from "./sources/news.js";
import { checkPrice } from "./sources/price.js";
import type { Signal, SourceContext, SourceResult } from "./types.js";

const SOURCES = [
  { name: "price", run: checkPrice },
  { name: "edgar", run: checkEdgar },
  { name: "news", run: checkNews },
  { name: "macro", run: checkMacro },
];

async function main(): Promise<void> {
  const config = defaultConfig;
  const state = await loadState();
  const seed = !state.initialized;

  if (seed) {
    console.log("First run: capturing baseline, no alerts will be sent.");
  }

  const ctx: SourceContext = { config, state, seed };

  const results = await Promise.all(
    SOURCES.map(async (s): Promise<{ name: string } & SourceResult> => {
      try {
        const r = await s.run(ctx);
        return { name: s.name, ...r };
      } catch (e) {
        return { name: s.name, signals: [], errors: [`${s.name}: ${(e as Error).message}`] };
      }
    }),
  );

  const signals: Signal[] = [];
  for (const r of results) {
    signals.push(...r.signals);
    for (const err of r.errors) console.warn(`warn: ${err}`);
  }

  // Higher tier (=lower number) first.
  signals.sort((a, b) => a.tier - b.tier);

  if (seed) {
    state.initialized = true;
    await saveState(state);
    const counts = results
      .map((r) => `${r.name}:${r.errors.length ? "err" : "ok"}`)
      .join(" ");
    await dispatch({
      tier: 3,
      source: "monitor",
      id: "init",
      title: `${config.ticker} monitor initialized`,
      message: `Baseline captured. Watching price, EDGAR, news, and macro. Sources: ${counts}.`,
    });
    console.log("Baseline saved; init notification sent.");
    return;
  }

  for (const signal of signals) {
    try {
      await dispatch(signal);
      console.log(`sent: [T${signal.tier}|${signal.source}] ${signal.title}`);
    } catch (e) {
      console.error(`dispatch failed for ${signal.id}: ${(e as Error).message}`);
    }
  }

  await saveState(state);
  console.log(`Done. ${signals.length} signal(s) dispatched.`);
}

main().catch((e) => {
  console.error(`Monitor crashed: ${(e as Error).message}`);
  process.exitCode = 1;
});
