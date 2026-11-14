import { closePool, getPool } from "@/server/db/pool";

async function main(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const extRes = await client.query<{ extname: string }>(
      "SELECT extname FROM pg_extension WHERE extname = 'vector'"
    );
    if (extRes.rowCount !== 1) {
      throw new Error("pgvector extension is not installed.");
    }
    console.log("pgvector extension verified.");

    const vector = Array.from({ length: 768 }, (_, i) =>
      i === 0 ? 1 : 0
    );
    const vectorLiteral = `[${vector.join(",")}]`;

    await client.query("BEGIN");

    const repoRes = await client.query<{ id: string }>(
      `INSERT INTO repos (owner, name, commit_sha, status)
       VALUES ($1, $2, $3, 'ready')
       RETURNING id`,
      ["codescout-check", "test-repo", "0000000000000000000000000000000000000000"]
    );
    const repoId = repoRes.rows[0].id;

    await client.query(
      `INSERT INTO chunks (repo_id, file_path, start_line, end_line, content, embedding)
       VALUES ($1, $2, $3, $4, $5, $6::vector)`,
      [repoId, "src/index.ts", 1, 10, "export const check = true;", vectorLiteral]
    );

    const searchRes = await client.query<{
      file_path: string;
      start_line: number;
      end_line: number;
      similarity: number;
    }>(
      `SELECT file_path, start_line, end_line,
              1 - (embedding <=> $1::vector) AS similarity
       FROM chunks
       WHERE repo_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [vectorLiteral, repoId]
    );

    console.log("Cosine-distance check result:", searchRes.rows[0]);

    await client.query("ROLLBACK");
    console.log("Rolled back check transaction; tables left clean.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

main().catch((err) => {
  console.error("Database check failed:", err);
  process.exitCode = 1;
});
