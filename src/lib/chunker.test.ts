import { describe, expect, it } from "vitest";
import { chunkFile } from "@/lib/chunker";

describe("chunkFile", () => {
  it("chunks a 100-line file with 40/5 into exact 1-based inclusive ranges", () => {
    const content = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n");
    const chunks = chunkFile(
      { path: "src/sample.ts", content },
      { chunkLines: 40, overlap: 5 }
    );

    expect(
      chunks.map((c) => ({
        filePath: c.filePath,
        startLine: c.startLine,
        endLine: c.endLine,
      }))
    ).toEqual([
      { filePath: "src/sample.ts", startLine: 1, endLine: 40 },
      { filePath: "src/sample.ts", startLine: 36, endLine: 75 },
      { filePath: "src/sample.ts", startLine: 71, endLine: 100 },
    ]);
  });

  it("handles empty and one-line files", () => {
    expect(
      chunkFile({ path: "empty.ts", content: "" }, { chunkLines: 40, overlap: 5 })
    ).toEqual([]);

    expect(
      chunkFile(
        { path: "one.ts", content: "const x = 1;\n" },
        { chunkLines: 40, overlap: 5 }
      )
    ).toEqual([
      { filePath: "one.ts", startLine: 1, endLine: 1, content: "const x = 1;" },
    ]);
  });

  it("normalizes CRLF input", () => {
    const chunks = chunkFile(
      { path: "crlf.ts", content: "a\r\nb\r\nc\r\n" },
      { chunkLines: 40, overlap: 5 }
    );
    expect(chunks).toEqual([
      { filePath: "crlf.ts", startLine: 1, endLine: 3, content: "a\nb\nc" },
    ]);
  });

  it("skips whitespace-only chunks", () => {
    const content = ["code 1", "   ", "\t", "   ", "code 5"].join("\n");
    const chunks = chunkFile(
      { path: "ws.ts", content },
      { chunkLines: 3, overlap: 1 }
    );
    // Chunk 1: lines 1-3 ("code 1", "   ", "\t") -> kept
    // Chunk 2: lines 3-5 ("\t", "   ", "code 5") -> kept
    // Now test a middle chunk that is purely whitespace:
    const content2 = ["code 1", "   ", "   ", "   ", "   ", "code 6"].join("\n");
    const chunks2 = chunkFile(
      { path: "ws2.ts", content: content2 },
      { chunkLines: 2, overlap: 0 }
    );
    expect(chunks2).toEqual([
      { filePath: "ws2.ts", startLine: 1, endLine: 2, content: "code 1\n   " },
      { filePath: "ws2.ts", startLine: 5, endLine: 6, content: "   \ncode 6" },
    ]);
    expect(chunks.length).toBe(2);
  });

  it("truncates lines longer than 500 chars", () => {
    const longLine = "x".repeat(600);
    const chunks = chunkFile(
      { path: "long.ts", content: longLine },
      { chunkLines: 40, overlap: 5 }
    );
    expect(chunks[0].content).toBe("x".repeat(500) + " ...[truncated]");
  });

  it("does not emit a redundant final chunk already contained in the previous chunk", () => {
    const content = Array.from({ length: 40 }, (_, i) => `line ${i + 1}`).join("\n");
    const chunks = chunkFile(
      { path: "exact.ts", content },
      { chunkLines: 40, overlap: 5 }
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(40);
  });

  it("throws when overlap >= chunkLines", () => {
    expect(() =>
      chunkFile({ path: "bad.ts", content: "a" }, { chunkLines: 10, overlap: 10 })
    ).toThrow();
  });
});
