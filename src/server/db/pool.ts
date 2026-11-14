import { Pool } from "pg";
import { getConfig } from "@/server/config";
import { getLogger } from "@/server/logger";

const globalForPool = globalThis as unknown as {
  __codescoutPool?: Pool;
};

export function getPool(): Pool {
  if (!globalForPool.__codescoutPool) {
    const config = getConfig();
    const pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      getLogger().error({ err }, "Unexpected Postgres pool error");
    });

    globalForPool.__codescoutPool = pool;
  }

  return globalForPool.__codescoutPool;
}

export async function closePool(): Promise<void> {
  const pool = globalForPool.__codescoutPool;
  if (pool) {
    delete globalForPool.__codescoutPool;
    await pool.end();
  }
}
