import type { ApiErrorBody, AskResponse, Repo, RepoSummary } from "@/types";

export class ApiError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => null)) as T | ApiErrorBody | null;

  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      err?.code ?? "REQUEST_FAILED",
      err?.message ?? `Request failed (${res.status})`
    );
  }

  return body as T;
}

export function createRepo(url: string): Promise<Repo> {
  return request<Repo>("/api/repos", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function listRepos(): Promise<RepoSummary[]> {
  return request<RepoSummary[]>("/api/repos", { cache: "no-store" });
}

export function getRepo(id: string): Promise<Repo> {
  return request<Repo>(`/api/repos/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export function deleteRepo(id: string): Promise<void> {
  return request<void>(`/api/repos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function askQuestion(id: string, question: string): Promise<AskResponse> {
  return request<AskResponse>(`/api/repos/${encodeURIComponent(id)}/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
