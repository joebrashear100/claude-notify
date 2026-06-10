import type { Channel, Notification, NotificationLevel } from "../types.js";

export interface ConsoleChannelOptions {
  /** Channel name (default "console"). */
  name?: string;
  /** Minimum level to print. */
  minLevel?: NotificationLevel;
  /** Where formatted lines are written. Defaults to `console.log`. */
  sink?: (line: string) => void;
  /** Emit ANSI colors (default: auto — true when stdout is a TTY). */
  color?: boolean;
}

const COLORS: Record<NotificationLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[36m",
  warning: "\x1b[33m",
  error: "\x1b[31m",
};
const RESET = "\x1b[0m";

const ICONS: Record<NotificationLevel, string> = {
  debug: "·",
  info: "i",
  warning: "!",
  error: "x",
};

/** Writes human-readable notification lines to a text sink (stdout by default). */
export class ConsoleChannel implements Channel {
  readonly name: string;
  minLevel?: NotificationLevel;
  private readonly sink: (line: string) => void;
  private readonly color: boolean;

  constructor(options: ConsoleChannelOptions = {}) {
    this.name = options.name ?? "console";
    this.minLevel = options.minLevel;
    this.sink = options.sink ?? ((line) => console.log(line));
    this.color = options.color ?? Boolean(process.stdout?.isTTY);
  }

  async send(notification: Notification): Promise<void> {
    this.sink(this.format(notification));
  }

  /** Format a notification into a single display line. Exposed for testing. */
  format(notification: Notification): string {
    const { level, title, message, timestamp } = notification;
    const ts = timestamp.toISOString();
    let line = `${ts} ${ICONS[level]} [${level.toUpperCase()}] ${title}`;
    if (message) line += ` - ${message}`;
    return this.color ? `${COLORS[level]}${line}${RESET}` : line;
  }
}
