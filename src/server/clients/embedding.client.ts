import { AppError } from "@/lib/errors";
import type { AppConfig } from "@/server/config";
import { retry } from "@/utils/retry";

export interface EmbeddingClient {
  embedTexts(
    texts: string[],
    kind: "document" | "query"
  ): Promise<number[][]>;
}

const GEMINI_BATCH_SIZE = 100;
const EMBED_TIMEOUT_MS = 30_000;

function isRetryableError(err: unknown): boolean {
  if (err instanceof AppError) {
    return err.status === 429 || err.status >= 500;
  }
  return true;
}

export function createEmbeddingClient(
  config: Pick<AppConfig, "EMBEDDING_API_KEY" | "EMBEDDING_MODEL" | "EMBEDDING_DIM">
): EmbeddingClient {
  const { EMBEDDING_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIM } = config;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(EMBEDDING_MODEL)}:batchEmbedContents?key=${encodeURIComponent(EMBEDDING_API_KEY)}`;

  async function embedBatch(
    texts: string[],
    kind: "document" | "query"
  ): Promise<number[][]> {
    const taskType =
      kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY";

    const res = await retry(
      async () => {
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: texts.map((text) => ({
              model: `models/${EMBEDDING_MODEL}`,
              content: { parts: [{ text }] },
              taskType,
              outputDimensionality: EMBEDDING_DIM,
            })),
          }),
          signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
        });

        if (r.status === 429 || r.status >= 500) {
          throw new AppError(
            r.status,
            "EMBEDDING_UPSTREAM_ERROR",
            `Embedding API returned ${r.status}.`
          );
        }

        if (!r.ok) {
          const detail = await r.text().catch(() => "");
          throw new AppError(
            502,
            "EMBEDDING_API_ERROR",
            `Embedding API error (${r.status}): ${detail.slice(0, 200)}`
          );
        }

        return r;
      },
      { shouldRetry: isRetryableError }
    );

    const json = (await res.json()) as {
      embeddings?: Array<{ values?: number[] }>;
    };

    if (!json.embeddings || json.embeddings.length !== texts.length) {
      throw new AppError(
        502,
        "EMBEDDING_API_ERROR",
        "Embedding API returned an unexpected number of vectors."
      );
    }

    return json.embeddings.map((item) => {
      const values = item.values ?? [];
      if (values.length !== EMBEDDING_DIM) {
        throw new Error(
          `Embedding model dimension (${values.length}) does not match the vector(${EMBEDDING_DIM}) column.`
        );
      }
      return values;
    });
  }

  return {
    async embedTexts(texts, kind) {
      if (texts.length === 0) {
        return [];
      }

      const allVectors: number[][] = [];
      for (let i = 0; i < texts.length; i += GEMINI_BATCH_SIZE) {
        const batch = texts.slice(i, i + GEMINI_BATCH_SIZE);
        const vectors = await embedBatch(batch, kind);
        allVectors.push(...vectors);
      }
      return allVectors;
    },
  };
}
