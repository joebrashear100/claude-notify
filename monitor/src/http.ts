export interface HttpResponse {
  ok: boolean;
  status: number;
  text: string;
}

/** Minimal GET with a default User-Agent and an abort timeout. */
export async function httpGet(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 15_000,
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "claude-notify-monitor (+https://github.com/joebrashear100/claude-notify)",
        accept: "*/*",
        ...headers,
      },
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

/** Keep only the most recent `max` ids (assumes new ids are appended). */
export function capSeen(ids: string[], max: number): string[] {
  return ids.length > max ? ids.slice(ids.length - max) : ids;
}
