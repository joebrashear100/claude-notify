import { capSeen, httpGet } from "../http.js";
import type { Signal, SourceContext, SourceResult, Tier } from "../types.js";

/** Resolve a ticker to its zero-padded 10-digit SEC CIK. */
async function resolveCik(ticker: string, ua: string): Promise<string | null> {
  const res = await httpGet(
    "https://www.sec.gov/files/company_tickers.json",
    { "user-agent": ua },
  );
  if (!res.ok) throw new Error(`ticker map HTTP ${res.status}`);
  const map = JSON.parse(res.text) as Record<
    string,
    { cik_str: number; ticker: string; title: string }
  >;
  const want = ticker.toUpperCase();
  for (const key of Object.keys(map)) {
    const entry = map[key];
    if (entry && entry.ticker.toUpperCase() === want) {
      return String(entry.cik_str).padStart(10, "0");
    }
  }
  return null;
}

/** Watches SEC EDGAR for new filings (earnings, insider Form 4, 13F, etc.). */
export async function checkEdgar(ctx: SourceContext): Promise<SourceResult> {
  const { config, state, seed } = ctx;
  const signals: Signal[] = [];
  const errors: string[] = [];
  const ua = `claude-notify-monitor ${config.contactEmail}`;

  try {
    const cik = await resolveCik(config.ticker, ua);
    if (!cik) {
      errors.push(`edgar: no CIK found for ${config.ticker}`);
      return { signals, errors };
    }

    const res = await httpGet(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      { "user-agent": ua },
    );
    if (!res.ok) {
      errors.push(`edgar: submissions HTTP ${res.status}`);
      return { signals, errors };
    }

    const data = JSON.parse(res.text);
    const recent = data?.filings?.recent;
    const forms: string[] = recent?.form ?? [];
    const accessions: string[] = recent?.accessionNumber ?? [];
    const dates: string[] = recent?.filingDate ?? [];
    const docs: string[] = recent?.primaryDocument ?? [];
    const descs: string[] = recent?.primaryDocDescription ?? [];

    const seen = new Set(state.filings ?? []);
    const cikInt = String(Number(cik));

    for (let i = 0; i < accessions.length; i++) {
      const form = forms[i] ?? "";
      const accession = accessions[i] ?? "";
      if (!accession || seen.has(accession)) continue;
      if (!config.edgarForms.includes(form)) continue;

      seen.add(accession);

      if (!seed) {
        const tier: Tier = config.edgarFormTiers[form] ?? 2;
        const noDashes = accession.replace(/-/g, "");
        const url = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${noDashes}/${
          docs[i] || `${accession}-index.htm`
        }`;
        const desc = descs[i] ? ` - ${descs[i]}` : "";
        signals.push({
          tier,
          source: "edgar",
          id: `edgar-${accession}`,
          title: `${config.ticker} filed ${form}${desc}`,
          message: `New SEC filing ${form} dated ${dates[i] ?? "?"}.`,
          url,
        });
      }
    }

    state.filings = capSeen([...seen], config.maxSeen);
  } catch (e) {
    errors.push(`edgar: ${(e as Error).message}`);
  }

  return { signals, errors };
}
