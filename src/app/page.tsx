import { RepoManager } from "@/components/RepoManager";

export default function HomePage() {
  return (
    <main className="container">
      {/* ─── 01 // ARCHITECTURAL MANIFESTO + ABOVE-THE-FOLD UPLOAD CONSOLE ─── */}
      <section className="hero-section">
        <div className="manifesto-bar">
          <span className="manifesto-label">
            [ 01 // ARCHITECTURAL MANIFESTO ]
          </span>
          <div className="manifesto-rule" />
          <span className="manifesto-meta">EDITION // 2026</span>
        </div>

        <div className="hero-top-split">
          <h1 className="hero-display">
            GROUNDED CODEBASE
            <br />
            INTELLIGENCE <span className="hero-accent">&amp; RAG.</span>
          </h1>

          <p className="hero-lead-compact">
            <strong>CodeScout</strong> downloads any public GitHub repository,
            indexes source chunks into <strong>Neon Postgres + pgvector</strong>
            , and answers questions strictly from the retrieved code with exact{" "}
            <code>file:startLine-endLine</code> citations.
          </p>
        </div>

        <div className="telemetry-strip">
          <div className="telemetry-cell">
            <span className="telemetry-kicker">VECTOR INDEX</span>
            <span className="telemetry-val">
              768-D <span>HNSW</span>
            </span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-kicker">CHUNK WINDOW</span>
            <span className="telemetry-val">
              40 LN <span>/ 10 OVL</span>
            </span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-kicker">CITATIONS</span>
            <span className="telemetry-val">
              100% <span>LINE-EXACT</span>
            </span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-kicker">GUARDRAILS</span>
            <span className="telemetry-val">
              STRICT <span>NO GUESSING</span>
            </span>
          </div>
        </div>
      </section>

      {/* ─── 02 // PROMINENT REPOSITORY UPLOAD & ARCHIVE WORKSPACE ─── */}
      <section id="index-workspace" className="editorial-section">
        <RepoManager />
      </section>

      {/* ─── 03 // RAG PIPELINE ARCHITECTURE ─── */}
      <section id="pipeline" className="editorial-section">
        <div className="editorial-header">
          <div>
            <span className="editorial-kicker">
              SECTION 02 // SYSTEM ARCHITECTURE
            </span>
            <h2 className="editorial-title">HOW CODESCOUT WORKS.</h2>
          </div>
          <span className="editorial-subtitle">
            Three-stage deterministic indexing &amp; retrieval pipeline
          </span>
        </div>

        <div className="bento-grid-3">
          <article className="bento-cell-interactive">
            <div className="bento-step-row">
              <span className="index-badge">INDEX // 01</span>
              <span className="bento-num">01</span>
            </div>
            <h3 className="bento-card-title">STREAMING TARBALL INGESTION</h3>
            <p className="bento-card-body">
              Resolves the default branch commit SHA via the GitHub API and
              streams the repository tarball in memory. Automatically filters
              out <code>node_modules</code>, lockfiles, binaries, images, and
              minified bundles.
            </p>
          </article>

          <article className="bento-cell-interactive">
            <div className="bento-step-row">
              <span className="index-badge">INDEX // 02</span>
              <span className="bento-num">02</span>
            </div>
            <h3 className="bento-card-title">LINE-EXACT VECTOR CHUNKING</h3>
            <p className="bento-card-body">
              Splits source files into overlapping 40-line windows (10-line
              overlap) preserving 1-based start and end line numbers, embeds
              each chunk into 768 dimensions, and stores them in Neon{" "}
              <code>pgvector</code>.
            </p>
          </article>

          <article className="bento-cell-interactive">
            <div className="bento-step-row">
              <span className="index-badge">INDEX // 03</span>
              <span className="bento-num">03</span>
            </div>
            <h3 className="bento-card-title">CITED GROUNDED SYNTHESIS</h3>
            <p className="bento-card-body">
              Embeds your question, retrieves the top-K chunks via HNSW cosine
              similarity, and answers strictly from those code blocks with
              clickable <code>[path:start-end]</code> source chips.
            </p>
          </article>
        </div>
      </section>

      {/* ─── 04 // WHAT IS CODESCOUT USED FOR? ─── */}
      <section id="use-cases" className="editorial-section">
        <div className="editorial-header">
          <div>
            <span className="editorial-kicker">
              SECTION 03 // PRACTICAL APPLICATIONS
            </span>
            <h2 className="editorial-title">WHAT IS CODESCOUT USED FOR?</h2>
          </div>
          <span className="editorial-subtitle">
            Built for software engineers, reviewers, and technical architects
          </span>
        </div>

        <div className="usecase-grid">
          <article className="usecase-plate">
            <div className="usecase-plate-top">
              <span className="index-badge-ink">PLATE 01 // ONBOARDING</span>
              <h3>RAPID CODEBASE ONBOARDING</h3>
              <p>
                Drop into an unfamiliar open-source project or new team
                repository and immediately discover where entry points, routing,
                database schemas, and core domain services live.
              </p>
            </div>
            <div className="usecase-plate-bottom">
              <span>TARGET: ENTRY POINTS &amp; ROUTING</span>
              <span>VERIFIED CITATIONS</span>
            </div>
          </article>

          <article className="usecase-plate">
            <div className="usecase-plate-top">
              <span className="index-badge-ink">PLATE 02 // ARCHITECTURE</span>
              <h3>TRACING DATA FLOW &amp; API WIRING</h3>
              <p>
                Ask how authentication, state management, rate limiting, or API
                handlers are connected across multiple modules and inspect the
                exact lines of code side-by-side.
              </p>
            </div>
            <div className="usecase-plate-bottom">
              <span>TARGET: CROSS-FILE EXECUTION</span>
              <span>LINE-BY-LINE PROOF</span>
            </div>
          </article>

          <article className="usecase-plate">
            <div className="usecase-plate-top">
              <span className="index-badge-ink">PLATE 03 // AUDITING</span>
              <h3>SECURITY &amp; CONFIGURATION AUDITS</h3>
              <p>
                Locate where environment variables, error boundaries, SQL
                queries, or validation rules are enforced without manually
                grepping through hundreds of directories.
              </p>
            </div>
            <div className="usecase-plate-bottom">
              <span>TARGET: ENV &amp; VALIDATION RULES</span>
              <span>INSTANT RETRIEVAL</span>
            </div>
          </article>

          <article className="usecase-plate">
            <div className="usecase-plate-top">
              <span className="index-badge-ink">PLATE 04 // INTEGRITY</span>
              <h3>ZERO-HALLUCINATION VERIFICATION</h3>
              <p>
                Unlike generic chat assistants that guess or invent APIs,
                CodeScout refuses out-of-scope questions and explicitly replies{" "}
                <em>&ldquo;I couldn&apos;t find this in the repo.&rdquo;</em>{" "}
                when evidence is absent.
              </p>
            </div>
            <div className="usecase-plate-bottom">
              <span>TARGET: STRICT RAG GUARDRAILS</span>
              <span>NO SPECULATION</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
