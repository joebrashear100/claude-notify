import { meetsThreshold } from "./levels.js";
import type {
  Channel,
  DeliveryResult,
  Notification,
  NotificationInput,
  NotificationLevel,
} from "./types.js";

export interface NotifierOptions {
  /** Channels to dispatch to. More can be added later via {@link Notifier.use}. */
  channels?: Channel[];
  /** Metadata merged into every notification (overridden by per-call meta). */
  defaultMeta?: Record<string, unknown>;
}

/**
 * Dispatches notifications to one or more channels.
 *
 * Delivery is concurrent and fault-isolated: a channel that throws does not
 * prevent others from receiving the notification, and per-channel outcomes are
 * returned as {@link DeliveryResult}s.
 */
export class Notifier {
  private readonly channels: Channel[];
  private readonly defaultMeta: Record<string, unknown>;

  constructor(options: NotifierOptions = {}) {
    this.channels = options.channels ? [...options.channels] : [];
    this.defaultMeta = options.defaultMeta ?? {};
  }

  /** Register an additional channel. Returns `this` for chaining. */
  use(channel: Channel): this {
    this.channels.push(channel);
    return this;
  }

  /** Names of all registered channels, in registration order. */
  get channelNames(): string[] {
    return this.channels.map((c) => c.name);
  }

  /** Send a notification to every registered channel. */
  async notify(input: NotificationInput): Promise<DeliveryResult[]> {
    if (!input.title) {
      throw new Error("Notification requires a title");
    }

    const notification: Notification = {
      title: input.title,
      message: input.message,
      level: input.level ?? "info",
      timestamp: input.timestamp ?? new Date(),
      meta: { ...this.defaultMeta, ...input.meta },
    };

    return Promise.all(
      this.channels.map((channel) => this.deliver(channel, notification)),
    );
  }

  private async deliver(
    channel: Channel,
    notification: Notification,
  ): Promise<DeliveryResult> {
    const threshold = channel.minLevel ?? "debug";
    if (!meetsThreshold(notification.level, threshold)) {
      return { channel: channel.name, ok: true, skipped: true };
    }
    try {
      await channel.send(notification);
      return { channel: channel.name, ok: true };
    } catch (err) {
      return {
        channel: channel.name,
        ok: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  private send(
    level: NotificationLevel,
    title: string,
    message?: string,
    meta?: Record<string, unknown>,
  ): Promise<DeliveryResult[]> {
    return this.notify({ title, message, meta, level });
  }

  /** Shorthand for a `debug`-level notification. */
  debug(title: string, message?: string, meta?: Record<string, unknown>) {
    return this.send("debug", title, message, meta);
  }
  /** Shorthand for an `info`-level notification. */
  info(title: string, message?: string, meta?: Record<string, unknown>) {
    return this.send("info", title, message, meta);
  }
  /** Shorthand for a `warning`-level notification. */
  warn(title: string, message?: string, meta?: Record<string, unknown>) {
    return this.send("warning", title, message, meta);
  }
  /** Shorthand for an `error`-level notification. */
  error(title: string, message?: string, meta?: Record<string, unknown>) {
    return this.send("error", title, message, meta);
  }
}
