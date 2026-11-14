import { getPool } from "@/server/db/pool";
import { getLogger } from "@/server/logger";

export async function recoverStuckIndexing(): Promise<void> {
  const logger = getLogger();
  try {
    const pool = getPool();
    const res = await pool.query(
      `UPDATE repos
       SET status = 'failed',
           error = 'Server restarted during indexing',
           updated_at = now()
       WHERE status IN ('pending', 'indexing')`
    );
    const updated = res.rowCount ?? 0;
    logger.info({ updated }, "Recovered stuck indexing repositories on startup");
  } catch (err) {
    logger.error({ err }, "Failed to recover stuck indexing repositories on startup");
  }
}
