import { chunkFile, type CodeChunk } from "@/lib/chunker";
import type { EmbeddingClient } from "@/server/clients/embedding.client";
import type { GithubClient } from "@/server/clients/github.client";
import type { ChunksDb } from "@/server/db/chunks.queries";
import type { ReposQueries } from "@/server/db/repos.queries";
import { getLogger } from "@/server/logger";

export interface IndexerLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxChunks: number;
  chunkLines: number;
  chunkOverlap: number;
}

export interface IndexerService {
  start(repoId: string): void;
  runIndex(repoId: string): Promise<void>;
}

const EMBED_BATCH_SIZE = 50;
const INSERT_BATCH_SIZE = 100;

interface IndexQueueState {
  queue: string[];
  running: boolean;
}

const globalForIndexQueue = globalThis as unknown as {
  __codescoutIndexQueue?: IndexQueueState;
};

function getQueueState(): IndexQueueState {
  if (!globalForIndexQueue.__codescoutIndexQueue) {
    globalForIndexQueue.__codescoutIndexQueue = {
      queue: [],
      running: false,
    };
  }
  return globalForIndexQueue.__codescoutIndexQueue;
}

function toShortErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim().slice(0, 300);
  }
  return "Indexing failed due to an unexpected error.";
}

export function createIndexer(deps: {
  queries: ReposQueries;
  chunksDb: ChunksDb;
  github: GithubClient;
  embeddings: EmbeddingClient;
  limits: IndexerLimits;
}): IndexerService {
  const { queries, chunksDb, github, embeddings, limits } = deps;

  async function runIndex(repoId: string): Promise<void> {
    const logger = getLogger();
    const totalStart = Date.now();

    try {
      const stepStart = Date.now();
      await queries.setStatus(repoId, "indexing");
      const repo = await queries.getById(repoId);
      if (!repo) {
        throw new Error(`Repository ${repoId} not found.`);
      }
      logger.info(
        { repoId, durationMs: Date.now() - stepStart },
        "Indexer step: status set to indexing and repo loaded"
      );

      const dlStart = Date.now();
      const { files, skipped } = await github.downloadRepoFiles(
        repo.owner,
        repo.name,
        repo.commitSha,
        { maxFiles: limits.maxFiles, maxFileBytes: limits.maxFileBytes }
      );
      logger.info(
        {
          repoId,
          keptFiles: files.length,
          skippedFiles: skipped,
          durationMs: Date.now() - dlStart,
        },
        "Indexer step: downloaded and filtered repository files"
      );

      const chunkStart = Date.now();
      const allChunks: CodeChunk[] = [];
      for (const file of files) {
        const text = file.content.toString("utf8");
        const fileChunks = chunkFile(
          { path: file.path, content: text },
          { chunkLines: limits.chunkLines, overlap: limits.chunkOverlap }
        );
        if (allChunks.length + fileChunks.length > limits.maxChunks) {
          throw new Error(
            `Repository exceeds the maximum limit of ${limits.maxChunks} chunks.`
          );
        }
        allChunks.push(...fileChunks);
      }

      if (allChunks.length === 0) {
        throw new Error("No indexable source chunks found in repository.");
      }

      logger.info(
        {
          repoId,
          fileCount: files.length,
          chunkCount: allChunks.length,
          durationMs: Date.now() - chunkStart,
        },
        "Indexer step: chunked repository files"
      );

      const embedStart = Date.now();
      const allEmbeddings: number[][] = [];
      for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
        const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
        const texts = batch.map((c) => `File: ${c.filePath}\n${c.content}`);
        const vectors = await embeddings.embedTexts(texts, "document");
        allEmbeddings.push(...vectors);
      }
      logger.info(
        {
          repoId,
          chunkCount: allChunks.length,
          durationMs: Date.now() - embedStart,
        },
        "Indexer step: embedded all chunks"
      );

      const insertStart = Date.now();
      for (let i = 0; i < allChunks.length; i += INSERT_BATCH_SIZE) {
        const batchChunks = allChunks.slice(i, i + INSERT_BATCH_SIZE);
        const rows = batchChunks.map((c, idx) => ({
          filePath: c.filePath,
          startLine: c.startLine,
          endLine: c.endLine,
          content: c.content,
          embedding: allEmbeddings[i + idx],
        }));
        await chunksDb.insertChunksBatch(repoId, rows);
      }
      logger.info(
        {
          repoId,
          chunkCount: allChunks.length,
          durationMs: Date.now() - insertStart,
        },
        "Indexer step: inserted chunks into database"
      );

      await queries.setStatus(repoId, "ready", {
        fileCount: files.length,
        chunkCount: allChunks.length,
      });

      logger.info(
        {
          repoId,
          fileCount: files.length,
          chunkCount: allChunks.length,
          durationMs: Date.now() - totalStart,
        },
        "Indexer completed successfully"
      );
    } catch (err) {
      const shortMessage = toShortErrorMessage(err);
      logger.error(
        { repoId, err, durationMs: Date.now() - totalStart },
        "Indexer failed"
      );

      await chunksDb.deleteChunksByRepo(repoId).catch((cleanupErr) => {
        logger.error(
          { repoId, err: cleanupErr },
          "Failed to clean up chunks after indexing failure"
        );
      });

      await queries
        .setStatus(repoId, "failed", { error: shortMessage })
        .catch((statusErr) => {
          logger.error(
            { repoId, err: statusErr },
            "Failed to update repo status to failed"
          );
        });
    }
  }

  async function drainQueue(): Promise<void> {
    const state = getQueueState();
    if (state.running) return;
    state.running = true;

    try {
      while (state.queue.length > 0) {
        const nextRepoId = state.queue.shift();
        if (!nextRepoId) continue;
        await runIndex(nextRepoId);
      }
    } finally {
      state.running = false;
    }
  }

  function start(repoId: string): void {
    const state = getQueueState();
    state.queue.push(repoId);
    setImmediate(() => {
      void drainQueue().catch((err) => {
        getLogger().error({ repoId, err }, "Unexpected error in index queue");
      });
    });
  }

  return {
    start,
    runIndex,
  };
}
