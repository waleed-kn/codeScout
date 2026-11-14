import { describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { NOT_FOUND_MESSAGE } from "@/lib/promptBuilder";
import type { LlmClient } from "@/server/clients/llm.client";
import type { RetrievedChunk } from "@/server/db/chunks.queries";
import type { RepoRecord, ReposQueries } from "@/server/db/repos.queries";
import { createAnswerService } from "@/server/services/answer.service";
import type { RetrievalService } from "@/server/services/retrieval.service";

const VALID_REPO_ID = "11111111-1111-1111-1111-111111111111";

function makeQueries(repo: RepoRecord | null): ReposQueries {
  return {
    async getById(id) {
      return repo && repo.id === id ? repo : null;
    },
    async listAll() {
      return repo ? [repo] : [];
    },
    async createOrGetExisting() {
      throw new Error("not implemented in test");
    },
    async deleteById() {
      return false;
    },
    async setStatus() {},
  };
}

function makeReadyRepo(): RepoRecord {
  return {
    id: VALID_REPO_ID,
    owner: "octocat",
    name: "hello",
    commitSha: "abc123",
    status: "ready",
    error: null,
    fileCount: 2,
    chunkCount: 4,
  };
}

describe("answerService.ask", () => {
  it("returns NOT_FOUND_MESSAGE without calling LLM when best similarity is below threshold", async () => {
    const retrieval: RetrievalService = {
      async retrieve() {
        return [
          {
            filePath: "src/index.ts",
            startLine: 1,
            endLine: 10,
            content: "export const x = 1;",
            similarity: 0.15,
          },
        ];
      },
    };

    const llm: LlmClient = {
      generate: vi.fn(),
    };

    const service = createAnswerService({
      queries: makeQueries(makeReadyRepo()),
      retrieval,
      llm,
      limits: { minSimilarity: 0.3 },
    });

    const result = await service.ask(VALID_REPO_ID, "What is the capital of France?");
    expect(result).toEqual({
      answer: NOT_FOUND_MESSAGE,
      sources: [],
    });
    expect(llm.generate).not.toHaveBeenCalled();
  });

  it("calls LLM once and returns real sources when similarity is above threshold", async () => {
    const retrieved: RetrievedChunk[] = [
      {
        filePath: "src/auth.ts",
        startLine: 5,
        endLine: 20,
        content: "export function login() { return true; }",
        similarity: 0.8421,
      },
    ];

    const retrieval: RetrievalService = {
      retrieve: vi.fn().mockResolvedValue(retrieved),
    };

    const llm: LlmClient = {
      generate: vi.fn().mockResolvedValue("Login is handled in [src/auth.ts:5-20]."),
    };

    const service = createAnswerService({
      queries: makeQueries(makeReadyRepo()),
      retrieval,
      llm,
      limits: { minSimilarity: 0.3 },
    });

    const result = await service.ask(VALID_REPO_ID, "How does login work?");
    expect(llm.generate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      answer: "Login is handled in [src/auth.ts:5-20].",
      sources: [
        {
          filePath: "src/auth.ts",
          startLine: 5,
          endLine: 20,
          similarity: 0.8421,
          content: "export function login() { return true; }",
        },
      ],
    });
  });

  it("throws 409 REPO_NOT_READY when repo is not ready", async () => {
    const service = createAnswerService({
      queries: makeQueries({ ...makeReadyRepo(), status: "indexing" }),
      retrieval: { retrieve: vi.fn() },
      llm: { generate: vi.fn() },
      limits: { minSimilarity: 0.3 },
    });

    await expect(service.ask(VALID_REPO_ID, "Hello?")).rejects.toMatchObject({
      status: 409,
      code: "REPO_NOT_READY",
    } satisfies Partial<AppError>);
  });

  it("throws 404 REPO_NOT_FOUND when repo does not exist", async () => {
    const service = createAnswerService({
      queries: makeQueries(null),
      retrieval: { retrieve: vi.fn() },
      llm: { generate: vi.fn() },
      limits: { minSimilarity: 0.3 },
    });

    await expect(service.ask(VALID_REPO_ID, "Hello?")).rejects.toMatchObject({
      status: 404,
      code: "REPO_NOT_FOUND",
    } satisfies Partial<AppError>);
  });
});
