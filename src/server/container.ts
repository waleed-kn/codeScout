import { createEmbeddingClient, type EmbeddingClient } from "@/server/clients/embedding.client";
import { createGithubClient, type GithubClient } from "@/server/clients/github.client";
import { createLlmClient, type LlmClient } from "@/server/clients/llm.client";
import { getConfig } from "@/server/config";
import { createChunksDb, type ChunksDb } from "@/server/db/chunks.queries";
import { getPool } from "@/server/db/pool";
import { createReposQueries, type ReposQueries } from "@/server/db/repos.queries";
import { createAnswerService, type AnswerService } from "@/server/services/answer.service";
import { createIndexer, type IndexerService } from "@/server/services/indexer.service";
import { createReposService, type ReposService } from "@/server/services/repos.service";
import { createRetrievalService, type RetrievalService } from "@/server/services/retrieval.service";

export interface AppContainer {
  queries: ReposQueries;
  chunksDb: ChunksDb;
  github: GithubClient;
  embeddings: EmbeddingClient;
  llm: LlmClient;
  indexer: IndexerService;
  reposService: ReposService;
  retrieval: RetrievalService;
  answerService: AnswerService;
  startIndexing: (repoId: string) => void;
}

const globalForContainer = globalThis as unknown as {
  __codescoutContainer?: AppContainer;
};

export function getContainer(): AppContainer {
  const config = getConfig();
  if (globalForContainer.__codescoutContainer) {
    return globalForContainer.__codescoutContainer;
  }
  const pool = getPool();

  const queries = createReposQueries(pool);
  const chunksDb = createChunksDb(pool);
  const github = createGithubClient(config);
  const embeddings = createEmbeddingClient(config);
  const llm = createLlmClient(config);

  const indexer = createIndexer({
    queries,
    chunksDb,
    github,
    embeddings,
    limits: {
      maxFiles: config.MAX_FILES,
      maxFileBytes: config.MAX_FILE_BYTES,
      maxChunks: config.MAX_CHUNKS,
      chunkLines: config.CHUNK_LINES,
      chunkOverlap: config.CHUNK_OVERLAP,
    },
  });

  const retrieval = createRetrievalService({
    chunksDb,
    embeddings,
    topK: config.TOP_K,
  });

  const answerService = createAnswerService({
    queries,
    retrieval,
    llm,
    limits: {
      minSimilarity: config.MIN_SIMILARITY,
    },
  });

  const reposService = createReposService({
    queries,
    github,
    startIndexing: indexer.start,
    maxRepoKb: config.MAX_REPO_KB,
  });

  const container: AppContainer = {
    queries,
    chunksDb,
    github,
    embeddings,
    llm,
    indexer,
    reposService,
    retrieval,
    answerService,
    startIndexing: indexer.start,
  };

  globalForContainer.__codescoutContainer = container;
  return container;
}
