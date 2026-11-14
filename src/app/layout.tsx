import type { Metadata } from "next";
import Link from "next/link";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "CodeScout — AI Codebase Intelligence & RAG",
  description:
    "Index any public GitHub repository into pgvector and ask plain-English questions backed by exact file and line-range citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="bg-ambient" aria-hidden="true" />
        <div className="site-shell">
          <nav className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="brand-link">
                <span className="brand-mark">{`</>`}</span>
                <span className="brand-text">CodeScout</span>
              </Link>
              <div className="topbar-right">
                <span className="tech-pill">pgvector · 768d · Groq RAG</span>
                <Link href="/" className="nav-btn">
                  Home
                </Link>
              </div>
            </div>
          </nav>

          <div className="page-body">{children}</div>

          <footer className="site-footer">
            <div className="footer-inner">
              <div className="footer-brand">
                <span className="brand-mark brand-mark-sm">{`</>`}</span>
                <div>
                  <div className="footer-title">CodeScout</div>
                  <div className="footer-sub">
                    Grounded GitHub Repository RAG Engine — Zero-Hallucination
                    Code Q&amp;A with Line-Exact Citations
                  </div>
                </div>
              </div>
              <div className="footer-credit">
                <span className="credit-badge">
                  Developed by <strong>Muhammad Waleed</strong>
                </span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
