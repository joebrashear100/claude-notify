import { describe, expect, it, vi } from "vitest";
import { Notifier } from "../src/notifier.js";
import type { Channel, Notification } from "../src/types.js";

function recordingChannel(name = "rec", minLevel?: Notification["level"]) {
  const received: Notification[] = [];
  const channel: Channel = {
    name,
    minLevel,
    async send(n) {
      received.push(n);
    },
  };
  return { channel, received };
}

describe("Notifier", () => {
  it("delivers to all registered channels", async () => {
    const a = recordingChannel("a");
    const b = recordingChannel("b");
    const notifier = new Notifier({ channels: [a.channel] }).use(b.channel);

    const results = await notifier.notify({ title: "hi" });

    expect(results).toEqual([
      { channel: "a", ok: true },
      { channel: "b", ok: true },
    ]);
    expect(a.received).toHaveLength(1);
    expect(b.received).toHaveLength(1);
    expect(notifier.channelNames).toEqual(["a", "b"]);
  });

  it("applies defaults: info level, timestamp, and merged meta", async () => {
    const { channel, received } = recordingChannel();
    const notifier = new Notifier({
      channels: [channel],
      defaultMeta: { app: "demo", env: "test" },
    });

    await notifier.notify({ title: "t", meta: { env: "prod" } });

    const n = received[0]!;
    expect(n.level).toBe("info");
    expect(n.timestamp).toBeInstanceOf(Date);
    // per-call meta overrides defaults, defaults still merged in
    expect(n.meta).toEqual({ app: "demo", env: "prod" });
  });

  it("skips channels below their minLevel", async () => {
    const { channel, received } = recordingChannel("errors-only", "error");
    const notifier = new Notifier({ channels: [channel] });

    const infoResult = await notifier.notify({ title: "t", level: "info" });
    expect(infoResult).toEqual([
      { channel: "errors-only", ok: true, skipped: true },
    ]);
    expect(received).toHaveLength(0);

    await notifier.notify({ title: "t", level: "error" });
    expect(received).toHaveLength(1);
  });

  it("isolates failures: one throwing channel does not block others", async () => {
    const ok = recordingChannel("ok");
    const boom: Channel = {
      name: "boom",
      async send() {
        throw new Error("kaboom");
      },
    };
    const notifier = new Notifier({ channels: [boom, ok.channel] });

    const results = await notifier.notify({ title: "t", level: "error" });

    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.error?.message).toBe("kaboom");
    expect(results[1]!).toEqual({ channel: "ok", ok: true });
    // the healthy channel still received it
    expect(ok.received).toHaveLength(1);
  });

  it("wraps non-Error throwables", async () => {
    const bad: Channel = {
      name: "bad",
      async send() {
        throw "string failure";
      },
    };
    const results = await new Notifier({ channels: [bad] }).notify({
      title: "t",
    });
    expect(results[0]!.error).toBeInstanceOf(Error);
    expect(results[0]!.error?.message).toBe("string failure");
  });

  it("requires a title", async () => {
    const notifier = new Notifier();
    await expect(notifier.notify({ title: "" })).rejects.toThrow(/title/);
  });

  it("level shorthands map to the right level", async () => {
    const { channel, received } = recordingChannel();
    const notifier = new Notifier({ channels: [channel] });

    await notifier.debug("d");
    await notifier.info("i");
    await notifier.warn("w");
    await notifier.error("e");

    expect(received.map((n) => n.level)).toEqual([
      "debug",
      "info",
      "warning",
      "error",
    ]);
  });

  it("uses a provided timestamp", async () => {
    const { channel, received } = recordingChannel();
    const when = new Date("2020-01-01T00:00:00.000Z");
    await new Notifier({ channels: [channel] }).notify({
      title: "t",
      timestamp: when,
    });
    expect(received[0]!.timestamp).toBe(when);
  });

  it("notify with no channels resolves to an empty result set", async () => {
    const spy = vi.fn();
    const results = await new Notifier().notify({ title: "t" });
    expect(results).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
