import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "@/app/globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CodeScout — AI Codebase Intelligence & RAG | Muhammad Waleed",
  description:
    "Index any public GitHub repository into Neon pgvector and ask plain-English questions backed by exact file and line-range citations. Developed by Muhammad Waleed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body>
        <div className="site-shell">
          <div className="nav-wrapper">
            <header className="topbar-pill">
              <nav className="topbar-nav" aria-label="Primary navigation">
                <a href="/#indexer" className="topbar-nav-link">
                  Indexer
                </a>
                <a href="/#how-it-works" className="topbar-nav-link">
                  How It Works
                </a>
                <a href="/#use-cases" className="topbar-nav-link">
                  Use Cases
                </a>
              </nav>

              <Link href="/" className="brand-link">
                CODESCOUT
              </Link>

              <div className="topbar-right">
                <span className="status-pill-subtle">
                  <span className="status-dot-gold" aria-hidden="true" />
                  pgvector · 768d
                </span>
                <Link href="/" className="nav-cta-pill">
                  Home
                </Link>
              </div>
            </header>
          </div>

          <div className="page-body">{children}</div>

          <footer className="site-footer">
            <div className="footer-inner">
              <div>
                <div className="footer-brand-title">CODESCOUT</div>
                <p className="footer-brand-desc">
                  Grounded GitHub repository Q&amp;A — ask in plain English and
                  verify every answer with line-exact code citations.
                </p>
              </div>

              <div>
                <div className="footer-col-title">Navigation</div>
                <ul className="footer-col-list">
                  <li>
                    <a href="/#indexer">Index a Repository</a>
                  </li>
                  <li>
                    <a href="/#how-it-works">How It Works</a>
                  </li>
                  <li>
                    <a href="/#use-cases">Use Cases</a>
                  </li>
                </ul>
              </div>

              <div>
                <div className="footer-col-title">Technology</div>
                <ul className="footer-col-list">
                  <li>Neon Postgres + pgvector</li>
                  <li>Gemini 768-D Embeddings</li>
                  <li>Groq Grounded Synthesis</li>
                  <li>GitHub Actions &amp; Docker</li>
                </ul>
              </div>

              <div>
                <div className="footer-col-title">Developed By</div>
                <ul className="footer-col-list">
                  <li className="footer-dev-highlight">Muhammad Waleed</li>
                  <li>
                    <a
                      href="https://muhammad-waleed-kn.vercel.app/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Portfolio ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/waleed-kn/codeScout"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub ↗
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.linkedin.com/in/muhammadwaleed111/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      LinkedIn ↗
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
