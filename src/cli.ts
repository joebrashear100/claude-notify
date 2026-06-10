#!/usr/bin/env node
import { isLevel } from "./levels.js";
import { Notifier } from "./notifier.js";
import { ConsoleChannel } from "./channels/console.js";
import { WebhookChannel, type WebhookFormat } from "./channels/webhook.js";
import type { NotificationLevel } from "./types.js";

interface ParsedArgs {
  title?: string;
  message?: string;
  level: NotificationLevel;
  webhook?: string;
  format: WebhookFormat;
  quiet: boolean;
  help: boolean;
}

const USAGE = `claude-notify - send a notification to the console and/or a webhook

Usage:
  claude-notify [options] [title]

Options:
  -t, --title <text>      Notification title (or pass as positional argument)
  -m, --message <text>    Longer message body
  -l, --level <level>     debug | info | warning | error   (default: info)
  -w, --webhook <url>     POST the notification to this webhook URL
  -f, --format <format>   generic | slack | discord        (default: generic)
  -q, --quiet             Suppress the console channel (webhook only)
  -h, --help              Show this help

Environment:
  CLAUDE_NOTIFY_WEBHOOK   Default webhook URL if --webhook is omitted
  CLAUDE_NOTIFY_FORMAT    Default webhook format

Examples:
  claude-notify "Build finished"
  claude-notify -l error -m "Tests failed" "CI"
  claude-notify -w "$SLACK_URL" -f slack -l warning "Deploy needs attention"
`;

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    level: "info",
    format: (process.env.CLAUDE_NOTIFY_FORMAT as WebhookFormat) ?? "generic",
    webhook: process.env.CLAUDE_NOTIFY_WEBHOOK,
    quiet: false,
    help: false,
  };

  const next = (i: number, flag: string): string => {
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-q":
      case "--quiet":
        args.quiet = true;
        break;
      case "-t":
      case "--title":
        args.title = next(i, arg);
        i++;
        break;
      case "-m":
      case "--message":
        args.message = next(i, arg);
        i++;
        break;
      case "-l":
      case "--level": {
        const value = next(i, arg);
        if (!isLevel(value)) {
          throw new Error(
            `Invalid level "${value}" (expected debug, info, warning, or error)`,
          );
        }
        args.level = value;
        i++;
        break;
      }
      case "-w":
      case "--webhook":
        args.webhook = next(i, arg);
        i++;
        break;
      case "-f":
      case "--format": {
        const value = next(i, arg);
        if (value !== "generic" && value !== "slack" && value !== "discord") {
          throw new Error(
            `Invalid format "${value}" (expected generic, slack, or discord)`,
          );
        }
        args.format = value;
        i++;
        break;
      }
      default:
        if (arg !== undefined && arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        // First bare argument is treated as the title.
        if (args.title === undefined && arg !== undefined) {
          args.title = arg;
        }
    }
  }

  return args;
}

export async function run(argv: string[]): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${USAGE}`);
    return 2;
  }

  if (args.help) {
    process.stdout.write(USAGE);
    return 0;
  }

  if (!args.title) {
    process.stderr.write(`Error: a title is required\n\n${USAGE}`);
    return 2;
  }

  const notifier = new Notifier();
  if (!args.quiet) {
    notifier.use(new ConsoleChannel());
  }
  if (args.webhook) {
    notifier.use(new WebhookChannel({ url: args.webhook, format: args.format }));
  }

  if (notifier.channelNames.length === 0) {
    process.stderr.write(
      "Error: nothing to do - console is quiet and no webhook configured\n",
    );
    return 2;
  }

  const results = await notifier.notify({
    title: args.title,
    message: args.message,
    level: args.level,
  });

  let failed = false;
  for (const result of results) {
    if (!result.ok) {
      failed = true;
      process.stderr.write(
        `Delivery to "${result.channel}" failed: ${result.error?.message}\n`,
      );
    }
  }

  return failed ? 1 : 0;
}

// Execute only when run directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) {
  run(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      process.stderr.write(`Unexpected error: ${(err as Error).message}\n`);
      process.exitCode = 1;
    },
  );
}
