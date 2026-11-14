import { createEmbeddingClient } from "@/server/clients/embedding.client";
import { createGithubClient } from "@/server/clients/github.client";
import { createLlmClient } from "@/server/clients/llm.client";
import { getConfig } from "@/server/config";

async function main(): Promise<void> {
  const repoArg = process.argv[2] ?? "octocat/Hello-World";
  const [owner, name] = repoArg.split("/");
  if (!owner || !name) {
    throw new Error("Usage: npm run try:clients -- <owner>/<repo>");
  }

  const config = getConfig();

  const embeddings = createEmbeddingClient(config);
  const docVectors = await embeddings.embedTexts(
    ["function add(a, b) { return a + b; }", "export const version = '1.0.0';"],
    "document"
  );
  console.log("Document embeddings count:", docVectors.length);
  console.log("Embedding dimension:", docVectors[0]?.length);

  const queryVectors = await embeddings.embedTexts(
    ["How are numbers added?"],
    "query"
  );
  console.log("Query embedding dimension:", queryVectors[0]?.length);

  const llm = createLlmClient(config);
  const reply = await llm.generate({
    system: "You are a helpful assistant.",
    user: "Say hello",
  });
  console.log("LLM reply:", reply);

  const github = createGithubClient(config);
  const info = await github.getRepoInfo(owner, name);
  console.log(`Repo info (${owner}/${name}):`, info);
}

main().catch((err) => {
  console.error("try:clients failed:", err);
  process.exitCode = 1;
});
