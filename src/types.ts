export type RepoStatus = "pending" | "indexing" | "ready" | "failed";

export interface RepoSummary {
  id: string;
  owner: string;
  name: string;
  commitSha: string;
  status: RepoStatus;
  fileCount: number;
  chunkCount: number;
}

export interface Repo extends RepoSummary {
  error: string | null;
}

export interface Source {
  filePath: string;
  startLine: number;
  endLine: number;
  similarity: number;
  content: string;
}

export interface AskResponse {
  answer: string;
  sources: Source[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
