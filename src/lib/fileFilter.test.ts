import { describe, expect, it } from "vitest";
import { shouldIndexFile, shouldIndexPath } from "@/lib/fileFilter";

describe("shouldIndexPath", () => {
  it("rejects skipped directories", () => {
    const dirs = [
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
    ];
    for (const dir of dirs) {
      expect(shouldIndexPath(`${dir}/file.ts`)).toBe(false);
      expect(shouldIndexPath(`packages/app/${dir}/file.ts`)).toBe(false);
    }
  });

  it("rejects lock files, minified/sourcemap files, and binary extensions", () => {
    expect(shouldIndexPath("package-lock.json")).toBe(false);
    expect(shouldIndexPath("yarn.lock")).toBe(false);
    expect(shouldIndexPath("pnpm-lock.yaml")).toBe(false);
    expect(shouldIndexPath("Cargo.lock")).toBe(false);
    expect(shouldIndexPath("poetry.lock")).toBe(false);
    expect(shouldIndexPath("public/app.min.js")).toBe(false);
    expect(shouldIndexPath("public/app.min.css")).toBe(false);
    expect(shouldIndexPath("dist/app.js.map")).toBe(false);
    expect(shouldIndexPath("assets/logo.png")).toBe(false);
    expect(shouldIndexPath("fonts/inter.woff2")).toBe(false);
    expect(shouldIndexPath("bundle.zip")).toBe(false);
    expect(shouldIndexPath("docs/spec.pdf")).toBe(false);
    expect(shouldIndexPath("bin/tool.exe")).toBe(false);
    expect(shouldIndexPath("media/intro.mp4")).toBe(false);
  });

  it("allows normal source paths", () => {
    expect(shouldIndexPath("src/app/page.tsx")).toBe(true);
    expect(shouldIndexPath("README.md")).toBe(true);
  });
});

describe("shouldIndexFile", () => {
  it("rejects empty files and files exceeding maxFileBytes", () => {
    expect(
      shouldIndexFile(
        { path: "src/empty.ts", sizeBytes: 0, content: Buffer.from("") },
        { maxFileBytes: 10000 }
      )
    ).toBe(false);

    expect(
      shouldIndexFile(
        { path: "src/big.ts", sizeBytes: 10001, content: Buffer.alloc(10001, 65) },
        { maxFileBytes: 10000 }
      )
    ).toBe(false);
  });

  it("rejects binary content with NUL byte in first 8000 bytes", () => {
    const buf = Buffer.from("hello\0world");
    expect(
      shouldIndexFile(
        { path: "src/data.txt", sizeBytes: buf.length, content: buf },
        { maxFileBytes: 10000 }
      )
    ).toBe(false);
  });

  it("rejects likely-minified files (size > 5000 and avg line length > 200)", () => {
    const minified = Buffer.from("a".repeat(6000));
    expect(
      shouldIndexFile(
        { path: "src/vendor-inline.js", sizeBytes: minified.length, content: minified },
        { maxFileBytes: 100000 }
      )
    ).toBe(false);
  });

  it("accepts valid text files", () => {
    const normal = Buffer.from("export const hello = 'world';\n");
    expect(
      shouldIndexFile(
        { path: "src/hello.ts", sizeBytes: normal.length, content: normal },
        { maxFileBytes: 100000 }
      )
    ).toBe(true);
  });
});
