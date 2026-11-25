import { isIP } from "net";

/**
 * Fixed-window counter, in memory: right for the one instance this runs as. With more than one, each would allow the
 * full limit, and the counts would have to move to a shared store.
 */
export function createRateLimiter(limit: number, windowMs: number, maxKeys = 10_000) {
  const windows = new Map<string, { count: number; endsAt: number }>();

  return {
    /** Counts a try. 0 when it is allowed, otherwise the seconds until the next one is. */
    take(key: string): number {
      const now = Date.now();
      let window = windows.get(key);
      if (!window || window.endsAt <= now) {
        windows.delete(key);
        if (windows.size >= maxKeys) {
          for (const [other, { endsAt }] of windows) if (endsAt <= now) windows.delete(other);
          // Still full: the oldest goes.
          if (windows.size >= maxKeys) windows.delete(windows.keys().next().value!);
        }
        window = { count: 0, endsAt: now + windowMs };
        windows.set(key, window);
      }
      if (window.count >= limit) return Math.ceil((window.endsAt - now) / 1000);
      window.count++;
      return 0;
    },
    giveBack(key: string): void {
      const window = windows.get(key);
      if (window && window.count > 0) window.count--;
    },
    size: () => windows.size,
  };
}

/**
 * The client's address as the proxy reports it; an IPv6 /64 counts as one client. Railway documents X-Real-IP but not
 * whether a client can set it, so nothing may rely on this alone: each caller also has a limit that does not use it.
 */
export function clientIp(headers: Headers): string {
  const value = (headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",").pop() ?? "").trim();
  if (isIP(value) === 4) return value;
  if (isIP(value) !== 6) return "unknown";

  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];
  const [head, tail] = value.toLowerCase().split("::");
  const start = head ? head.split(":") : [];
  const end = tail ? tail.split(":") : [];
  const groups =
    tail === undefined ? start : [...start, ...Array(Math.max(8 - start.length - end.length, 0)).fill("0"), ...end];
  return groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16)).join(":") + "::/64";
}
