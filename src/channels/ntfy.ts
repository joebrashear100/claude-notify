import type { Channel, Notification, NotificationLevel } from "../types.js";

export interface NtfyChannelOptions {
  /** ntfy topic to publish to. Required. */
  topic: string;
  /** ntfy server base URL (default "https://ntfy.sh"). */
  server?: string;
  /** Bearer token for protected topics (ntfy access tokens). */
  token?: string;
  /** Channel name (default "ntfy"). */
  name?: string;
  /** Minimum level to deliver. */
  minLevel?: NotificationLevel;
  /** Override the level -> ntfy priority (1-5) mapping. */
  priorityMap?: Record<NotificationLevel, number>;
  /** Override the level -> ntfy tags mapping. */
  tagMap?: Record<NotificationLevel, string[]>;
  /** Render the message body as Markdown (default true). */
  markdown?: boolean;
  /** Injectable fetch implementation; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Abort the request after this many ms (default 10000). */
  timeoutMs?: number;
}

const DEFAULT_PRIORITY: Record<NotificationLevel, number> = {
  debug: 2,
  info: 3,
  warning: 4,
  error: 5,
};

const DEFAULT_TAGS: Record<NotificationLevel, string[]> = {
  debug: ["mag"],
  info: ["information_source"],
  warning: ["warning"],
  error: ["rotating_light"],
};

/**
 * Publishes notifications to an [ntfy](https://ntfy.sh) topic for push delivery
 * to phones and desktops. Uses ntfy's JSON publishing endpoint, mapping
 * notification levels to ntfy priorities and tags.
 */
export class NtfyChannel implements Channel {
  readonly name: string;
  minLevel?: NotificationLevel;
  private readonly topic: string;
  private readonly server: string;
  private readonly token?: string;
  private readonly priorityMap: Record<NotificationLevel, number>;
  private readonly tagMap: Record<NotificationLevel, string[]>;
  private readonly markdown: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: NtfyChannelOptions) {
    if (!options.topic) throw new Error("NtfyChannel requires a topic");
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error(
        "No fetch implementation available; pass options.fetch (Node >=18 has a global fetch)",
      );
    }
    this.topic = options.topic;
    this.server = (options.server ?? "https://ntfy.sh").replace(/\/+$/, "");
    this.token = options.token;
    this.name = options.name ?? "ntfy";
    this.minLevel = options.minLevel;
    this.priorityMap = options.priorityMap ?? DEFAULT_PRIORITY;
    this.tagMap = options.tagMap ?? DEFAULT_TAGS;
    this.markdown = options.markdown ?? true;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async send(notification: Notification): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (this.token) headers.authorization = `Bearer ${this.token}`;
      const res = await this.fetchImpl(this.server, {
        method: "POST",
        headers,
        body: JSON.stringify(this.serialize(notification)),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(
          `ntfy ${this.server} responded with ${res.status} ${res.statusText}`,
        );
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Build the ntfy JSON publish payload. Exposed for testing. */
  serialize(n: Notification): Record<string, unknown> {
    return {
      topic: this.topic,
      title: n.title,
      message: n.message ?? n.title,
      priority: this.priorityMap[n.level],
      tags: this.tagMap[n.level],
      markdown: this.markdown,
    };
  }
}
