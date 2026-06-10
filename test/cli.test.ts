import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli.js";

describe("parseArgs", () => {
  it("treats a bare argument as the title", () => {
    expect(parseArgs(["Build finished"]).title).toBe("Build finished");
  });

  it("parses flags and their values", () => {
    const args = parseArgs([
      "-l",
      "error",
      "-m",
      "tests failed",
      "--webhook",
      "https://h",
      "--format",
      "slack",
      "CI",
    ]);
    expect(args).toMatchObject({
      title: "CI",
      message: "tests failed",
      level: "error",
      webhook: "https://h",
      format: "slack",
    });
  });

  it("defaults level to info", () => {
    expect(parseArgs(["hi"]).level).toBe("info");
  });

  it("rejects invalid levels", () => {
    expect(() => parseArgs(["-l", "loud", "hi"])).toThrow(/Invalid level/);
  });

  it("rejects invalid formats", () => {
    expect(() => parseArgs(["-f", "carrier-pigeon", "hi"])).toThrow(
      /Invalid format/,
    );
  });

  it("rejects unknown options", () => {
    expect(() => parseArgs(["--nope"])).toThrow(/Unknown option/);
  });

  it("errors when a flag is missing its value", () => {
    expect(() => parseArgs(["--title"])).toThrow(/Missing value/);
  });

  it("sets help and quiet flags", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-q", "hi"]).quiet).toBe(true);
  });
});
