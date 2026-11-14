import fs from "node:fs/promises";
import path from "node:path";
import { closePool, getPool } from "@/server/db/pool";
import { getLogger } from "@/server/logger";

export async function runMigrations(): Promise<string[]> {
  const pool = getPool();
  const logger = getLogger();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const migrationsDir = path.join(
    process.cwd(),
    "src",
    "server",
    "db",
    "migrations"
  );

  const entries = await fs.readdir(migrationsDir);
  const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();

  const appliedRes = await pool.query<{ name: string }>(
    "SELECT name FROM schema_migrations"
  );
  const applied = new Set(appliedRes.rows.map((r) => r.name));

  const newlyApplied: string[] = [];

  for (const name of sqlFiles) {
    if (applied.has(name)) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, name), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        name,
      ]);
      await client.query("COMMIT");
      newlyApplied.push(name);
      logger.info({ migration: name }, "Applied migration");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  return newlyApplied;
}

const isCli =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1]?.replace(/\\/g, "/").endsWith("src/server/db/migrate.ts");

if (isCli) {
  runMigrations()
    .then((applied) => {
      if (applied.length === 0) {
        console.log("No pending migrations.");
      } else {
        console.log(`Applied migrations: ${applied.join(", ")}`);
      }
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
