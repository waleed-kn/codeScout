import type { EmbeddingClient } from "@/server/clients/embedding.client";
import type { ChunksDb, RetrievedChunk } from "@/server/db/chunks.queries";

export interface RetrievalService {
  retrieve(repoId: string, question: string): Promise<RetrievedChunk[]>;
}

export function createRetrievalService(deps: {
  chunksDb: ChunksDb;
  embeddings: EmbeddingClient;
  topK: number;
}): RetrievalService {
  const { chunksDb, embeddings, topK } = deps;

  return {
    async retrieve(repoId, question) {
      const [queryVector] = await embeddings.embedTexts([question], "query");
      if (!queryVector) {
        return [];
      }
      return chunksDb.searchChunks(repoId, queryVector, topK);
    },
  };
}
