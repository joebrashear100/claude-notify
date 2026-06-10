import { describe, expect, it, vi } from "vitest";
import { NtfyChannel } from "../src/channels/ntfy.js";
import type { Notification } from "../src/types.js";

const note: Notification = {
  title: "NAND contract index dropped",
  message: "TrendForce monthly index -4%",
  level: "warning",
  timestamp: new Date("2026-06-10T00:00:00.000Z"),
};

function okFetch() {
  return vi.fn(async () => new Response(null, { status: 200 }));
}

describe("NtfyChannel", () => {
  it("requires a topic", () => {
    expect(() => new NtfyChannel({ topic: "" })).toThrow(/topic/);
  });

  it("POSTs the JSON publish payload to the server root", async () => {
    const fetch = okFetch();
    const channel = new NtfyChannel({ topic: "sndk-alerts", fetch });

    await channel.send(note);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://ntfy.sh");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({
      topic: "sndk-alerts",
      title: "NAND contract index dropped",
      message: "TrendForce monthly index -4%",
      priority: 4,
      tags: ["warning"],
      markdown: true,
    });
  });

  it("maps levels to ntfy priorities", () => {
    const channel = new NtfyChannel({ topic: "t", fetch: okFetch() });
    expect((channel.serialize({ ...note, level: "debug" }) as any).priority).toBe(2);
    expect((channel.serialize({ ...note, level: "info" }) as any).priority).toBe(3);
    expect((channel.serialize({ ...note, level: "warning" }) as any).priority).toBe(4);
    expect((channel.serialize({ ...note, level: "error" }) as any).priority).toBe(5);
  });

  it("falls back to the title when there is no message", () => {
    const channel = new NtfyChannel({ topic: "t", fetch: okFetch() });
    const payload = channel.serialize({ ...note, message: undefined });
    expect(payload.message).toBe(note.title);
  });

  it("strips trailing slashes from a custom server url", async () => {
    const fetch = okFetch();
    const channel = new NtfyChannel({
      topic: "t",
      server: "https://ntfy.example.com/",
      fetch,
    });
    await channel.send(note);
    expect(fetch.mock.calls[0]![0]).toBe("https://ntfy.example.com");
  });

  it("sends a bearer token for protected topics", async () => {
    const fetch = okFetch();
    const channel = new NtfyChannel({ topic: "t", token: "tk_secret", fetch });
    await channel.send(note);
    const headers = fetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer tk_secret");
  });

  it("throws on non-2xx responses", async () => {
    const fetch = vi.fn(
      async () => new Response(null, { status: 403, statusText: "Forbidden" }),
    );
    const channel = new NtfyChannel({ topic: "t", fetch });
    await expect(channel.send(note)).rejects.toThrow(/403/);
  });

  it("respects a custom priority map", () => {
    const channel = new NtfyChannel({
      topic: "t",
      fetch: okFetch(),
      priorityMap: { debug: 1, info: 1, warning: 5, error: 5 },
    });
    expect((channel.serialize({ ...note, level: "warning" }) as any).priority).toBe(5);
  });
});
