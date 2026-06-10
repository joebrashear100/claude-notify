/** Severity level of a notification, ordered from least to most severe. */
export type NotificationLevel = "debug" | "info" | "warning" | "error";

/** A fully-resolved notification, as passed to channels. */
export interface Notification {
  /** Short headline for the notification. */
  title: string;
  /** Optional longer body. */
  message?: string;
  /** Severity level. */
  level: NotificationLevel;
  /** When the notification was created. */
  timestamp: Date;
  /** Arbitrary structured metadata. */
  meta?: Record<string, unknown>;
}

/**
 * User-supplied notification. `title` is required; everything else is
 * filled in with defaults by the {@link Notifier}.
 */
export interface NotificationInput {
  title: string;
  message?: string;
  level?: NotificationLevel;
  timestamp?: Date;
  meta?: Record<string, unknown>;
}

/** Outcome of attempting to deliver a notification to a single channel. */
export interface DeliveryResult {
  /** Name of the channel. */
  channel: string;
  /** Whether delivery succeeded (a skipped delivery counts as ok). */
  ok: boolean;
  /** Set when the channel filtered the notification out by level. */
  skipped?: boolean;
  /** Populated when delivery failed. */
  error?: Error;
}

/**
 * A delivery target. Implement this interface to add custom channels
 * (email, SMS, desktop, etc.).
 */
export interface Channel {
  /** Stable identifier used in {@link DeliveryResult}. */
  readonly name: string;
  /** Minimum level this channel delivers; lower-severity notifications are skipped. */
  minLevel?: NotificationLevel;
  /** Deliver the notification. Throw to signal failure. */
  send(notification: Notification): Promise<void>;
}
