import { describe, expect, it } from "vitest";
import { LEVELS, isLevel, meetsThreshold, severity } from "../src/levels.js";

describe("levels", () => {
  it("orders severities ascending", () => {
    expect(severity("debug")).toBeLessThan(severity("info"));
    expect(severity("info")).toBeLessThan(severity("warning"));
    expect(severity("warning")).toBeLessThan(severity("error"));
  });

  it("exposes all levels", () => {
    expect([...LEVELS]).toEqual(["debug", "info", "warning", "error"]);
  });

  it("meetsThreshold is inclusive at the boundary", () => {
    expect(meetsThreshold("warning", "warning")).toBe(true);
    expect(meetsThreshold("error", "warning")).toBe(true);
    expect(meetsThreshold("info", "warning")).toBe(false);
  });

  it("isLevel narrows valid strings only", () => {
    expect(isLevel("error")).toBe(true);
    expect(isLevel("nope")).toBe(false);
    expect(isLevel(42)).toBe(false);
  });
});
