import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { Signal, Tier } from "./types.js";

const execFileAsync = promisify(execFile);

/** Map a thesis tier to a claude-notify level (drives ntfy priority). */
export function tierToLevel(tier: Tier): "error" | "warning" | "info" {
  if (tier === 1) return "error"; // max-priority push
  if (tier === 2) return "warning";
  return "info";
}

/**
 * Deliver a signal by invoking the claude-notify CLI, which routes to ntfy
 * (server/token are read from CLAUDE_NOTIFY_NTFY_* env by the CLI). When no
 * topic is configured the signal is logged instead of dropped.
 */
export async function dispatch(signal: Signal): Promise<void> {
  const level = tierToLevel(signal.tier);
  const title = `[T${signal.tier}|${signal.source}] ${signal.title}`;
  const message = signal.url ? `${signal.message}\n${signal.url}` : signal.message;

  const topic = process.env.CLAUDE_NOTIFY_NTFY_TOPIC;
  if (!topic) {
    console.warn(`[no NTFY topic] ${level.toUpperCase()} ${title} - ${message}`);
    return;
  }

  const cli =
    process.env.CLI_PATH ?? path.resolve(process.cwd(), "dist/cli.js");
  await execFileAsync(process.execPath, [
    cli,
    "--ntfy",
    topic,
    "--quiet",
    "-l",
    level,
    "-m",
    message,
    title,
  ]);
}
