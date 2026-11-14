import pino, { type Logger } from "pino";
import { getConfig } from "@/server/config";

const globalForLogger = globalThis as unknown as {
  __codescoutLogger?: Logger;
};

function resolveNodeEnv(): "development" | "production" | "test" {
  try {
    return getConfig().NODE_ENV;
  } catch {
    return "development";
  }
}

export function getLogger(): Logger {
  if (globalForLogger.__codescoutLogger) {
    return globalForLogger.__codescoutLogger;
  }

  const env = resolveNodeEnv();
  const isDev = env === "development";

  const instance = pino({
    level: env === "test" ? "silent" : "info",
    redact: {
      paths: [
        "authorization",
        "*.authorization",
        "headers.authorization",
        "req.headers.authorization",
      ],
      censor: "[REDACTED]",
    },
    ...(isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          },
        }
      : {}),
  });

  globalForLogger.__codescoutLogger = instance;
  return instance;
}
