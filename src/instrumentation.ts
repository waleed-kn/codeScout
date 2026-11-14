export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recoverStuckIndexing } = await import("@/server/db/recover");
    await recoverStuckIndexing();
  }
}
