import { AppError } from "@/lib/errors";
import { buildPrompt, NOT_FOUND_MESSAGE } from "@/lib/promptBuilder";
import type { LlmClient } from "@/server/clients/llm.client";
import type { ReposQueries } from "@/server/db/repos.queries";
import type { RetrievalService } from "@/server/services/retrieval.service";

export interface AnswerSource {
  filePath: string;
  startLine: number;
  endLine: number;
  similarity: number;
  content: string;
}

export interface AskResult {
  answer: string;
  sources: AnswerSource[];
}

export interface AnswerService {
  ask(repoId: string, question: string): Promise<AskResult>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createAnswerService(deps: {
  queries: ReposQueries;
  retrieval: RetrievalService;
  llm: LlmClient;
  limits: { minSimilarity: number };
}): AnswerService {
  const { queries, retrieval, llm, limits } = deps;

  return {
    async ask(repoId, question) {
      if (!UUID_RE.test(repoId)) {
        throw new AppError(404, "REPO_NOT_FOUND", "Repository not found.");
      }

      const repo = await queries.getById(repoId);
      if (!repo) {
        throw new AppError(404, "REPO_NOT_FOUND", "Repository not found.");
      }

      if (repo.status !== "ready") {
        throw new AppError(
          409,
          "REPO_NOT_READY",
          `Repository is currently '${repo.status}' and cannot be queried yet.`
        );
      }

      const chunks = await retrieval.retrieve(repoId, question);
      if (chunks.length === 0 || chunks[0].similarity < limits.minSimilarity) {
        return {
          answer: NOT_FOUND_MESSAGE,
          sources: [],
        };
      }

      const prompt = buildPrompt(question, chunks);
      const answer = await llm.generate(prompt);

      if (answer.trim() === NOT_FOUND_MESSAGE) {
        return {
          answer: NOT_FOUND_MESSAGE,
          sources: [],
        };
      }

      return {
        answer,
        sources: chunks.map((c) => ({
          filePath: c.filePath,
          startLine: c.startLine,
          endLine: c.endLine,
          similarity: Number(c.similarity.toFixed(4)),
          content: c.content,
        })),
      };
    },
  };
}
