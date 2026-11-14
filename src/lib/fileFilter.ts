const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "vendor",
  ".next",
  "coverage",
  "__pycache__",
  ".venv",
  "target",
]);

const LOCK_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "cargo.lock",
  "poetry.lock",
]);

const BINARY_EXTENSIONS = new Set([
  // images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".ico",
  ".svg",
  ".tiff",
  ".avif",
  // fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  // archives
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".7z",
  ".rar",
  // docs / binaries / executables / media
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".wasm",
  ".pyc",
  ".class",
  ".jar",
  ".mp3",
  ".wav",
  ".ogg",
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
]);

export function shouldIndexPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").trim();
  if (!normalized) {
    return false;
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) {
    return false;
  }

  for (let i = 0; i < parts.length - 1; i++) {
    if (SKIP_DIRS.has(parts[i])) {
      return false;
    }
  }

  const fileName = parts[parts.length - 1].toLowerCase();
  if (LOCK_FILES.has(fileName)) {
    return false;
  }

  if (
    fileName.endsWith(".min.js") ||
    fileName.endsWith(".min.css") ||
    fileName.endsWith(".map")
  ) {
    return false;
  }

  const dotIdx = fileName.lastIndexOf(".");
  if (dotIdx !== -1) {
    const ext = fileName.slice(dotIdx);
    if (BINARY_EXTENSIONS.has(ext)) {
      return false;
    }
  }

  return true;
}

export function shouldIndexFile(
  file: { path: string; sizeBytes: number; content: Buffer },
  opts: { maxFileBytes: number }
): boolean {
  if (!shouldIndexPath(file.path)) {
    return false;
  }

  if (file.sizeBytes <= 0 || file.content.length === 0) {
    return false;
  }

  if (file.sizeBytes > opts.maxFileBytes) {
    return false;
  }

  const sampleLimit = Math.min(file.content.length, 8000);
  for (let i = 0; i < sampleLimit; i++) {
    if (file.content[i] === 0) {
      return false;
    }
  }

  if (file.sizeBytes > 5000) {
    const text = file.content.toString("utf8");
    const lineCount = text.split(/\r?\n/).length;
    if (text.length / lineCount > 200) {
      return false;
    }
  }

  return true;
}
