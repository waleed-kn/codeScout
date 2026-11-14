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
  "Where is the main entry point and how does routing or data fetching work?",
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
      const next = await createRepo(`https://github.com/${repo.owner}/${repo.name}`);
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
      setTurns((prev) => [...prev, { id: Date.now(), question: trimmed, response }]);
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
        <div className="panel-card stack">
          <h1>Repo not found</h1>
          <p className="muted">
            This repository does not exist or may have been deleted.
          </p>
          <div>
            <Link href="/" className="btn btn-ghost">
              Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loadError && !repo) {
    return (
      <main className="container">
        <div className="panel-card stack">
          <p className="error" role="alert">
            {loadError}
          </p>
          <div>
            <Link href="/" className="btn btn-ghost">
              Home
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
      <div className="stack">
        <header className="panel-card glow-panel repo-header">
          <div>
            <div className="eyebrow">INDEXED REPOSITORY WORKSPACE</div>
            <h1>
              {repo.owner}/{repo.name}
            </h1>
            <div className="repo-meta-line">
              <span className={`badge badge-${repo.status}`}>
                <span className="status-dot" aria-hidden="true" />
                {repo.status}
              </span>
              <span className="meta-chip mono">
                commit @{repo.commitSha.slice(0, 7)}
              </span>
              {repo.status === "ready" ? (
                <span className="meta-chip">
                  {repo.fileCount} files · {repo.chunkCount} vector chunks
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
            <Link href="/" className="btn btn-ghost">
              Home
            </Link>
          </div>
        </header>

        {repo.status === "pending" ? (
          <div className="status-box" role="status">
            <strong>Queued for indexing.</strong> Waiting for worker slot —
            polling automatically every 2 seconds...
          </div>
        ) : null}

        {repo.status === "indexing" ? (
          <div className="status-box" role="status">
            <strong>Indexing in progress.</strong> Downloading tarball,
            chunking source files, and generating 768-dim embeddings...
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
              className="btn btn-primary"
            >
              {retrying ? "Retrying..." : "Try again"}
            </button>
          </div>
        ) : null}

        {repo.status === "ready" ? (
          <section className="panel-card chat-section">
            <div className="section-head">
              <div>
                <h2>Ask CodeScout</h2>
                <p className="muted">
                  Answers are generated strictly from retrieved code chunks and
                  cite exact file paths and line ranges.
                </p>
              </div>
            </div>

            <form onSubmit={handleAsk} className="form">
              <label htmlFor="question-input" className="sr-only">
                Ask a question about {repo.owner}/{repo.name}
              </label>
              <div className="row">
                <input
                  id="question-input"
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How does data fetching work in this repo?"
                  maxLength={500}
                  disabled={asking}
                  className="input"
                  required
                />
                <button
                  type="submit"
                  disabled={asking || question.trim().length === 0}
                  className="btn btn-primary"
                >
                  {asking ? "Thinking..." : "Ask"}
                </button>
              </div>
              <div className="form-foot">
                <div className="starter-row">
                  <span className="muted">Try:</span>
                  {SAMPLE_QUESTIONS.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      disabled={asking}
                      onClick={() => setQuestion(sample)}
                      className="starter-pill"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
                <div className="char-count muted">{question.length}/500</div>
              </div>
            </form>

            {asking ? (
              <div className="status-box" role="status">
                Embedding query, searching pgvector, and generating cited
                answer...
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
                <p>No questions asked in this session yet.</p>
                <p className="muted">
                  Ask a question above or click one of the starter prompts to
                  inspect cited source chunks.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
