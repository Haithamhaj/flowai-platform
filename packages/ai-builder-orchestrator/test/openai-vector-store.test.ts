import { describe, expect, test } from "vitest";
import { createOpenAiVectorStoreClient, sourceDocumentsToKnowledgeFile } from "../src/index.js";
import type { SourceDocument } from "@flowai/source-ingestion";

const sourceDocument = {
  id: "src_doc_catalog",
  sourceType: "uploaded_document",
  filename: "catalog.md",
  extension: "md",
  mimeType: "text/markdown",
  sizeBytes: 120,
  contentHash: "sha256:catalog",
  status: "extracted",
  text: [
    "# Noor Clinic Catalog",
    "## Services",
    "- Dental checkup: Routine dental examination.",
    "- Teeth whitening: Cosmetic consultation."
  ].join("\n"),
  metadata: {
    lineCount: 4,
    headingCount: 2,
    detectedFormat: "markdown",
    encoding: "utf-8"
  },
  sourceRefs: [
    {
      id: "src_doc_catalog#document",
      sourceDocumentId: "src_doc_catalog",
      locator: { kind: "document" },
      label: "catalog.md"
    },
    {
      id: "src_doc_catalog#line_1_4",
      sourceDocumentId: "src_doc_catalog",
      locator: { kind: "line_range", startLine: 1, endLine: 4 },
      label: "catalog.md lines 1-4"
    }
  ],
  chunks: [
    {
      id: "src_doc_catalog#chunk_1",
      sourceDocumentId: "src_doc_catalog",
      sourceRefId: "src_doc_catalog#line_1_4",
      locator: { kind: "line_range", startLine: 1, endLine: 4 },
      text: "Dental checkup and teeth whitening services.",
      contentHash: "sha256:chunk",
      extractionMethod: "markdown"
    }
  ],
  warnings: [],
  errors: []
} satisfies SourceDocument;

describe("OpenAI vector store catalog RAG boundary", () => {
  test("serializes SourceDocument chunks into sourceRef-backed knowledge Markdown", () => {
    const file = sourceDocumentsToKnowledgeFile([sourceDocument]);

    expect(file.filename).toBe("flowai-knowledge.md");
    expect(file.contentType).toBe("text/markdown");
    expect(file.content).toContain("SOURCE_DOCUMENT: src_doc_catalog");
    expect(file.content).toContain("SOURCE_REF: src_doc_catalog#line_1_4");
    expect(file.content).toContain("Dental checkup and teeth whitening services.");
    expect(file.content).toContain("EXTRACTION_METHOD: markdown");
  });

  test("creates vector store, uploads knowledge file, attaches it, searches it, and cleans up", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init: init ?? {} });
      const requestUrl = String(url);
      const method = init?.method ?? "GET";

      if (requestUrl.endsWith("/v1/vector_stores") && method === "POST") {
        return jsonResponse({ id: "vs_123", name: "FlowAI catalog KB" });
      }

      if (requestUrl.endsWith("/v1/files") && method === "POST") {
        expect(init?.body).toBeInstanceOf(FormData);
        return jsonResponse({ id: "file_123", purpose: "assistants" });
      }

      if (requestUrl.endsWith("/v1/vector_stores/vs_123/files") && method === "POST") {
        return jsonResponse({ id: "vsf_123", status: "completed" });
      }

      if (requestUrl.endsWith("/v1/vector_stores/vs_123/search") && method === "POST") {
        return jsonResponse({
          data: [
            {
              file_id: "file_123",
              score: 0.91,
              content: [{ type: "text", text: "SOURCE_REF: src_doc_catalog#line_1_4\nDental checkup and teeth whitening services." }],
              attributes: {}
            }
          ]
        });
      }

      if (requestUrl.endsWith("/v1/vector_stores/vs_123") && method === "DELETE") {
        return jsonResponse({ id: "vs_123", deleted: true });
      }

      if (requestUrl.endsWith("/v1/files/file_123") && method === "DELETE") {
        return jsonResponse({ id: "file_123", deleted: true });
      }

      return jsonResponse({ error: { message: "unexpected" } }, 500);
    };
    const client = createOpenAiVectorStoreClient({
      apiKey: "sk-test-secret-value",
      fetchImpl
    });

    const vectorStore = await client.createKnowledgeBase({
      name: "FlowAI catalog KB",
      sourceDocuments: [sourceDocument]
    });
    const search = await client.searchKnowledgeBase({
      vectorStoreId: vectorStore.vectorStoreId,
      query: "What dental services are available?"
    });
    await client.deleteKnowledgeBase(vectorStore);

    expect(vectorStore).toEqual({
      vectorStoreId: "vs_123",
      fileId: "file_123",
      name: "FlowAI catalog KB"
    });
    expect(search.matches).toEqual([
      {
        text: "SOURCE_REF: src_doc_catalog#line_1_4\nDental checkup and teeth whitening services.",
        score: 0.91,
        sourceRefId: "src_doc_catalog#line_1_4",
        fileId: "file_123"
      }
    ]);
    expect(calls.map((call) => `${call.init.method} ${call.url}`)).toEqual([
      "POST https://api.openai.com/v1/vector_stores",
      "POST https://api.openai.com/v1/files",
      "POST https://api.openai.com/v1/vector_stores/vs_123/files",
      "POST https://api.openai.com/v1/vector_stores/vs_123/search",
      "DELETE https://api.openai.com/v1/vector_stores/vs_123",
      "DELETE https://api.openai.com/v1/files/file_123"
    ]);
    expect(JSON.stringify(calls)).not.toContain("sk-test-secret-value");
  });

  test("redacts provider error bodies before throwing", async () => {
    const fetchImpl = async (): Promise<Response> =>
      jsonResponse({ error: { message: "invalid key sk-test-secret-value" } }, 401);
    const client = createOpenAiVectorStoreClient({
      apiKey: "sk-test-secret-value",
      fetchImpl
    });

    await expect(client.createKnowledgeBase({
      name: "FlowAI catalog KB",
      sourceDocuments: [sourceDocument]
    })).rejects.toThrow("openai_vector_store_error:401");
    await expect(client.createKnowledgeBase({
      name: "FlowAI catalog KB",
      sourceDocuments: [sourceDocument]
    })).rejects.not.toThrow("sk-test-secret-value");
  });
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}
