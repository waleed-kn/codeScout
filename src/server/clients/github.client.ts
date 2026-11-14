import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { Parser } from "tar";
import { AppError } from "@/lib/errors";
import { shouldIndexFile } from "@/lib/fileFilter";
import type { AppConfig } from "@/server/config";
import { retry } from "@/utils/retry";

export interface RepoInfo {
  sizeKb: number;
  defaultBranch: string;
  isPrivate: boolean;
}

export interface DownloadedRepoFile {
  path: string;
  content: Buffer;
}

export interface DownloadRepoResult {
  files: DownloadedRepoFile[];
  skipped: number;
}

export interface GithubClient {
  getRepoInfo(owner: string, name: string): Promise<RepoInfo>;
  getHeadSha(owner: string, name: string, branch: string): Promise<string>;
  downloadRepoFiles(
    owner: string,
    name: string,
    sha: string,
    limits: { maxFiles: number; maxFileBytes: number }
  ): Promise<DownloadRepoResult>;
}

const API_TIMEOUT_MS = 15_000;
const TARBALL_TIMEOUT_MS = 60_000;

function isRetryableError(err: unknown): boolean {
  if (err instanceof AppError) {
    return err.status === 429 || err.status >= 500;
  }
  return true;
}

function stripTopLevelDir(entryPath: string): string {
  const normalized = entryPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const idx = normalized.indexOf("/");
  if (idx === -1) {
    return "";
  }
  return normalized.slice(idx + 1);
}

export async function extractRepoFilesFromTarGz(
  source: Readable,
  limits: { maxFiles: number; maxFileBytes: number }
): Promise<DownloadRepoResult> {
  return new Promise<DownloadRepoResult>((resolve, reject) => {
    const files: DownloadedRepoFile[] = [];
    let skipped = 0;
    let settled = false;
    let pendingEntries = 0;
    let parserEnded = false;

    const gunzip = createGunzip();
    const parser = new Parser();

    function fail(err: unknown): void {
      if (settled) return;
      settled = true;
      source.unpipe(gunzip);
      gunzip.unpipe(parser);
      source.destroy();
      gunzip.destroy();
      reject(err);
    }

    function maybeResolve(): void {
      if (!settled && parserEnded && pendingEntries === 0) {
        settled = true;
        resolve({ files, skipped });
      }
    }

    parser.on("entry", (entry) => {
      if (settled) {
        entry.resume();
        return;
      }

      if (entry.type !== "File") {
        entry.resume();
        return;
      }

      pendingEntries += 1;
      const strippedPath = stripTopLevelDir(entry.path);
      const chunks: Buffer[] = [];
      let totalBytes = 0;
      let oversized = false;

      entry.on("data", (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes <= limits.maxFileBytes) {
          chunks.push(chunk);
        } else {
          oversized = true;
        }
      });

      entry.on("end", () => {
        pendingEntries -= 1;
        if (settled) return;

        if (!strippedPath || oversized) {
          skipped += 1;
          maybeResolve();
          return;
        }

        const content = Buffer.concat(chunks);
        const keep = shouldIndexFile(
          { path: strippedPath, sizeBytes: content.length, content },
          { maxFileBytes: limits.maxFileBytes }
        );

        if (!keep) {
          skipped += 1;
          maybeResolve();
          return;
        }

        if (files.length >= limits.maxFiles) {
          fail(
            new AppError(
              413,
              "REPO_TOO_LARGE",
              `Repository exceeds the maximum of ${limits.maxFiles} indexable files.`
            )
          );
          return;
        }

        files.push({ path: strippedPath, content });
        maybeResolve();
      });

      entry.on("error", fail);
    });

    parser.on("end", () => {
      parserEnded = true;
      maybeResolve();
    });

    source.on("error", fail);
    gunzip.on("error", fail);
    parser.on("error", fail);

    source.pipe(gunzip).pipe(parser);
  });
}

async function fetchGithub(
  url: string,
  token: string,
  timeoutMs: number
): Promise<Response> {
  try {
    return await retry(
      async () => {
        const res = await fetch(url, {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "CodeScout/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (res.status === 404) {
          throw new AppError(
            404,
            "REPO_NOT_FOUND",
            "GitHub repository or branch was not found."
          );
        }

        if (res.status === 409) {
          throw new AppError(
            400,
            "REPO_EMPTY",
            "This GitHub repository is empty and has no commits to index."
          );
        }

        if (res.status === 403 || res.status === 429) {
          throw new AppError(
            res.status,
            "GITHUB_RATE_LIMITED",
            "GitHub API rate limit reached."
          );
        }

        if (res.status >= 500) {
          throw new AppError(
            502,
            "GITHUB_UPSTREAM_ERROR",
            `GitHub API returned ${res.status}.`
          );
        }

        if (!res.ok) {
          throw new AppError(
            502,
            "GITHUB_API_ERROR",
            `GitHub API error (${res.status}).`
          );
        }

        return res;
      },
      { shouldRetry: isRetryableError }
    );
  } catch (err) {
    if (err instanceof AppError && err.code === "GITHUB_RATE_LIMITED") {
      throw new AppError(
        503,
        "GITHUB_RATE_LIMITED",
        "GitHub API rate limit exceeded. Please try again later."
      );
    }
    throw err;
  }
}

export function createGithubClient(
  config: Pick<AppConfig, "GITHUB_TOKEN">
): GithubClient {
  const token = config.GITHUB_TOKEN;

  return {
    async getRepoInfo(owner, name) {
      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
      const res = await fetchGithub(url, token, API_TIMEOUT_MS);
      const data = (await res.json()) as {
        size?: number;
        default_branch?: string;
        private?: boolean;
      };

      if (data.private) {
        throw new AppError(
          400,
          "REPO_NOT_PUBLIC",
          "Only public GitHub repositories are supported."
        );
      }

      return {
        sizeKb: data.size ?? 0,
        defaultBranch: data.default_branch ?? "main",
        isPrivate: Boolean(data.private),
      };
    },

    async getHeadSha(owner, name, branch) {
      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/commits/${encodeURIComponent(branch)}`;
      const res = await fetchGithub(url, token, API_TIMEOUT_MS);
      const data = (await res.json()) as { sha?: string };
      if (!data.sha) {
        throw new AppError(
          502,
          "GITHUB_API_ERROR",
          "GitHub did not return a commit SHA."
        );
      }
      return data.sha;
    },

    async downloadRepoFiles(owner, name, sha, limits) {
      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/tarball/${encodeURIComponent(sha)}`;
      const res = await fetchGithub(url, token, TARBALL_TIMEOUT_MS);
      if (!res.body) {
        throw new AppError(
          502,
          "GITHUB_API_ERROR",
          "GitHub tarball response had no body."
        );
      }

      const nodeStream = Readable.fromWeb(
        res.body as unknown as import("node:stream/web").ReadableStream
      );
      return extractRepoFilesFromTarGz(nodeStream, limits);
    },
  };
}
