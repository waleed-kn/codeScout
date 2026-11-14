import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { handle, json } from "@/server/http";

describe("handle", () => {
  it("passes through successful responses", async () => {
    const handler = handle(async () => json({ status: "ok" }, 200));
    const res = await handler(new Request("http://localhost:3000/api/health"), undefined);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("maps AppError to the standard error shape", async () => {
    const handler = handle(async () => {
      throw new AppError(409, "REPO_NOT_READY", "Repository is still indexing");
    });

    const res = await handler(new Request("http://localhost:3000/api/test"), undefined);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: {
        code: "REPO_NOT_READY",
        message: "Repository is still indexing",
      },
    });
  });

  it("maps unknown errors to 500 INTERNAL_ERROR without leaking details", async () => {
    const handler = handle(async () => {
      throw new Error("secret database password leaked");
    });

    const res = await handler(new Request("http://localhost:3000/api/test"), undefined);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  });
});
