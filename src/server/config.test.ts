import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getConfig, resetConfigCache } from "@/server/config";

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "GITHUB_TOKEN",
  "EMBEDDING_API_KEY",
  "EMBEDDING_MODEL",
  "LLM_API_KEY",
  "LLM_MODEL",
] as const;

describe("getConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfigCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetConfigCache();
  });

  it("throws one Error listing all missing required variables", () => {
    process.env = { NODE_ENV: "test" };

    let thrown: unknown;
    try {
      getConfig();
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    for (const key of REQUIRED_KEYS) {
      expect(message).toContain(key);
    }
  });

  it("accepts a valid env and applies defaults and numeric coercion", () => {
    process.env = {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      GITHUB_TOKEN: "ghp_test",
      EMBEDDING_API_KEY: "emb_key",
      EMBEDDING_MODEL: "text-embedding-004",
      LLM_API_KEY: "llm_key",
      LLM_MODEL: "llama-3.3-70b-versatile",
      MAX_FILES: "150",
      MIN_SIMILARITY: "0.45",
    };

    const config = getConfig();
    expect(config.EMBEDDING_DIM).toBe(768);
    expect(config.MAX_FILES).toBe(150);
    expect(config.MIN_SIMILARITY).toBe(0.45);
    expect(config.CHUNK_LINES).toBe(40);
    expect(config.CHUNK_OVERLAP).toBe(5);
  });

  it("rejects CHUNK_OVERLAP >= CHUNK_LINES", () => {
    process.env = {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      GITHUB_TOKEN: "ghp_test",
      EMBEDDING_API_KEY: "emb_key",
      EMBEDDING_MODEL: "text-embedding-004",
      LLM_API_KEY: "llm_key",
      LLM_MODEL: "llama-3.3-70b-versatile",
      CHUNK_LINES: "20",
      CHUNK_OVERLAP: "20",
    };

    expect(() => getConfig()).toThrow(/CHUNK_OVERLAP/);
  });
});
