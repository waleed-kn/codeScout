import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimitStore,
} from "@/server/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows N requests then blocks with 429 RATE_LIMITED and Retry-After", () => {
    let now = 1_000_000;
    const clock = () => now;

    for (let i = 0; i < 5; i++) {
      checkRateLimit({
        key: "index:1.2.3.4",
        limit: 5,
        windowMs: 60_000,
        now: clock,
      });
    }

    let caught: unknown;
    try {
      checkRateLimit({
        key: "index:1.2.3.4",
        limit: 5,
        windowMs: 60_000,
        now: clock,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(AppError);
    const appErr = caught as AppError;
    expect(appErr.status).toBe(429);
    expect(appErr.code).toBe("RATE_LIMITED");
    expect(appErr.message).toBe("Too many requests, try again later");
    expect(appErr.headers?.["Retry-After"]).toBe("60");
  });

  it("resets the counter after the window expires", () => {
    let now = 1_000_000;
    const clock = () => now;

    checkRateLimit({ key: "ask:ip", limit: 2, windowMs: 10_000, now: clock });
    checkRateLimit({ key: "ask:ip", limit: 2, windowMs: 10_000, now: clock });

    expect(() =>
      checkRateLimit({ key: "ask:ip", limit: 2, windowMs: 10_000, now: clock })
    ).toThrow(AppError);

    now += 10_000;
    expect(() =>
      checkRateLimit({ key: "ask:ip", limit: 2, windowMs: 10_000, now: clock })
    ).not.toThrow();
  });

  it("getClientIp honors TRUST_PROXY", () => {
    const req = new Request("http://localhost:3000/api/repos", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    expect(getClientIp(req, true)).toBe("203.0.113.10");
    expect(getClientIp(req, false)).toBe("local");
  });
});
