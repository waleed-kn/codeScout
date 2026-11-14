CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE repos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner        TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  commit_sha   TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','indexing','ready','failed')),
  error        TEXT,
  file_count   INT         NOT NULL DEFAULT 0,
  chunk_count  INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner, name, commit_sha)
);

CREATE TABLE chunks (
  id          BIGSERIAL PRIMARY KEY,
  repo_id     UUID        NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  file_path   TEXT        NOT NULL,
  start_line  INT         NOT NULL,
  end_line    INT         NOT NULL,
  content     TEXT        NOT NULL,
  embedding   vector(768) NOT NULL
);

CREATE INDEX chunks_repo_id_idx ON chunks (repo_id);
CREATE INDEX chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
