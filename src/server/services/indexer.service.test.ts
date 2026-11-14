import { describe, expect, it, vi } from "vitest";
import type { EmbeddingClient } from "@/server/clients/embedding.client";
import type { GithubClient } from "@/server/clients/github.client";
import type { ChunkInsertRow, ChunksDb } from "@/server/db/chunks.queries";
import type { RepoRecord, ReposQueries, RepoStatus } from "@/server/db/repos.queries";
import { createIndexer } from "@/server/services/indexer.service";

function makeFakeRepo(overrides: Partial<RepoRecord> = {}): RepoRecord {
  return {
    id: "repo-1",
    owner: "octocat",
    name: "hello",
    commitSha: "abc123",
    status: "pending",
    error: null,
    fileCount: 0,
    chunkCount: 0,
    ...overrides,
  };
}

function makeFakeDb(initialRepo: RepoRecord) {
  let repo: RepoRecord | null = { ...initialRepo };
  let storedChunks: ChunkInsertRow[] = [];
  const statusHistory: RepoStatus[] = [];

  const queries: ReposQueries = {
    async getById(id) {
      return repo && repo.id === id ? { ...repo } : null;
    },
    async listAll() {
      return repo ? [{ ...repo }] : [];
    },
    async createOrGetExisting() {
      throw new Error("not implemented in test");
    },
    async deleteById() {
      return false;
    },
    async setStatus(id, status, options = {}) {
      if (!repo || repo.id !== id) return;
      statusHistory.push(status);
      repo = {
        ...repo,
        status,
        error: options.error ?? null,
        fileCount: options.fileCount ?? repo.fileCount,
        chunkCount: options.chunkCount ?? repo.chunkCount,
      };
    },
  };

  const chunksDb: ChunksDb = {
    async insertChunksBatch(_repoId, chunks) {
      storedChunks.push(...chunks);
    },
    async deleteChunksByRepo(_repoId) {
      storedChunks = [];
    },
    async searchChunks() {
      return [];
    },
  };

  return {
    queries,
    chunksDb,
    getRepo: () => repo,
    getStoredChunks: () => storedChunks,
    getStatusHistory: () => statusHistory,
  };
}

describe("indexer.runIndex", () => {
  it("completes happy path, sets ready with counts, and embeds in batches of 50", async () => {
    const db = makeFakeDb(makeFakeRepo());
    const content60Lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`).join("\n");

    const github: GithubClient = {
      getRepoInfo: vi.fn(),
      getHeadSha: vi.fn(),
      downloadRepoFiles: vi.fn().mockResolvedValue({
        files: [
          { path: "src/a.ts", content: Buffer.from(content60Lines) },
          { path: "src/b.ts", content: Buffer.from("export const b = 2;\n") },
        ],
        skipped: 1,
      }),
    };

    const embedCalls: string[][] = [];
    const embeddings: EmbeddingClient = {
      async embedTexts(texts, kind) {
        expect(kind).toBe("document");
        embedCalls.push(texts);
        return texts.map(() => [0.1, 0.2, 0.3]);
      },
    };

    const indexer = createIndexer({
      queries: db.queries,
      chunksDb: db.chunksDb,
      github,
      embeddings,
      limits: {
        maxFiles: 300,
        maxFileBytes: 100_000,
        maxChunks: 3000,
        chunkLines: 40,
        chunkOverlap: 5,
      },
    });

    await indexer.runIndex("repo-1");

    expect(db.getStatusHistory()).toEqual(["indexing", "ready"]);
    expect(db.getRepo()).toMatchObject({
      status: "ready",
      fileCount: 2,
      chunkCount: 3,
      error: null,
    });
    expect(db.getStoredChunks()).toHaveLength(3);
    expect(embedCalls[0][0]).toMatch(/^File: src\/a\.ts\n/);
  });

  it("sets failed and leaves no chunks on GitHub failure", async () => {
    const db = makeFakeDb(makeFakeRepo());

    const github: GithubClient = {
      getRepoInfo: vi.fn(),
      getHeadSha: vi.fn(),
      downloadRepoFiles: vi.fn().mockRejectedValue(new Error("GitHub network timeout")),
    };

    const embeddings: EmbeddingClient = {
      embedTexts: vi.fn(),
    };

    const indexer = createIndexer({
      queries: db.queries,
      chunksDb: db.chunksDb,
      github,
      embeddings,
      limits: {
        maxFiles: 300,
        maxFileBytes: 100_000,
        maxChunks: 3000,
        chunkLines: 40,
        chunkOverlap: 5,
      },
    });

    await indexer.runIndex("repo-1");

    expect(db.getRepo()?.status).toBe("failed");
    expect(db.getRepo()?.error).toContain("GitHub network timeout");
    expect(db.getStoredChunks()).toHaveLength(0);
  });

  it("cleans up chunks and sets failed when embedding fails mid-way", async () => {
    const db = makeFakeDb(makeFakeRepo());
    // 55 files * 1 chunk = 55 chunks -> 2 embedding batches (50 + 5)
    const files = Array.from({ length: 55 }, (_, i) => ({
      path: `src/f${i}.ts`,
      content: Buffer.from(`export const v${i} = ${i};\n`),
    }));

    const github: GithubClient = {
      getRepoInfo: vi.fn(),
      getHeadSha: vi.fn(),
      downloadRepoFiles: vi.fn().mockResolvedValue({ files, skipped: 0 }),
    };

    let batchNum = 0;
    const embeddings: EmbeddingClient = {
      async embedTexts(texts) {
        batchNum += 1;
        if (batchNum === 2) {
          throw new Error("Embedding quota exceeded");
        }
        return texts.map(() => [0.5, 0.5]);
      },
    };

    const indexer = createIndexer({
      queries: db.queries,
      chunksDb: db.chunksDb,
      github,
      embeddings,
      limits: {
        maxFiles: 300,
        maxFileBytes: 100_000,
        maxChunks: 3000,
        chunkLines: 40,
        chunkOverlap: 5,
      },
    });

    await indexer.runIndex("repo-1");

    expect(db.getRepo()?.status).toBe("failed");
    expect(db.getRepo()?.error).toContain("Embedding quota exceeded");
    expect(db.getStoredChunks()).toHaveLength(0);
  });

  it("fails with readable error when total chunks exceed MAX_CHUNKS", async () => {
    const db = makeFakeDb(makeFakeRepo());
    const files = Array.from({ length: 5 }, (_, i) => ({
      path: `src/f${i}.ts`,
      content: Buffer.from(`export const x${i} = ${i};\n`),
    }));

    const github: GithubClient = {
      getRepoInfo: vi.fn(),
      getHeadSha: vi.fn(),
      downloadRepoFiles: vi.fn().mockResolvedValue({ files, skipped: 0 }),
    };

    const embeddings: EmbeddingClient = {
      embedTexts: vi.fn(),
    };

    const indexer = createIndexer({
      queries: db.queries,
      chunksDb: db.chunksDb,
      github,
      embeddings,
      limits: {
        maxFiles: 300,
        maxFileBytes: 100_000,
        maxChunks: 3,
        chunkLines: 40,
        chunkOverlap: 5,
      },
    });

    await indexer.runIndex("repo-1");

    expect(db.getRepo()?.status).toBe("failed");
    expect(db.getRepo()?.error).toContain("maximum limit of 3 chunks");
    expect(embeddings.embedTexts).not.toHaveBeenCalled();
    expect(db.getStoredChunks()).toHaveLength(0);
  });
});
