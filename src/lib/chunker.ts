export interface CodeChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

const MAX_LINE_CHARS = 500;
const TRUNCATED_SUFFIX = " ...[truncated]";

function truncateLine(line: string): string {
  if (line.length <= MAX_LINE_CHARS) {
    return line;
  }
  return line.slice(0, MAX_LINE_CHARS) + TRUNCATED_SUFFIX;
}

export function chunkFile(
  input: { path: string; content: string },
  opts: { chunkLines: number; overlap: number }
): CodeChunk[] {
  const { chunkLines, overlap } = opts;
  if (chunkLines <= 0) {
    throw new Error("chunkLines must be greater than 0");
  }
  if (overlap < 0) {
    throw new Error("overlap must be non-negative");
  }
  if (overlap >= chunkLines) {
    throw new Error("overlap must be less than chunkLines");
  }

  if (!input.content) {
    return [];
  }

  const normalized = input.content.replace(/\r\n/g, "\n");
  const rawLines = normalized.split("\n");
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
    rawLines.pop();
  }

  if (rawLines.length === 0) {
    return [];
  }

  const lines = rawLines.map(truncateLine);
  const step = chunkLines - overlap;
  const chunks: CodeChunk[] = [];
  let prevEndLine = 0;

  for (let startIdx = 0; startIdx < lines.length; startIdx += step) {
    const endIdx = Math.min(lines.length, startIdx + chunkLines);
    const startLine = startIdx + 1;
    const endLine = endIdx;

    if (endLine <= prevEndLine) {
      break;
    }

    const chunkContent = lines.slice(startIdx, endIdx).join("\n");
    if (chunkContent.trim().length > 0) {
      chunks.push({
        filePath: input.path,
        startLine,
        endLine,
        content: chunkContent,
      });
      prevEndLine = endLine;
    }

    if (endIdx >= lines.length) {
      break;
    }
  }

  return chunks;
}
