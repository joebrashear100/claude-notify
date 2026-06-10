export * from "./types.js";
export * from "./levels.js";
export * from "./notifier.js";
export * from "./channels/index.js";

import { Notifier, type NotifierOptions } from "./notifier.js";

/** Convenience factory for a {@link Notifier}. */
export function createNotifier(options?: NotifierOptions): Notifier {
  return new Notifier(options);
}
