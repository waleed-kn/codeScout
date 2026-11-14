import type { Pool } from "pg";

export type RepoStatus = "pending" | "indexing" | "ready" | "failed";

export interface RepoRecord {
  id: string;
  owner: string;
  name: string;
  commitSha: string;
  status: RepoStatus;
  error: string | null;
  fileCount: number;
  chunkCount: number;
}

export interface ReposQueries {
  getById(id: string): Promise<RepoRecord | null>;
  listAll(): Promise<RepoRecord[]>;
  createOrGetExisting(
    owner: string,
    name: string,
    commitSha: string
  ): Promise<{ repo: RepoRecord; created: boolean }>;
  deleteById(id: string): Promise<boolean>;
  setStatus(
    id: string,
    status: RepoStatus,
    options?: { error?: string | null; fileCount?: number; chunkCount?: number }
  ): Promise<void>;
}

interface RepoRow {
  id: string;
  owner: string;
  name: string;
  commit_sha: string;
  status: RepoStatus;
  error: string | null;
  file_count: number;
  chunk_count: number;
}

function mapRepoRow(row: RepoRow): RepoRecord {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    commitSha: row.commit_sha,
    status: row.status,
    error: row.error,
    fileCount: row.file_count,
    chunkCount: row.chunk_count,
  };
}

export function createReposQueries(pool: Pool): ReposQueries {
  return {
    async getById(id) {
      const res = await pool.query<RepoRow>(
        `SELECT id, owner, name, commit_sha, status, error, file_count, chunk_count
         FROM repos
         WHERE id = $1`,
        [id]
      );
      const row = res.rows[0];
      return row ? mapRepoRow(row) : null;
    },

    async listAll() {
      const res = await pool.query<RepoRow>(
        `SELECT id, owner, name, commit_sha, status, error, file_count, chunk_count
         FROM repos
         ORDER BY created_at DESC`
      );
      return res.rows.map(mapRepoRow);
    },

    async createOrGetExisting(owner, name, commitSha) {
      const inserted = await pool.query<RepoRow>(
        `INSERT INTO repos (owner, name, commit_sha, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (owner, name, commit_sha) DO NOTHING
         RETURNING id, owner, name, commit_sha, status, error, file_count, chunk_count`,
        [owner, name, commitSha]
      );

      if (inserted.rows[0]) {
        return { repo: mapRepoRow(inserted.rows[0]), created: true };
      }

      const existing = await pool.query<RepoRow>(
        `SELECT id, owner, name, commit_sha, status, error, file_count, chunk_count
         FROM repos
         WHERE owner = $1 AND name = $2 AND commit_sha = $3`,
        [owner, name, commitSha]
      );

      const row = existing.rows[0];
      if (!row) {
        throw new Error("Failed to insert or retrieve repository record.");
      }

      if (row.status === "failed") {
        const reset = await pool.query<RepoRow>(
          `UPDATE repos
           SET status = 'pending', error = NULL, file_count = 0, chunk_count = 0, updated_at = now()
           WHERE id = $1
           RETURNING id, owner, name, commit_sha, status, error, file_count, chunk_count`,
          [row.id]
        );
        if (reset.rows[0]) {
          return { repo: mapRepoRow(reset.rows[0]), created: true };
        }
      }

      return { repo: mapRepoRow(row), created: false };
    },

    async deleteById(id) {
      const res = await pool.query("DELETE FROM repos WHERE id = $1", [id]);
      return (res.rowCount ?? 0) > 0;
    },

    async setStatus(id, status, options = {}) {
      await pool.query(
        `UPDATE repos
         SET status = $2,
             error = $3,
             file_count = COALESCE($4, file_count),
             chunk_count = COALESCE($5, chunk_count),
             updated_at = now()
         WHERE id = $1`,
        [
          id,
          status,
          options.error ?? null,
          options.fileCount ?? null,
          options.chunkCount ?? null,
        ]
      );
    },
  };
}
