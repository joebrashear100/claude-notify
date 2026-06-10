import { readFile, writeFile } from "node:fs/promises";
import type { MonitorState } from "./types.js";

/** Path to the JSON state file (override with STATE_FILE). */
export function statePath(): string {
  return process.env.STATE_FILE ?? "monitor/state.json";
}

/** Load persisted state, returning an empty object when absent or invalid. */
export async function loadState(): Promise<MonitorState> {
  try {
    const raw = await readFile(statePath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as MonitorState) : {};
  } catch {
    return {};
  }
}

/** Persist state as pretty-printed JSON. */
export async function saveState(state: MonitorState): Promise<void> {
  await writeFile(statePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
