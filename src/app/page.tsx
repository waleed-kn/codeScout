import { RepoManager } from "@/components/RepoManager";

export default function HomePage() {
  return (
    <main className="container">
      <div id="indexer">
        <RepoManager />
      </div>

      <section id="how-it-works" className="section-block">
        <div>
          <span className="eyebrow-gold">Pipeline</span>
          <h2 className="section-title">How CodeScout Works</h2>
          <p className="section-sub">
            Three simple steps from a GitHub URL to verified, line-exact code
            answers.
          </p>
        </div>

        <div className="grid-3">
          <article className="feature-card">
            <span className="feature-kicker">01 · Ingest</span>
            <h3>Streaming Tarball Extraction</h3>
            <p>
              Paste any public GitHub URL. CodeScout streams the repository
              tarball in memory and automatically skips <code>node_modules</code>
              , lockfiles, images, and binaries.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-kicker">02 · Index</span>
            <h3>Line-Preserving Vector Chunks</h3>
            <p>
              Source files are split into 40-line overlapping windows with exact
              1-based line numbers, embedded into 768-D vectors, and stored in{" "}
              <code>Neon pgvector</code>.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-kicker">03 · Cite</span>
            <h3>Zero-Hallucination Answers</h3>
            <p>
              Your question retrieves the closest code chunks by cosine
              similarity. Every answer cites clickable{" "}
              <code>path:start-end</code> excerpts and never guesses.
            </p>
          </article>
        </div>
      </section>

      <section id="use-cases" className="section-block">
        <div>
          <span className="eyebrow-gold">Built For Developers</span>
          <h2 className="section-title">What Is CodeScout Used For?</h2>
          <p className="section-sub">
            Explore unfamiliar repositories, trace architecture, and audit code
            with confidence.
          </p>
        </div>

        <div className="grid-2">
          <article className="feature-card">
            <span className="feature-kicker">Onboarding</span>
            <h3>Rapid Codebase Onboarding</h3>
            <p>
              Jump into a new open-source project or team codebase and instantly
              discover where entry points, routing, and database queries live.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-kicker">Architecture</span>
            <h3>Tracing Data Flow &amp; APIs</h3>
            <p>
              Ask how authentication, state management, or API routes connect
              across files and inspect the exact lines side-by-side.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-kicker">Auditing</span>
            <h3>Configuration &amp; Security Checks</h3>
            <p>
              Find where environment variables, rate limits, or validation
              schemas are enforced without grepping through dozens of folders.
            </p>
          </article>

          <article className="feature-card">
            <span className="feature-kicker">Accuracy</span>
            <h3>Strict Grounded Guardrails</h3>
            <p>
              If the answer isn&apos;t in the repository, CodeScout refuses to
              speculate and clearly tells you{" "}
              <em>&ldquo;I couldn&apos;t find this in the repo.&rdquo;</em>
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
