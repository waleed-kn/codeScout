import type { Pool } from "pg";

export interface ChunkInsertRow {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
}

export interface RetrievedChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  similarity: number;
}

export interface ChunksDb {
  insertChunksBatch(repoId: string, chunks: ChunkInsertRow[]): Promise<void>;
  deleteChunksByRepo(repoId: string): Promise<void>;
  searchChunks(
    repoId: string,
    queryVector: number[],
    limit: number
  ): Promise<RetrievedChunk[]>;
}

function toVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export function createChunksDb(pool: Pool): ChunksDb {
  return {
    async insertChunksBatch(repoId, chunks) {
      if (chunks.length === 0) {
        return;
      }

      const values: unknown[] = [];
      const placeholders: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const base = i * 6;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::vector)`
        );
        values.push(
          repoId,
          c.filePath,
          c.startLine,
          c.endLine,
          c.content,
          toVectorString(c.embedding)
        );
      }

      await pool.query(
        `INSERT INTO chunks (repo_id, file_path, start_line, end_line, content, embedding)
         VALUES ${placeholders.join(", ")}`,
        values
      );
    },

    async deleteChunksByRepo(repoId) {
      await pool.query("DELETE FROM chunks WHERE repo_id = $1", [repoId]);
    },

    async searchChunks(repoId, queryVector, limit) {
      const res = await pool.query<{
        file_path: string;
        start_line: number;
        end_line: number;
        content: string;
        similarity: number;
      }>(
        `SELECT file_path, start_line, end_line, content,
                1 - (embedding <=> $1::vector) AS similarity
         FROM chunks WHERE repo_id = $2
         ORDER BY embedding <=> $1::vector LIMIT $3`,
        [toVectorString(queryVector), repoId, limit]
      );

      return res.rows.map((row) => ({
        filePath: row.file_path,
        startLine: row.start_line,
        endLine: row.end_line,
        content: row.content,
        similarity: Number(row.similarity),
      }));
    },
  };
}
