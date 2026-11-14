## Analogy first

Requirements are the **order form you fill in before a contractor builds a house**. "Three bedrooms, one kitchen, must be finished by June." If it isn't written down, you will argue about it later, or build the wrong thing.

**Notes to remember:**
- **Functional requirements (FR)** say what the system does.
- **Non-functional requirements (NFR)** say how well it does it (speed, safety, cost).
- Each requirement gets an **ID** and a **test you can check**, so "done" is not a feeling.

---

## 1. Goal

A web app where a user pastes a **public GitHub repo URL**, waits for indexing, then asks questions in plain English. Answers are based only on the repo's code and **cite file paths and line ranges**.

## 2. Users

One type for v1: a developer who wants to understand an unfamiliar repo. There is no login in v1.

## 3. Functional requirements

| ID | Requirement | How we check it (acceptance) |
|---|---|---|
| FR-1 | The user can submit a GitHub repo URL | `https://github.com/owner/repo` is accepted. Anything else returns a clear 400 error |
| FR-2 | The system indexes the repo in the background | Submit returns immediately with a repo id and status `pending` |
| FR-3 | The user can see indexing status | Status moves `pending` → `indexing` → `ready` or `failed`. A failure includes a readable reason |
| FR-4 | Junk files are skipped | `node_modules`, images, lock files, binaries, minified files and files over the size cap never become chunks |
| FR-5 | Files are split into overlapping chunks | Each chunk stores its path, start line and end line. Line numbers match the original file |
| FR-6 | Chunks are embedded and stored | Every chunk of a `ready` repo has a vector in Neon |
| FR-7 | The user can ask a question about a `ready` repo | Asking against a repo that is not `ready` returns a clear error |
| FR-8 | The system retrieves the top relevant chunks | Top-k is configurable (default 5). Results are ordered by similarity |
| FR-9 | The answer is grounded and cited | The answer is generated only from retrieved chunks and the UI shows each source as `path lines a-b` |
| FR-10 | The system admits when it doesn't know | A question unrelated to the repo ("What's the capital of France?") returns "I couldn't find this in the repo", not an invented answer |
| FR-11 | Re-submitting the same repo at the same commit does not duplicate data | Same `(owner, repo, commit SHA)` reuses the existing index |
| FR-12 | The user can list indexed repos and delete one | Deleting a repo also deletes its chunks |

## 4. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | **Answer latency** | Under 8 seconds for a typical question |
| NFR-2 | **Indexing time** | A small repo (about 100 files) finishes in under 2 minutes |
| NFR-3 | **Abuse limits** | Max files per repo, max file size, max total chunks, and a rate limit on the index and ask endpoints |
| NFR-4 | **Security** | Secrets only in environment variables, never in Git. The URL is validated and parsed, never used blindly. Repo text is treated as untrusted data (prompt injection) |
| NFR-5 | **Reliability** | GitHub, embedding and LLM calls use retry with backoff. A crash mid-index leaves status `failed`, not stuck on `indexing` |
| NFR-6 | **Cost** | Runs on free tiers for development. Embedding is done once per chunk, never per question beyond the question itself |
| NFR-7 | **Observability** | Structured logs with a repo id on each indexing step, and a `/health` endpoint |
| NFR-8 | **Maintainability** | The chunker and prompt builder are pure functions with unit tests. CI runs lint, tests and build on every push |

## 5. Constraints (already decided)

- **Stack:** React (Vite, TypeScript), Express (TypeScript), Neon Postgres with pgvector.
- **Embedding dimension is fixed once the table is created**, so the embedding model must be chosen before the schema.
- **Public repos only**, via the GitHub API with a server-side token.

## 6. Out of scope for v1

Private repos, GitHub login, streaming answers, understanding code structure (functions and classes), multi-repo questions, chat history.

## 7. Main data you will store

| Entity | Key fields |
|---|---|
| `repos` | id, owner, name, commit_sha, status, error, created_at |
| `chunks` | id, repo_id, file_path, start_line, end_line, content, embedding |

## 8. Main API (draft)

| Method | Path | Purpose |
|---|---|---|
| POST | `/repos` | Submit a URL, start indexing |
| GET | `/repos` | List repos |
| GET | `/repos/:id` | Get status (the page polls this) |
| DELETE | `/repos/:id` | Delete repo and chunks |
| POST | `/repos/:id/ask` | Ask a question, get answer and sources |

## 9. Definition of done for v1

All FRs pass their acceptance check, the NFRs are met or consciously deferred, and the app is deployed with a public URL.

---

## Your next step

Read this once and tell me:
1. Anything you want to **add or cut**.
2. Your **embedding choice**, which I left open earlier: **A)** a hosted API (better quality, but keys and rate limits) or **B)** a local model running inside Node (free, no rate limits, but heavier on memory when you deploy). If you're unsure, say "you pick" and I'll choose one for your free-tier deploy.

Once those two are settled, Step 2 is the database schema.