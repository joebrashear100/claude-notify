import type { Channel, Notification, NotificationLevel } from "../types.js";

/** Payload shape produced for the outgoing request. */
export type WebhookFormat = "generic" | "slack" | "discord";

export interface WebhookChannelOptions {
  /** Target URL. Required. */
  url: string;
  /** Channel name (default "webhook"). */
  name?: string;
  /** Minimum level to deliver. */
  minLevel?: NotificationLevel;
  /** Payload format (default "generic"). */
  format?: WebhookFormat;
  /** Extra request headers (merged over the default JSON content-type). */
  headers?: Record<string, string>;
  /** Injectable fetch implementation; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Abort the request after this many ms (default 10000). */
  timeoutMs?: number;
}

/**
 * Posts notifications to an HTTP endpoint as JSON. Built-in payload presets
 * for Slack and Discord incoming webhooks, plus a structured "generic" format.
 */
export class WebhookChannel implements Channel {
  readonly name: string;
  minLevel?: NotificationLevel;
  private readonly url: string;
  private readonly format: WebhookFormat;
  private readonly headers: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: WebhookChannelOptions) {
    if (!options.url) throw new Error("WebhookChannel requires a url");
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error(
        "No fetch implementation available; pass options.fetch (Node >=18 has a global fetch)",
      );
    }
    this.url = options.url;
    this.name = options.name ?? "webhook";
    this.minLevel = options.minLevel;
    this.format = options.format ?? "generic";
    this.headers = options.headers ?? {};
    this.fetchImpl = fetchImpl;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async send(notification: Notification): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...this.headers },
        body: JSON.stringify(this.serialize(notification)),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(
          `Webhook ${this.url} responded with ${res.status} ${res.statusText}`,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Build the request body for the configured format. Exposed for testing. */
  serialize(n: Notification): unknown {
    const text = n.message ? `${n.title}\n${n.message}` : n.title;
    switch (this.format) {
      case "slack":
        return { text: `[${n.level.toUpperCase()}] ${text}` };
      case "discord":
        return { content: `**[${n.level.toUpperCase()}]** ${text}` };
      case "generic":
      default:
        return {
          title: n.title,
          message: n.message ?? null,
          level: n.level,
          timestamp: n.timestamp.toISOString(),
          meta: n.meta ?? {},
        };
    }
  }
}
