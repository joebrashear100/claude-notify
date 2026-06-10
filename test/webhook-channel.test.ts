import { describe, expect, it, vi } from "vitest";
import { WebhookChannel } from "../src/channels/webhook.js";
import type { Notification } from "../src/types.js";

const note: Notification = {
  title: "Deploy",
  message: "needs attention",
  level: "warning",
  timestamp: new Date("2020-01-01T00:00:00.000Z"),
  meta: { service: "api" },
};

function okFetch() {
  return vi.fn(async () => new Response(null, { status: 200 }));
}

describe("WebhookChannel", () => {
  it("requires a url", () => {
    expect(() => new WebhookChannel({ url: "" })).toThrow(/url/);
  });

  it("POSTs JSON with the generic payload", async () => {
    const fetch = okFetch();
    const channel = new WebhookChannel({
      url: "https://example.com/hook",
      fetch,
    });

    await channel.send(note);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://example.com/hook");
    expect(init!.method).toBe("POST");
    expect((init!.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(init!.body as string)).toEqual({
      title: "Deploy",
      message: "needs attention",
      level: "warning",
      timestamp: "2020-01-01T00:00:00.000Z",
      meta: { service: "api" },
    });
  });

  it("formats slack payloads", () => {
    const channel = new WebhookChannel({ url: "x", format: "slack", fetch: okFetch() });
    expect(channel.serialize(note)).toEqual({
      text: "[WARNING] Deploy\nneeds attention",
    });
  });

  it("formats discord payloads", () => {
    const channel = new WebhookChannel({ url: "x", format: "discord", fetch: okFetch() });
    expect(channel.serialize(note)).toEqual({
      content: "**[WARNING]** Deploy\nneeds attention",
    });
  });

  it("merges custom headers over the default content-type", async () => {
    const fetch = okFetch();
    const channel = new WebhookChannel({
      url: "x",
      fetch,
      headers: { authorization: "Bearer t" },
    });
    await channel.send(note);
    const headers = fetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer t");
    expect(headers["content-type"]).toBe("application/json");
  });

  it("throws on non-2xx responses", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 500, statusText: "Server Error" }));
    const channel = new WebhookChannel({ url: "x", fetch });
    await expect(channel.send(note)).rejects.toThrow(/500/);
  });

  it("aborts after the configured timeout", async () => {
    const fetch = vi.fn((_url: unknown, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        );
      });
    }) as unknown as typeof globalThis.fetch;
    const channel = new WebhookChannel({ url: "x", fetch, timeoutMs: 5 });
    await expect(channel.send(note)).rejects.toThrow(/aborted/);
  });
});
