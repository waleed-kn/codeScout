"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, createRepo, deleteRepo, listRepos } from "@/client/api";
import type { RepoSummary } from "@/types";

const QUICK_REPOS = [
  "https://github.com/waleed-kn/weather-app",
  "https://github.com/sindresorhus/is",
];

export function RepoManager() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const items = await listRepos();
      setRepos(items);
      setListError(null);
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : "Failed to load repositories."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setSubmitError("Enter a public GitHub repository URL.");
      return;
    }

    setSubmitting(true);
    try {
      const repo = await createRepo(trimmed);
      setUrl("");
      router.push(`/repos/${repo.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Failed to submit repository."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(repo: RepoSummary) {
    const label = `${repo.owner}/${repo.name}`;
    if (!window.confirm(`Delete ${label} and its indexed chunks?`)) {
      return;
    }

    setDeletingId(repo.id);
    setListError(null);
    try {
      await deleteRepo(repo.id);
      setRepos((prev) => prev.filter((item) => item.id !== repo.id));
    } catch (err) {
      setListError(
        err instanceof ApiError ? err.message : "Failed to delete repository."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="stack">
      {/* ─── FRIENDLY CENTERED HERO + WHITE PILL UPLOAD BAR ─── */}
      <section className="hero-centered">
        <span className="eyebrow-gold">GITHUB CODEBASE INTELLIGENCE</span>
        <h1 className="hero-title">
          Understand any GitHub repo in plain English.
        </h1>
        <p className="hero-subtitle">
          Paste any public repository URL below. CodeScout indexes the source
          code into <strong>Neon pgvector</strong> and answers your questions
          with exact <code>file:line</code> citations.
        </p>

        <form onSubmit={handleSubmit} className="pill-form-wrap">
          <div className="pill-bar">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste GitHub URL — e.g. https://github.com/owner/repo"
              aria-label="GitHub repository URL"
              className="pill-input"
              disabled={submitting}
              required
            />
            <button
              type="submit"
              className="pill-submit-circle"
              disabled={submitting}
            >
              {submitting ? "Indexing..." : "Index repo →"}
            </button>
          </div>

          <div className="quick-fill-row">
            <span className="quick-fill-label">Try an example:</span>
            {QUICK_REPOS.map((sampleUrl) => (
              <button
                key={sampleUrl}
                type="button"
                disabled={submitting}
                onClick={() => setUrl(sampleUrl)}
                className="quick-chip"
              >
                {sampleUrl.replace("https://github.com/", "")}
              </button>
            ))}
          </div>

          {submitError ? (
            <p className="error" role="alert">
              {submitError}
            </p>
          ) : null}
        </form>
      </section>

      {/* ─── INDEXED REPOSITORIES LIST ─── */}
      <section className="section-block">
        <div className="section-header-row">
          <div>
            <span className="eyebrow-gold">Your Workspace</span>
            <h2 className="section-title">
              Indexed Repositories ({repos.length})
            </h2>
            <p className="section-sub">
              Select a ready repository to ask questions and inspect cited code.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="btn btn-ghost"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {listError ? (
          <p className="error" role="alert">
            {listError}
          </p>
        ) : null}

        {loading ? (
          <p className="muted">Loading repositories...</p>
        ) : repos.length === 0 ? (
          <div className="empty-state">
            <p>
              <strong>No repositories indexed yet.</strong>
            </p>
            <p>
              Paste any public GitHub URL in the bar above and click{" "}
              <strong>Index repo →</strong> to get started.
            </p>
          </div>
        ) : (
          <ul className="repo-list">
            {repos.map((repo) => (
              <li key={repo.id} className="repo-card">
                <div className="repo-info">
                  <Link href={`/repos/${repo.id}`} className="repo-name">
                    {repo.owner}/{repo.name}
                  </Link>
                  <span className={`badge badge-${repo.status}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {repo.status}
                  </span>
                  <span className="meta-pill mono">
                    @{repo.commitSha.slice(0, 7)}
                  </span>
                  <span className="meta-pill">
                    {repo.fileCount} files · {repo.chunkCount} chunks
                  </span>
                </div>
                <div className="repo-actions">
                  <Link href={`/repos/${repo.id}`} className="btn btn-white">
                    Open Q&amp;A →
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDelete(repo)}
                    disabled={deletingId === repo.id}
                    className="btn btn-danger"
                  >
                    {deletingId === repo.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
