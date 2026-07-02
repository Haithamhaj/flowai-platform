import { ingestSourceDocument } from "../../packages/source-ingestion/dist/index.js";
import {
  createOpenAiVectorStoreClient,
  loadOpenAiProviderConfig
} from "../../packages/ai-builder-orchestrator/dist/index.js";

const config = loadOpenAiProviderConfig({
  allowLocalConfig: true,
  workspaceRoot: process.cwd()
});

console.log("FlowAI OpenAI Vector Store RAG Smoke");
console.log("====================================");

if (!config.configured) {
  console.log("OpenAI provider is not configured. Add OPENAI_API_KEY to env or ignored .flowai.local.json to run this smoke.");
  process.exit(0);
}

const ingested = ingestSourceDocument({
  filename: "catalog-rag-smoke.md",
  mimeType: "text/markdown",
  content: [
    "# Noor Clinic Catalog",
    "Category: clinic",
    "",
    "## Services",
    "- Dental checkup: Routine dental examination and cleaning.",
    "- Teeth whitening: Cosmetic consultation.",
    "",
    "## FAQs",
    "Q: Do you offer emergency appointments?",
    "A: Emergency requests are collected for staff follow-up."
  ].join("\n")
});

if (!ingested.ok) {
  console.log("Source fixture rejected:");
  console.log(JSON.stringify({ error: ingested.error }, null, 2));
  process.exit(1);
}

const client = createOpenAiVectorStoreClient({
  apiKey: config.apiKey
});

let handle = null;

try {
  handle = await client.createKnowledgeBase({
    name: `FlowAI smoke ${Date.now()}`,
    sourceDocuments: [ingested.document]
  });

  const result = await searchWithRetry({
    client,
    vectorStoreId: handle.vectorStoreId,
    query: "What clinic services are listed?"
  });

  console.log("Vector store created and searched.");
  console.log(JSON.stringify({
    vectorStoreId: handle.vectorStoreId,
    fileId: handle.fileId,
    matches: result.matches.map((match) => ({
      text: match.text,
      score: match.score,
      sourceRefId: match.sourceRefId
    }))
  }, null, 2));

  if (result.matches.length === 0) {
    throw new Error("openai_rag_smoke_no_matches");
  }
} finally {
  if (handle) {
    await client.deleteKnowledgeBase(handle);
    console.log("Cleaned up OpenAI vector store and file.");
  }
}

async function searchWithRetry({ client, vectorStoreId, query }) {
  let last = { matches: [] };
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    last = await client.searchKnowledgeBase({ vectorStoreId, query });
    if (last.matches.length > 0) return last;
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return last;
}
