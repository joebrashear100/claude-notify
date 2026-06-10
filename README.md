# claude-notify

A small, dependency-free notification library and CLI for Node.js. Dispatch a
notification to one or more **channels** (console, webhook, Slack, Discord,
[ntfy](https://ntfy.sh) push, or your own) with per-channel level filtering and
fault isolation.

- **Zero runtime dependencies** — uses the Node 18+ global `fetch`.
- **Pluggable channels** — implement a one-method interface to add your own.
- **Fault isolated** — a failing channel never blocks the others; you get a
  per-channel result for every delivery.
- **Library + CLI** — call it from code, or fire notifications from a shell /
  CI step / git hook.

Requires Node.js >= 18.

## Install

```bash
npm install claude-notify
```

## Library usage

```ts
import {
  createNotifier,
  ConsoleChannel,
  WebhookChannel,
  NtfyChannel,
} from "claude-notify";

const notifier = createNotifier({
  defaultMeta: { app: "my-service" },
})
  .use(new ConsoleChannel())
  .use(
    new WebhookChannel({
      url: process.env.SLACK_WEBHOOK_URL!,
      format: "slack",
      minLevel: "warning", // only warnings and errors hit Slack
    }),
  )
  .use(
    new NtfyChannel({
      topic: "sndk-alerts",
      minLevel: "warning", // push warnings/errors to your phone
    }),
  );

// Level shorthands
await notifier.info("Build started");
await notifier.error("Build failed", "3 tests broke", { commit: "abc123" });

// Or the full form, inspecting per-channel results
const results = await notifier.notify({
  title: "Deploy complete",
  message: "v1.2.3 is live",
  level: "info",
});
for (const r of results) {
  if (!r.ok) console.error(`${r.channel} failed:`, r.error);
}
```

### Levels

`debug` < `info` < `warning` < `error`. A channel's `minLevel` filters out
anything less severe; filtered deliveries return `{ ok: true, skipped: true }`.

### Writing a custom channel

A channel is any object implementing the `Channel` interface:

```ts
import type { Channel, Notification } from "claude-notify";

class EmailChannel implements Channel {
  readonly name = "email";
  minLevel: Notification["level"] = "error";

  async send(n: Notification): Promise<void> {
    // throw on failure; the Notifier captures it as a DeliveryResult
    await sendEmail({ subject: n.title, body: n.message ?? "" });
  }
}
```

## CLI usage

```bash
# Console only
claude-notify "Build finished"

# Error to console with a body
claude-notify -l error -m "Tests failed" "CI"

# Post to a Slack incoming webhook
claude-notify -w "$SLACK_URL" -f slack -l warning "Deploy needs attention"
```

| Option | Alias | Description |
| --- | --- | --- |
| `--title <text>` | `-t` | Title (or pass as the positional argument) |
| `--message <text>` | `-m` | Longer body |
| `--level <level>` | `-l` | `debug` \| `info` \| `warning` \| `error` (default `info`) |
| `--webhook <url>` | `-w` | POST to this webhook URL |
| `--format <fmt>` | `-f` | `generic` \| `slack` \| `discord` (default `generic`) |
| `--ntfy <topic>` | `-n` | Publish to this ntfy topic |
| `--ntfy-server <url>` | | ntfy server base URL (default `https://ntfy.sh`) |
| `--quiet` | `-q` | Suppress the console channel (other channels only) |
| `--help` | `-h` | Show help |

Environment variables supply defaults: `CLAUDE_NOTIFY_WEBHOOK`,
`CLAUDE_NOTIFY_FORMAT`, `CLAUDE_NOTIFY_NTFY_TOPIC`, `CLAUDE_NOTIFY_NTFY_SERVER`,
and `CLAUDE_NOTIFY_NTFY_TOKEN` (bearer token for protected topics).

```bash
# Push a phone alert via ntfy (subscribe to the topic in the ntfy app first)
claude-notify -n sndk-alerts -l warning "TrendForce NAND contract index dropped 4%"
```

The CLI exits `0` when all deliveries succeed, `1` if any channel failed, and
`2` on a usage error.

### Example: notify when Claude Code finishes

Wire the CLI into a [Claude Code Stop hook](https://code.claude.com/docs) so you
get a ping when a session ends:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "claude-notify -w \"$CLAUDE_NOTIFY_WEBHOOK\" -f slack \"Claude finished a task\""
          }
        ]
      }
    ]
  }
}
```

## Webhook payloads

| Format | Body |
| --- | --- |
| `generic` | `{ title, message, level, timestamp, meta }` |
| `slack` | `{ text: "[LEVEL] title\nmessage" }` |
| `discord` | `{ content: "**[LEVEL]** title\nmessage" }` |

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # emit dist/
npm test            # vitest run
```

## License

[MIT](./LICENSE)
