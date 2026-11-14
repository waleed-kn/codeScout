import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { extractRepoFilesFromTarGz } from "@/server/clients/github.client";

function buildTarEntry(filePath: string, content: Buffer): Buffer {
  const header = Buffer.alloc(512, 0);
  header.write(filePath, 0, 100, "utf8");
  header.write("0000644\0", 100, 8, "ascii");
  header.write("0000000\0", 108, 8, "ascii");
  header.write("0000000\0", 116, 8, "ascii");
  header.write(content.length.toString(8).padStart(11, "0") + "\0", 124, 12, "ascii");
  header.write("00000000000\0", 136, 12, "ascii");
  header.fill(0x20, 148, 156); // checksum field spaces
  header.write("0", 156, 1, "ascii"); // regular file
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");

  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");

  const paddedSize = Math.ceil(content.length / 512) * 512;
  const body = Buffer.alloc(paddedSize, 0);
  content.copy(body, 0);

  return Buffer.concat([header, body]);
}

function createTarGz(entries: Array<{ path: string; content: Buffer }>): Buffer {
  const blocks = entries.map((e) => buildTarEntry(e.path, e.content));
  const eof = Buffer.alloc(1024, 0);
  const tarBuffer = Buffer.concat([...blocks, eof]);
  return gzipSync(tarBuffer);
}

describe("extractRepoFilesFromTarGz", () => {
  it("extracts only valid text files with top-level prefix stripped", async () => {
    const gz = createTarGz([
      {
        path: "owner-repo-abc123/node_modules/pkg/index.js",
        content: Buffer.from("module.exports = 1;\n"),
      },
      {
        path: "owner-repo-abc123/assets/data.bin",
        content: Buffer.from([0x41, 0x00, 0x42]),
      },
      {
        path: "owner-repo-abc123/src/index.ts",
        content: Buffer.from("export const hello = 'world';\n"),
      },
    ]);

    const result = await extractRepoFilesFromTarGz(Readable.from(gz), {
      maxFiles: 300,
      maxFileBytes: 100_000,
    });

    expect(result.skipped).toBe(2);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("src/index.ts");
    expect(result.files[0].content.toString("utf8")).toBe(
      "export const hello = 'world';\n"
    );
  });

  it("throws AppError 413 REPO_TOO_LARGE when kept files exceed maxFiles", async () => {
    const gz = createTarGz([
      { path: "owner-repo-abc/a.ts", content: Buffer.from("const a = 1;\n") },
      { path: "owner-repo-abc/b.ts", content: Buffer.from("const b = 2;\n") },
    ]);

    await expect(
      extractRepoFilesFromTarGz(Readable.from(gz), {
        maxFiles: 1,
        maxFileBytes: 100_000,
      })
    ).rejects.toMatchObject({
      status: 413,
      code: "REPO_TOO_LARGE",
    } satisfies Partial<AppError>);
  });
});
