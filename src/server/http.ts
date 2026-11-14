import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { getLogger } from "@/server/logger";

export function json<T>(
  data: T,
  status = 200,
  headers?: Record<string, string>
): NextResponse<T> {
  return NextResponse.json(data, { status, headers });
}

type RouteHandler<TContext = unknown> = (
  req: Request,
  context: TContext
) => Promise<Response> | Response;

export function handle<TContext = unknown>(
  fn: RouteHandler<TContext>
): (req: Request, context: TContext) => Promise<Response> {
  return async (req: Request, context: TContext): Promise<Response> => {
    const start = Date.now();
    const method = req.method;
    const path = new URL(req.url).pathname;
    const logger = getLogger();

    try {
      const response = await fn(req, context);
      const duration = Date.now() - start;
      logger.info({ method, path, status: response.status, duration }, "HTTP request");
      return response;
    } catch (err) {
      const duration = Date.now() - start;

      if (err instanceof AppError) {
        logger.warn(
          { method, path, status: err.status, duration, code: err.code },
          err.message
        );
        return json(
          { error: { code: err.code, message: err.message } },
          err.status,
          err.headers
        );
      }

      logger.error(
        { method, path, status: 500, duration, err },
        "Unhandled route error"
      );
      return json(
        { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
        500
      );
    }
  };
}
