import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "is required and must be non-empty");
const positiveInt = z.coerce.number().int().positive();

const configSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_URL: nonEmptyString,
    GITHUB_TOKEN: nonEmptyString,
    EMBEDDING_API_KEY: nonEmptyString,
    EMBEDDING_MODEL: nonEmptyString,
    EMBEDDING_DIM: positiveInt.default(768),
    LLM_API_KEY: nonEmptyString,
    LLM_MODEL: nonEmptyString,
    MAX_FILES: positiveInt.default(300),
    MAX_FILE_BYTES: positiveInt.default(100000),
    MAX_CHUNKS: positiveInt.default(3000),
    MAX_REPO_KB: positiveInt.default(50000),
    CHUNK_LINES: positiveInt.default(40),
    CHUNK_OVERLAP: positiveInt.default(5),
    TOP_K: positiveInt.default(5),
    MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.3),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
    INDEX_LIMIT_PER_HOUR: positiveInt.default(5),
    ASK_LIMIT_PER_MINUTE: positiveInt.default(20),
  })
  .refine((data) => data.CHUNK_OVERLAP < data.CHUNK_LINES, {
    path: ["CHUNK_OVERLAP"],
    message: "CHUNK_OVERLAP must be less than CHUNK_LINES",
  });

export type AppConfig = z.infer<typeof configSchema>;

const globalForConfig = globalThis as unknown as {
  __codescoutConfig?: AppConfig;
  __codescoutContainer?: unknown;
};

export function resetConfigCache(): void {
  delete globalForConfig.__codescoutConfig;
  delete globalForConfig.__codescoutContainer;
}

export function getConfig(): AppConfig {
  const cached = globalForConfig.__codescoutConfig;
  if (
    cached &&
    cached.EMBEDDING_MODEL === process.env.EMBEDDING_MODEL &&
    cached.LLM_MODEL === process.env.LLM_MODEL &&
    cached.LLM_API_KEY === process.env.LLM_API_KEY &&
    cached.EMBEDDING_API_KEY === process.env.EMBEDDING_API_KEY
  ) {
    return cached;
  }
  delete globalForConfig.__codescoutContainer;

  try {
    const parsed = configSchema.safeParse(process.env);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => {
          const key = issue.path.length > 0 ? issue.path.join(".") : "ENV";
          return `${key}: ${issue.message}`;
        })
        .join("; ");
      throw new Error(`Invalid environment configuration: ${details}`);
    }

    globalForConfig.__codescoutConfig = parsed.data;
    return parsed.data;
  } finally {
  }
}
