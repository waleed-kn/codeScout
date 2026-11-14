import { RepoManager } from "@/components/RepoManager";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero-card">
        <div className="eyebrow">AI-POWERED REPOSITORY RAG ENGINE</div>
        <h1 className="hero-title">
          Understand Any GitHub Codebase in{" "}
          <span className="gradient-text">Plain English</span>
        </h1>
        <p className="hero-lead">
          CodeScout is a Retrieval-Augmented Generation (RAG) web application
          built for developers. Paste any public GitHub repository URL —
          CodeScout downloads and indexes the source code into{" "}
          <strong>Neon Postgres + pgvector</strong>, then answers your
          questions strictly from the retrieved code with exact{" "}
          <code>file:startLine-endLine</code> citations.
        </p>

        <div className="hero-stats">
          <div className="stat-pill">
            <span className="stat-val">100%</span>
            <span className="stat-lbl">Grounded in Repo Code</span>
          </div>
          <div className="stat-pill">
            <span className="stat-val">768-dim</span>
            <span className="stat-lbl">HNSW Vector Search</span>
          </div>
          <div className="stat-pill">
            <span className="stat-val">Line-Exact</span>
            <span className="stat-lbl">Source Citations</span>
          </div>
        </div>
      </section>

      <RepoManager />

      <section className="info-section">
        <div className="section-head">
          <h2>How CodeScout Works</h2>
          <span className="muted">End-to-end RAG pipeline</span>
        </div>
        <div className="bento-grid">
          <article className="bento-card">
            <div className="bento-step">01 · INGEST &amp; FILTER</div>
            <h3>Smart Tarball Extraction</h3>
            <p>
              Downloads the repository tarball in a single stream in memory.
              Automatically skips <code>node_modules</code>, lockfiles,
              binaries, images, and minified bundles.
            </p>
          </article>

          <article className="bento-card">
            <div className="bento-step">02 · CHUNK &amp; EMBED</div>
            <h3>Line-Preserving Vector Index</h3>
            <p>
              Splits source files into overlapping 40-line windows preserving
              exact 1-based line numbers, embeds them into 768-dimensional
              vectors, and stores them in Neon <code>pgvector</code>.
            </p>
          </article>

          <article className="bento-card">
            <div className="bento-step">03 · RETRIEVE &amp; CITE</div>
            <h3>Grounded Answers Only</h3>
            <p>
              Finds the top matching code chunks by cosine similarity and
              generates answers strictly from those excerpts. Every claim cites{" "}
              <code>[path:start-end]</code> and refuses out-of-scope questions.
            </p>
          </article>
        </div>
      </section>

      <section className="info-section">
        <div className="section-head">
          <h2>What Is CodeScout Used For?</h2>
          <span className="muted">Built for developers &amp; engineering teams</span>
        </div>
        <div className="usecase-grid">
          <div className="usecase-card">
            <h4>Rapid Codebase Onboarding</h4>
            <p>
              Jump into an unfamiliar open-source project or new team repository
              and immediately discover where routing, database queries, or entry
              points live.
            </p>
          </div>
          <div className="usecase-card">
            <h4>Tracing Architecture &amp; Data Flow</h4>
            <p>
              Ask how authentication, error handling, state management, or API
              endpoints are wired across multiple files and inspect the exact
              lines side-by-side.
            </p>
          </div>
          <div className="usecase-card">
            <h4>Code Audits &amp; Debugging</h4>
            <p>
              Locate where specific environment variables, rate limits, or
              validation rules are enforced without manually grepping hundreds
              of files.
            </p>
          </div>
          <div className="usecase-card">
            <h4>Zero-Hallucination Verification</h4>
            <p>
              Unlike generic chat models, CodeScout never guesses. If the answer
              is not in the repository, it explicitly replies{" "}
              <em>&ldquo;I couldn&apos;t find this in the repo.&rdquo;</em>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
