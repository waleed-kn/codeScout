import { AppError } from "@/lib/errors";
import { getPool } from "@/server/db/pool";
import { handle, json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return json({ status: "ready" }, 200);
  } catch {
    throw new AppError(503, "DB_UNAVAILABLE", "Database is unavailable.");
  }
});
