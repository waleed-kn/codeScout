import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import "@/app/globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CodeScout — Architectural Codebase RAG Engine | Muhammad Waleed",
  description:
    "Index any public GitHub repository into Neon pgvector and ask plain-English questions backed by exact file and line-range citations. Developed by Muhammad Waleed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body>
        <div className="site-shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="brand-link">
                CODESCOUT<span className="brand-dot">.</span>
              </Link>

              <nav className="topbar-nav" aria-label="Primary navigation">
                <a href="/#index-workspace" className="topbar-nav-link">
                  01 / Indexer
                </a>
                <a href="/#pipeline" className="topbar-nav-link">
                  02 / Architecture
                </a>
                <a href="/#use-cases" className="topbar-nav-link">
                  03 / Use Cases
                </a>
              </nav>

              <div className="topbar-right">
                <span className="status-tag">
                  <span className="status-dot-live" aria-hidden="true" />
                  PGVECTOR // 768D
                </span>
                <Link href="/" className="nav-cta">
                  Workspace
                </Link>
              </div>
            </div>
          </header>

          <div className="page-body">{children}</div>

          <footer className="site-footer">
            <div className="footer-inner">
              <div className="footer-top-grid">
                <div>
                  <span className="footer-kicker">
                    [ SYSTEM COLOPHON // GROUNDED CODE INTELLIGENCE ]
                  </span>
                  <h2 className="footer-headline">
                    ENGINEERED FOR ZERO-HALLUCINATION REPOSITORY Q&amp;A.
                  </h2>
                  <p className="footer-desc">
                    CodeScout ingests public GitHub repositories via streaming
                    tarballs, chunks source files with 1-based line preservation,
                    indexes 768-dimensional embeddings in Neon Postgres
                    (pgvector HNSW), and synthesizes answers strictly from cited
                    source code.
                  </p>
                </div>

                <div className="footer-meta-box">
                  <div>
                    <div className="footer-dev-label">
                      ARCHITECT &amp; DEVELOPER
                    </div>
                    <div className="footer-dev-name">
                      Developed by Muhammad Waleed
                    </div>
                    <div className="footer-dev-role">
                      AI-First Full Stack Developer · Next.js · TypeScript · RAG
                      Systems
                    </div>
                  </div>
                  <div className="footer-links">
                    <a
                      href="https://muhammad-waleed-kn.vercel.app/"
                      target="_blank"
                      rel="noreferrer"
                      className="footer-link-btn"
                    >
                      Portfolio ↗
                    </a>
                    <a
                      href="https://github.com/waleed-kn"
                      target="_blank"
                      rel="noreferrer"
                      className="footer-link-btn"
                    >
                      GitHub ↗
                    </a>
                    <a
                      href="https://www.linkedin.com/in/muhammadwaleed111/"
                      target="_blank"
                      rel="noreferrer"
                      className="footer-link-btn"
                    >
                      LinkedIn ↗
                    </a>
                  </div>
                </div>
              </div>

              <div className="footer-bottom-row">
                <div className="footer-colophon">
                  COLOPHON // EDITION 2026 — DESIGNED &amp; DEVELOPED BY
                  MUHAMMAD WALEED (WALEED KN)
                </div>
                <div className="footer-watermark" aria-hidden="true">
                  WALEED<span>.</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
