import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { parseRepoUrl } from "@/lib/parseRepoUrl";

describe("parseRepoUrl", () => {
  it("parses standard, www, trailing slash, .git suffix, and trimmed URLs", () => {
    expect(parseRepoUrl("https://github.com/vercel/next.js")).toEqual({
      owner: "vercel",
      name: "next.js",
    });
    expect(parseRepoUrl("  https://www.github.com/my-org/my_repo.git/  ")).toEqual({
      owner: "my-org",
      name: "my_repo",
    });
  });

  it("rejects invalid protocols, hosts, extra paths, query/hash, empty, and bad chars", () => {
    const invalidInputs = [
      "",
      "   ",
      "not-a-url",
      "http://github.com/owner/repo",
      "https://gitlab.com/owner/repo",
      "https://github.com/owner",
      "https://github.com/owner/repo/tree/main",
      "https://github.com/owner/repo?tab=readme",
      "https://github.com/owner/repo#readme",
      "https://github.com/owner/..",
      "https://github.com/own$er/repo",
    ];

    for (const url of invalidInputs) {
      let caught: unknown;
      try {
        parseRepoUrl(url);
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(AppError);
      expect((caught as AppError).status).toBe(400);
      expect((caught as AppError).code).toBe("INVALID_REPO_URL");
    }
  });
});
