/**
 * @jest-environment node
 */
import { clientIp, createRateLimiter } from "../rate-limit";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it("allows the limit, refuses the next, and says when to try again", () => {
  const limiter = createRateLimiter(2, 60_000);
  expect(limiter.take("a")).toBe(0);
  expect(limiter.take("a")).toBe(0);
  jest.advanceTimersByTime(20_000);
  expect(limiter.take("a")).toBe(40);
  expect(limiter.take("b")).toBe(0);
});

it("starts again when the window ends, and refused tries do not extend it", () => {
  const limiter = createRateLimiter(1, 60_000);
  limiter.take("a");
  jest.advanceTimersByTime(59_000);
  expect(limiter.take("a")).toBe(1);
  jest.advanceTimersByTime(1_000);
  expect(limiter.take("a")).toBe(0);
});

it("gives a try back", () => {
  const limiter = createRateLimiter(1, 60_000);
  limiter.take("a");
  limiter.giveBack("a");
  expect(limiter.take("a")).toBe(0);
  limiter.giveBack("never-seen");
});

it("does not grow without end", () => {
  const limiter = createRateLimiter(1, 60_000, 100);
  for (let i = 0; i < 1000; i++) limiter.take(`key-${i}`);
  expect(limiter.size()).toBeLessThanOrEqual(100);
});

const ip = (headers: Record<string, string>) => clientIp(new Headers(headers));

it("reads the address the proxy set, and counts an IPv6 /64 as one client", () => {
  expect(ip({ "x-real-ip": "203.0.113.7" })).toBe("203.0.113.7");
  expect(ip({ "x-forwarded-for": "198.51.100.1, 203.0.113.7" })).toBe("203.0.113.7");
  expect(ip({})).toBe("unknown");
  expect(ip({ "x-real-ip": "x".repeat(5000) })).toBe("unknown");
  expect(ip({ "x-real-ip": "2001:db8:1:2:aaaa::1" })).toBe(ip({ "x-real-ip": "2001:db8:1:2:bbbb::2" }));
  expect(ip({ "x-real-ip": "2001:db8:1:2::1" })).toBe(ip({ "x-real-ip": "2001:0db8:0001:0002:0:0:0:9" }));
  expect(ip({ "x-real-ip": "2001:db8:1:3::1" })).not.toBe(ip({ "x-real-ip": "2001:db8:1:2::1" }));
  expect(ip({ "x-real-ip": "::ffff:203.0.113.7" })).toBe("203.0.113.7");
});
