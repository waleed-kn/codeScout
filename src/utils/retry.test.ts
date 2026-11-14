import { describe, expect, it, vi } from "vitest";
import { retry } from "@/utils/retry";

describe("retry", () => {
  it("succeeds after N transient failures", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let calls = 0;

    const result = await retry(
      async () => {
        calls++;
        if (calls < 3) {
          throw new Error(`fail ${calls}`);
        }
        return "done";
      },
      { retries: 3, baseMs: 100, sleep }
    );

    expect(result).toBe("done");
    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("stops after max retries and rethrows the last error", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let calls = 0;

    await expect(
      retry(
        async () => {
          calls++;
          throw new Error(`error-${calls}`);
        },
        { retries: 2, baseMs: 50, sleep }
      )
    ).rejects.toThrow("error-3");

    expect(calls).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("respects shouldRetry and stops immediately when false", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let calls = 0;

    await expect(
      retry(
        async () => {
          calls++;
          throw new Error("fatal");
        },
        { retries: 3, shouldRetry: () => false, sleep }
      )
    ).rejects.toThrow("fatal");

    expect(calls).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("uses growing exponential backoff delays capped at maxMs", async () => {
    const delays: number[] = [];
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms);
    });

    await expect(
      retry(
        async () => {
          throw new Error("always fails");
        },
        { retries: 3, baseMs: 100, maxMs: 500, sleep }
      )
    ).rejects.toThrow("always fails");

    expect(delays).toHaveLength(3);
    // attempt 0: [50, 100], attempt 1: [100, 200], attempt 2: [200, 400]
    expect(delays[0]).toBeGreaterThanOrEqual(50);
    expect(delays[0]).toBeLessThanOrEqual(100);
    expect(delays[1]).toBeGreaterThanOrEqual(100);
    expect(delays[1]).toBeLessThanOrEqual(200);
    expect(delays[2]).toBeGreaterThanOrEqual(200);
    expect(delays[2]).toBeLessThanOrEqual(400);
    expect(delays[2]).toBeGreaterThan(delays[0]);
  });
});
