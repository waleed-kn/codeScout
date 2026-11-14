import { AppError } from "@/lib/errors";

export interface ParsedRepo {
  owner: string;
  name: string;
}

const VALID_SEGMENT = /^[A-Za-z0-9_.-]+$/;

export function parseRepoUrl(input: string): ParsedRepo {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError(
      400,
      "INVALID_REPO_URL",
      "Repository URL is required. Expected https://github.com/<owner>/<repo>."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError(
      400,
      "INVALID_REPO_URL",
      "Invalid URL format. Expected https://github.com/<owner>/<repo>."
    );
  }

  if (parsed.protocol !== "https:") {
    throw new AppError(
      400,
      "INVALID_REPO_URL",
      "Only https:// GitHub URLs are supported."
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    throw new AppError(
      400,
      "INVALID_REPO_URL",
      "Only github.com repository URLs are supported."
    );
  }

  if (parsed.search || parsed.hash) {
    throw new AppError(
      400,
      "INVALID_REPO_URL",
      "Repository URL must not contain query parameters or hash fragments."
    );
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new AppError(
      400,
      "INVALID_REPO_URL",
      "URL must point to a repository root: https://github.com/<owner>/<repo>."
    );
  }

  const owner = segments[0];
  let name = segments[1];
  if (name.endsWith(".git")) {
    name = name.slice(0, -4);
  }

  if (
    !owner ||
    !name ||
    owner === "." ||
    owner === ".." ||
    name === "." ||
    name === ".." ||
    !VALID_SEGMENT.test(owner) ||
    !VALID_SEGMENT.test(name)
  ) {
    throw new AppError(
      400,
      "INVALID_REPO_URL",
      "Invalid GitHub owner or repository name."
    );
  }

  return { owner, name };
}
