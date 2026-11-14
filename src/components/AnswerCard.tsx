"use client";

import { useState } from "react";
import type { AskResponse } from "@/types";

export function AnswerCard({
  question,
  response,
}: {
  question: string;
  response: AskResponse;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const selectedSource =
    expandedIdx !== null ? response.sources[expandedIdx] ?? null : null;

  return (
    <article className="qa-card">
      <div className="qa-question">{question}</div>
      <div className="qa-answer">{response.answer}</div>

      {response.sources.length > 0 ? (
        <div className="sources-wrap">
          <div className="chips">
            {response.sources.map((src, idx) => {
              const isOpen = expandedIdx === idx;
              return (
                <button
                  key={`${src.filePath}:${src.startLine}-${src.endLine}:${idx}`}
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpandedIdx(isOpen ? null : idx)}
                  className={`chip ${isOpen ? "chip-active" : ""}`}
                >
                  <span>
                    {src.filePath}:{src.startLine}-{src.endLine}
                  </span>
                  <span className="chip-sim">
                    {(src.similarity * 100).toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>

          {selectedSource ? (
            <div className="code-panel">
              <div className="code-header">
                <span className="mono">
                  {selectedSource.filePath}:{selectedSource.startLine}-
                  {selectedSource.endLine}
                </span>
                <span className="muted">
                  similarity {selectedSource.similarity.toFixed(3)}
                </span>
              </div>
              <pre className="code-pre">
                <code>
                  {selectedSource.content.split("\n").map((line, i) => (
                    <span key={i} className="code-line">
                      <span className="line-num">
                        {selectedSource.startLine + i}
                      </span>
                      <span className="line-text">{line}</span>
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
