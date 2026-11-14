import { z } from "zod";
import { AppError } from "@/lib/errors";
import { getConfig } from "@/server/config";
import { getContainer } from "@/server/container";
import { handle, json } from "@/server/http";
import { checkRateLimit, getClientIp } from "@/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const askSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Question is required.")
    .max(500, "Question must be 500 characters or less."),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handle(async (req: Request, context: RouteContext) => {
  const config = getConfig();
  const ip = getClientIp(req, config.TRUST_PROXY);
  checkRateLimit({
    key: `ask:${ip}`,
    limit: config.ASK_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    throw new AppError(400, "VALIDATION_ERROR", message);
  }

  const { id } = await context.params;
  const result = await getContainer().answerService.ask(id, parsed.data.question);
  return json(result, 200);
});
