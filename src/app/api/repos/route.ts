import { z } from "zod";
import { AppError } from "@/lib/errors";
import { getConfig } from "@/server/config";
import { getContainer } from "@/server/container";
import { handle, json } from "@/server/http";
import { checkRateLimit, getClientIp } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submitSchema = z.object({
  url: z.string().trim().min(1, "Repository URL is required."),
});

export const GET = handle(async () => {
  const repos = await getContainer().reposService.listRepos();
  return json(repos, 200);
});

export const POST = handle(async (req: Request) => {
  const config = getConfig();
  const ip = getClientIp(req, config.TRUST_PROXY);
  checkRateLimit({
    key: `index:${ip}`,
    limit: config.INDEX_LIMIT_PER_HOUR,
    windowMs: 3_600_000,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    throw new AppError(400, "VALIDATION_ERROR", message);
  }

  const { repo, created } = await getContainer().reposService.submitRepo(
    parsed.data.url
  );
  return json(repo, created ? 202 : 200);
});
