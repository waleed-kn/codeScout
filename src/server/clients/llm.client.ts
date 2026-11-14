import { AppError } from "@/lib/errors";
import type { AppConfig } from "@/server/config";
import { retry } from "@/utils/retry";

export interface LlmClient {
  generate(input: { system: string; user: string }): Promise<string>;
}

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const LLM_TIMEOUT_MS = 30_000;

function isRetryableError(err: unknown): boolean {
  if (err instanceof AppError) {
    return err.status === 429 || err.status >= 500;
  }
  return true;
}

export function createLlmClient(
  config: Pick<AppConfig, "LLM_API_KEY" | "LLM_MODEL">
): LlmClient {
  return {
    async generate({ system, user }) {
      const res = await retry(
        async () => {
          const r = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.LLM_API_KEY}`,
            },
            body: JSON.stringify({
              model: config.LLM_MODEL,
              temperature: 0.1,
              max_tokens: 700,
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
            }),
            signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
          });

          if (r.status === 429 || r.status >= 500) {
            throw new AppError(
              r.status,
              "LLM_UPSTREAM_ERROR",
              `Groq API returned ${r.status}.`
            );
          }

          if (!r.ok) {
            const detail = await r.text().catch(() => "");
            throw new AppError(
              502,
              "LLM_API_ERROR",
              `Groq API error (${r.status}): ${detail.slice(0, 200)}`
            );
          }

          return r;
        },
        { shouldRetry: isRetryableError }
      );

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new AppError(
          502,
          "LLM_EMPTY_RESPONSE",
          "Groq returned an empty response."
        );
      }

      return content;
    },
  };
}
