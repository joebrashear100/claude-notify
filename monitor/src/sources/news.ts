import { capSeen, httpGet } from "../http.js";
import type { Signal, SourceContext, SourceResult } from "../types.js";

interface RssItem {
  title: string;
  link: string;
  id: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/gi, "'");
}

function extractTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  const raw = m?.[1] ?? "";
  return decodeEntities(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
}

/** Parse the <item> entries out of an RSS feed without external deps. */
export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (const b of blocks) {
    const block = b.split(/<\/item>/i)[0] ?? "";
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const guid = extractTag(block, "guid") || link;
    if (title && guid) items.push({ title, link, id: guid });
  }
  return items;
}

/** Watches Google News RSS for new headlines across the configured themes. */
export async function checkNews(ctx: SourceContext): Promise<SourceResult> {
  const { config, state, seed } = ctx;
  const signals: Signal[] = [];
  const errors: string[] = [];
  const seen = new Set(state.news ?? []);

  for (const q of config.newsQueries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
        q.query,
      )}&hl=en-US&gl=US&ceid=US:en`;
      const res = await httpGet(url);
      if (!res.ok) {
        errors.push(`news[${q.label}]: HTTP ${res.status}`);
        continue;
      }

      const items = parseRssItems(res.text);
      let emitted = 0;
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        if (seed) continue;
        if (emitted >= config.maxNewsPerQuery) continue; // remembered but not alerted
        emitted++;
        signals.push({
          tier: q.tier,
          source: "news",
          id: `news-${item.id}`,
          title: `${q.label}: ${item.title}`,
          message: "New headline matching your watch query.",
          url: item.link,
        });
      }
    } catch (e) {
      errors.push(`news[${q.label}]: ${(e as Error).message}`);
    }
  }

  state.news = capSeen([...seen], config.maxSeen);
  return { signals, errors };
}
