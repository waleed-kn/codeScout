import { AppError } from "@/lib/errors";
import { parseRepoUrl } from "@/lib/parseRepoUrl";
import type { GithubClient } from "@/server/clients/github.client";
import type { RepoRecord, ReposQueries } from "@/server/db/repos.queries";

export interface ReposService {
  submitRepo(url: string): Promise<{ repo: RepoRecord; created: boolean }>;
  listRepos(): Promise<RepoRecord[]>;
  getRepo(id: string): Promise<RepoRecord>;
  deleteRepo(id: string): Promise<void>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createReposService(deps: {
  queries: ReposQueries;
  github: GithubClient;
  startIndexing: (repoId: string) => void;
  maxRepoKb: number;
}): ReposService {
  const { queries, github, startIndexing, maxRepoKb } = deps;

  return {
    async submitRepo(url) {
      const { owner, name } = parseRepoUrl(url);
      const info = await github.getRepoInfo(owner, name);
      if (info.sizeKb > maxRepoKb) {
        throw new AppError(
          413,
          "REPO_TOO_LARGE",
          `Repository size (${info.sizeKb} KB) exceeds limit (${maxRepoKb} KB).`
        );
      }

      const sha = await github.getHeadSha(owner, name, info.defaultBranch);
      const { repo, created } = await queries.createOrGetExisting(
        owner,
        name,
        sha
      );

      if (created) {
        startIndexing(repo.id);
      }

      return { repo, created };
    },

    async listRepos() {
      return queries.listAll();
    },

    async getRepo(id) {
      if (!UUID_RE.test(id)) {
        throw new AppError(404, "REPO_NOT_FOUND", "Repository not found.");
      }
      const repo = await queries.getById(id);
      if (!repo) {
        throw new AppError(404, "REPO_NOT_FOUND", "Repository not found.");
      }
      return repo;
    },

    async deleteRepo(id) {
      if (!UUID_RE.test(id)) {
        throw new AppError(404, "REPO_NOT_FOUND", "Repository not found.");
      }
      const deleted = await queries.deleteById(id);
      if (!deleted) {
        throw new AppError(404, "REPO_NOT_FOUND", "Repository not found.");
      }
    },
  };
}
