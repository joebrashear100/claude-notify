import { describe, expect, it } from "vitest";
import { parseRssItems } from "../monitor/src/sources/news.js";
import { tierToLevel } from "../monitor/src/notify.js";
import { capSeen } from "../monitor/src/http.js";

describe("monitor: parseRssItems", () => {
  it("extracts title/link/guid and decodes CDATA + entities", () => {
    const xml = `<rss><channel>
      <item>
        <title><![CDATA[Samsung cuts NAND output &amp; raises prices]]></title>
        <link>https://news.example.com/a</link>
        <guid>guid-a</guid>
      </item>
      <item>
        <title>TrendForce: contract index down 4%</title>
        <link>https://news.example.com/b</link>
        <guid isPermaLink="false">guid-b</guid>
      </item>
    </channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "Samsung cuts NAND output & raises prices",
      link: "https://news.example.com/a",
      id: "guid-a",
    });
    expect(items[1]!.id).toBe("guid-b");
  });

  it("falls back to link when guid is absent", () => {
    const xml = `<item><title>X</title><link>https://e/c</link></item>`;
    expect(parseRssItems(xml)[0]!.id).toBe("https://e/c");
  });

  it("returns nothing for a feed with no items", () => {
    expect(parseRssItems("<rss><channel></channel></rss>")).toEqual([]);
  });
});

describe("monitor: tierToLevel", () => {
  it("maps tiers to notification levels", () => {
    expect(tierToLevel(1)).toBe("error");
    expect(tierToLevel(2)).toBe("warning");
    expect(tierToLevel(3)).toBe("info");
    expect(tierToLevel(4)).toBe("info");
  });
});

describe("monitor: capSeen", () => {
  it("keeps only the most recent ids", () => {
    expect(capSeen(["a", "b", "c", "d"], 2)).toEqual(["c", "d"]);
    expect(capSeen(["a"], 5)).toEqual(["a"]);
  });
});
