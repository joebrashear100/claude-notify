import type { NotificationLevel } from "./types.js";

/** All levels in ascending order of severity. */
export const LEVELS: readonly NotificationLevel[] = [
  "debug",
  "info",
  "warning",
  "error",
] as const;

const SEVERITY: Record<NotificationLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

/** Numeric severity for a level (debug=0 … error=3). */
export function severity(level: NotificationLevel): number {
  return SEVERITY[level];
}

/** True if `level` is at least as severe as `threshold`. */
export function meetsThreshold(
  level: NotificationLevel,
  threshold: NotificationLevel,
): boolean {
  return severity(level) >= severity(threshold);
}

/** Type guard for {@link NotificationLevel}. */
export function isLevel(value: unknown): value is NotificationLevel {
  return typeof value === "string" && value in SEVERITY;
}
