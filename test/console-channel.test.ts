import { describe, expect, it } from "vitest";
import { ConsoleChannel } from "../src/channels/console.js";
import type { Notification } from "../src/types.js";

const base: Notification = {
  title: "Build finished",
  message: "all green",
  level: "info",
  timestamp: new Date("2020-01-01T00:00:00.000Z"),
};

describe("ConsoleChannel", () => {
  it("writes a formatted line to its sink", async () => {
    const lines: string[] = [];
    const channel = new ConsoleChannel({ sink: (l) => lines.push(l), color: false });

    await channel.send(base);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      "2020-01-01T00:00:00.000Z i [INFO] Build finished - all green",
    );
  });

  it("omits the dash when there is no message", () => {
    const channel = new ConsoleChannel({ color: false });
    const line = channel.format({ ...base, message: undefined });
    expect(line).toBe("2020-01-01T00:00:00.000Z i [INFO] Build finished");
  });

  it("wraps the line in ANSI codes when color is enabled", () => {
    const channel = new ConsoleChannel({ color: true });
    const line = channel.format({ ...base, level: "error" });
    expect(line.startsWith("\x1b[31m")).toBe(true);
    expect(line.endsWith("\x1b[0m")).toBe(true);
  });

  it("defaults its name to 'console'", () => {
    expect(new ConsoleChannel().name).toBe("console");
  });
});
