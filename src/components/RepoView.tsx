"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, askQuestion, createRepo, getRepo } from "@/client/api";
import { AnswerCard } from "@/components/AnswerCard";
import type { AskResponse, Repo } from "@/types";

interface ChatTurn {
  id: number;
  question: string;
  response: AskResponse;
}

const SAMPLE_QUESTIONS = [
  "What is the main purpose and architecture of this repository?",
  "Where is the main entry point and how does data fetching work?",
  "How are errors or edge cases handled in the code?",
];

function formatApiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.code === "RATE_LIMITED") {
      return "Too many requests — please try again in a minute.";
    }
    if (err.code === "REPO_NOT_READY") {
      return "This repository is not ready for questions yet.";
    }
    return err.message || fallback;
  }
  return fallback;
}

export function RepoView({ id }: { id: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [repo, setRepo] = useState<Repo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);

  const fetchRepo = useCallback(async () => {
    try {
      const data = await getRepo(id);
      setRepo(data);
      setNotFound(false);
      setLoadError(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "REPO_NOT_FOUND") {
        setNotFound(true);
      } else {
        setLoadError(formatApiError(err, "Failed to load repository."));
      }
    }
  }, [id]);

  useEffect(() => {
    void fetchRepo();
  }, [fetchRepo]);

  useEffect(() => {
    if (!repo || (repo.status !== "pending" && repo.status !== "indexing")) {
      return;
    }

    const timer = setInterval(() => {
      void fetchRepo();
    }, 2000);

    return () => clearInterval(timer);
  }, [repo?.status, fetchRepo]);

  async function handleRetry() {
    if (!repo) return;
    setRetrying(true);
    setLoadError(null);
    try {
      const next = await createRepo(
        `https://github.com/${repo.owner}/${repo.name}`
      );
      if (next.id !== repo.id) {
        router.push(`/repos/${next.id}`);
      } else {
        setRepo(next);
      }
    } catch (err) {
      setLoadError(formatApiError(err, "Failed to restart indexing."));
    } finally {
      setRetrying(false);
    }
  }

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || asking) return;

    setAskError(null);
    setAsking(true);
    try {
      const response = await askQuestion(id, trimmed);
      setTurns((prev) => [
        ...prev,
        { id: Date.now(), question: trimmed, response },
      ]);
      setQuestion("");
    } catch (err) {
      setAskError(formatApiError(err, "Failed to get an answer."));
    } finally {
      setAsking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }

  async function handleAsk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await submitQuestion(question);
  }

  if (notFound) {
    return (
      <main className="container">
        <div className="panel-card">
          <span className="eyebrow-gold">404</span>
          <h1 className="section-title">Repo not found</h1>
          <p className="muted">
            This repository does not exist or may have been deleted.
          </p>
          <div>
            <Link href="/" className="btn btn-ghost">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loadError && !repo) {
    return (
      <main className="container">
        <div className="panel-card">
          <p className="error" role="alert">
            {loadError}
          </p>
          <div>
            <Link href="/" className="btn btn-ghost">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!repo) {
    return (
      <main className="container">
        <div className="panel-card">
          <p className="muted">Loading repository workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="stack" style={{ gap: 28 }}>
        <header className="panel-card">
          <div className="repo-header">
            <div>
              <span className="eyebrow-gold">Repository Workspace</span>
              <h1>
                {repo.owner}/{repo.name}
              </h1>
              <div className="repo-meta-line">
                <span className={`badge badge-${repo.status}`}>
                  <span className="status-dot" aria-hidden="true" />
                  {repo.status}
                </span>
                <span className="meta-pill mono">
                  @{repo.commitSha.slice(0, 7)}
                </span>
                {repo.status === "ready" ? (
                  <span className="meta-pill">
                    {repo.fileCount} files · {repo.chunkCount} chunks
                  </span>
                ) : null}
              </div>
            </div>

            <div className="repo-actions">
              <a
                href={`https://github.com/${repo.owner}/${repo.name}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                View on GitHub ↗
              </a>
              <Link href="/" className="btn btn-white">
                ← Home
              </Link>
            </div>
          </div>
        </header>

        {repo.status === "pending" ? (
          <div className="status-box" role="status">
            <strong>Queued for indexing</strong>
            <span>Checking status automatically every 2 seconds...</span>
          </div>
        ) : null}

        {repo.status === "indexing" ? (
          <div className="status-box" role="status">
            <strong>Indexing repository</strong>
            <span>
              Downloading tarball, chunking files, and generating embeddings...
            </span>
          </div>
        ) : null}

        {repo.status === "failed" ? (
          <div className="error-panel" role="alert">
            <strong>Indexing failed</strong>
            <p>{repo.error ?? "An unexpected error occurred during indexing."}</p>
            {loadError ? <p className="error">{loadError}</p> : null}
            <button
              type="button"
              onClick={() => void handleRetry()}
              disabled={retrying}
              className="btn btn-white"
            >
              {retrying ? "Retrying..." : "Try again"}
            </button>
          </div>
        ) : null}

        {repo.status === "ready" ? (
          <section className="panel-card">
            <div>
              <span className="eyebrow-gold">Grounded Q&amp;A</span>
              <h2 className="section-title">Ask CodeScout</h2>
              <p className="section-sub">
                Ask anything about <strong>{repo.owner}/{repo.name}</strong>.
                Every answer cites exact <code>filePath:startLine-endLine</code>{" "}
                chunks.
              </p>
            </div>

            <form onSubmit={handleAsk} className="stack" style={{ gap: 12 }}>
              <label htmlFor="question-input" className="sr-only">
                Ask a question about {repo.owner}/{repo.name}
              </label>
              <div className="pill-bar" style={{ maxWidth: "100%" }}>
                <input
                  id="question-input"
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about this codebase..."
                  maxLength={500}
                  disabled={asking}
                  className="pill-input"
                  required
                />
                <button
                  type="submit"
                  disabled={asking || question.trim().length === 0}
                  className="pill-submit-circle"
                >
                  {asking ? "Thinking..." : "Ask →"}
                </button>
              </div>

              <div className="form-foot">
                <div className="quick-fill-row" style={{ justifyContent: "flex-start" }}>
                  <span className="quick-fill-label">Try:</span>
                  {SAMPLE_QUESTIONS.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      disabled={asking}
                      onClick={() => setQuestion(sample)}
                      className="quick-chip"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
                <div className="char-count">{question.length}/500</div>
              </div>
            </form>

            {asking ? (
              <div className="status-box" role="status">
                <strong>Searching codebase</strong>
                <span>
                  Finding matching code chunks and preparing cited answer...
                </span>
              </div>
            ) : null}

            {askError ? (
              <p className="error" role="alert">
                {askError}
              </p>
            ) : null}

            {turns.length > 0 ? (
              <div className="qa-list">
                {turns.map((turn) => (
                  <AnswerCard
                    key={turn.id}
                    question={turn.question}
                    response={turn.response}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>
                  <strong>Ready for your first question.</strong>
                </p>
                <p>
                  Type a question above or click a suggested prompt to see
                  cited code excerpts.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
