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
      {/* ─── HIGH-VISIBILITY REPOSITORY UPLOAD / INGESTION CONSOLE ─── */}
      <section className="upload-spotlight">
        <div className="upload-spotlight-banner">
          <div className="upload-banner-left">
            <span className="upload-pulse-dot" aria-hidden="true" />
            <span>
              START HERE // PASTE PUBLIC GITHUB REPOSITORY URL TO UPLOAD &amp;
              INDEX
            </span>
          </div>
          <span className="upload-banner-right">
            MODULE 01 // INGESTION CONSOLE
          </span>
        </div>

        <div className="upload-spotlight-body">
          <div className="upload-head-row">
            <div>
              <h2 className="upload-title">
                Index a Public GitHub Repository
              </h2>
              <p className="upload-sub">
                Enter any <code>https://github.com/owner/repo</code> URL below
                — CodeScout streams, chunks, and embeds the codebase for instant
                Q&amp;A.
              </p>
            </div>
            <div className="upload-step-pills" aria-hidden="true">
              <span className="upload-step-pill upload-step-pill-active">
                1. PASTE URL
              </span>
              <span className="upload-step-pill">2. AUTO-INDEX</span>
              <span className="upload-step-pill">3. ASK &amp; CITE</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form">
            <div className="upload-input-group">
              <div className="upload-input-wrap">
                <span className="upload-input-prefix" aria-hidden="true">
                  GITHUB URL ▸
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  aria-label="GitHub repository URL"
                  className="upload-input"
                  disabled={submitting}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-upload-cta"
                disabled={submitting}
              >
                {submitting ? "Indexing..." : "Index repo →"}
              </button>
            </div>

            <div className="upload-helper-bar">
              <div className="upload-examples">
                <span className="upload-example-label">QUICK FILL:</span>
                {QUICK_REPOS.map((sampleUrl) => (
                  <button
                    key={sampleUrl}
                    type="button"
                    disabled={submitting}
                    onClick={() => setUrl(sampleUrl)}
                    className="upload-example-chip"
                  >
                    {sampleUrl.replace("https://github.com/", "")}
                  </button>
                ))}
              </div>
              <span className="upload-hint">
                Supports public GitHub repositories up to 50 MB
              </span>
            </div>

            {submitError ? (
              <p className="error" role="alert">
                {submitError}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      {/* ─── INDEXED REPOSITORIES ARCHIVE ─── */}
      <section className="panel-card">
        <div className="panel-top-bar">
          <div>
            <span className="index-badge-ink">
              MODULE 02 // INDEXED REPOSITORIES ({repos.length})
            </span>
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

        <div>
          <h3 className="panel-title">Indexed Repositories</h3>
          <p className="muted">
            Click any ready repository below to open its grounded Q&amp;A
            workspace.
          </p>
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
            <p className="muted">
              Paste a GitHub URL in the orange spotlight console above and click{" "}
              <strong>Index repo</strong> to get started.
            </p>
          </div>
        ) : (
          <ul className="repo-list">
            {repos.map((repo, index) => (
              <li key={repo.id} className="repo-row">
                <div className="repo-info">
                  <span className="repo-index-num">
                    [{String(index + 1).padStart(2, "0")}]
                  </span>
                  <Link href={`/repos/${repo.id}`} className="repo-name">
                    {repo.owner}/{repo.name}
                  </Link>
                  <span className={`badge badge-${repo.status}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {repo.status}
                  </span>
                  <span className="meta-chip mono">
                    @{repo.commitSha.slice(0, 7)}
                  </span>
                  <span className="meta-chip">
                    {repo.fileCount} files · {repo.chunkCount} chunks
                  </span>
                </div>
                <div className="repo-actions">
                  <Link href={`/repos/${repo.id}`} className="btn btn-accent">
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
