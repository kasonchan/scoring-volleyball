import { afterEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  getClientIp,
  resetRateLimitStore,
} from "@/lib/rate-limit";

describe("rate-limit", () => {
  afterEach(() => {
    resetRateLimitStore();
  });

  it("getClientIp prefers x-forwarded-for first hop", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("consumeRateLimit blocks after limit within window", () => {
    const now = 1_000_000;
    const key = "test:key";
    expect(consumeRateLimit(key, 3, 60_000, now).allowed).toBe(true);
    expect(consumeRateLimit(key, 3, 60_000, now + 1).allowed).toBe(true);
    expect(consumeRateLimit(key, 3, 60_000, now + 2).allowed).toBe(true);
    const blocked = consumeRateLimit(key, 3, 60_000, now + 3);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("consumeRateLimit resets after window expires", () => {
    const now = 1_000_000;
    const key = "test:reset";
    for (let i = 0; i < 2; i++) {
      expect(consumeRateLimit(key, 2, 10_000, now + i).allowed).toBe(true);
    }
    expect(consumeRateLimit(key, 2, 10_000, now + 1).allowed).toBe(false);
    expect(consumeRateLimit(key, 2, 10_000, now + 10_001).allowed).toBe(true);
  });
});
