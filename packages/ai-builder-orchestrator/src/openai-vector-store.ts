import type { SourceDocument } from "@flowai/source-ingestion";

const OPENAI_API_BASE = "https://api.openai.com/v1";

export interface OpenAiVectorStoreClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export interface FlowAiKnowledgeFile {
  filename: string;
  contentType: "text/markdown";
  content: string;
}

export interface FlowAiKnowledgeBaseCreateRequest {
  name: string;
  sourceDocuments: SourceDocument[];
}

export interface FlowAiKnowledgeBaseHandle {
  vectorStoreId: string;
  fileId: string;
  name: string;
}

export interface FlowAiKnowledgeBaseSearchRequest {
  vectorStoreId: string;
  query: string;
}

export interface FlowAiKnowledgeBaseSearchMatch {
  text: string;
  score: number;
  sourceRefId: string | null;
  fileId: string | null;
}

export interface FlowAiKnowledgeBaseSearchResult {
  matches: FlowAiKnowledgeBaseSearchMatch[];
}

export interface OpenAiVectorStoreClient {
  createKnowledgeBase(request: FlowAiKnowledgeBaseCreateRequest): Promise<FlowAiKnowledgeBaseHandle>;
  searchKnowledgeBase(request: FlowAiKnowledgeBaseSearchRequest): Promise<FlowAiKnowledgeBaseSearchResult>;
  deleteKnowledgeBase(handle: FlowAiKnowledgeBaseHandle): Promise<void>;
}

export function sourceDocumentsToKnowledgeFile(sourceDocuments: SourceDocument[]): FlowAiKnowledgeFile {
  const sections = sourceDocuments.flatMap((document) =>
    document.chunks.map((chunk, index) => [
      `## Chunk ${index + 1}: ${document.filename}`,
      `SOURCE_DOCUMENT: ${document.id}`,
      `SOURCE_REF: ${chunk.sourceRefId}`,
      `FILENAME: ${document.filename}`,
      `CONTENT_HASH: ${chunk.contentHash}`,
      `EXTRACTION_METHOD: ${chunk.extractionMethod}`,
      chunk.metadata?.pageNumber ? `PAGE: ${chunk.metadata.pageNumber}` : null,
      chunk.metadata?.confidence ? `CONFIDENCE: ${chunk.metadata.confidence}` : null,
      "",
      chunk.text.trim()
    ].filter((line): line is string => typeof line === "string").join("\n"))
  );

  return {
    filename: "flowai-knowledge.md",
    contentType: "text/markdown",
    content: `# FlowAI Knowledge Base\n\n${sections.join("\n\n---\n\n")}\n`
  };
}

export function createOpenAiVectorStoreClient(options: OpenAiVectorStoreClientOptions): OpenAiVectorStoreClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async createKnowledgeBase(request: FlowAiKnowledgeBaseCreateRequest): Promise<FlowAiKnowledgeBaseHandle> {
      const vectorStore = await createVectorStore({ apiKey: options.apiKey, fetchImpl, name: request.name });
      const file = await uploadKnowledgeFile({
        apiKey: options.apiKey,
        fetchImpl,
        knowledgeFile: sourceDocumentsToKnowledgeFile(request.sourceDocuments)
      });
      await attachFileToVectorStore({
        apiKey: options.apiKey,
        fetchImpl,
        vectorStoreId: vectorStore.id,
        fileId: file.id
      });

      return {
        vectorStoreId: vectorStore.id,
        fileId: file.id,
        name: request.name
      };
    },

    async searchKnowledgeBase(request: FlowAiKnowledgeBaseSearchRequest): Promise<FlowAiKnowledgeBaseSearchResult> {
      const response = await openAiJsonRequest({
        apiKey: options.apiKey,
        fetchImpl,
        path: `/vector_stores/${encodeURIComponent(request.vectorStoreId)}/search`,
        init: {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: request.query })
        }
      });

      return { matches: parseSearchMatches(response) };
    },

    async deleteKnowledgeBase(handle: FlowAiKnowledgeBaseHandle): Promise<void> {
      await openAiJsonRequest({
        apiKey: options.apiKey,
        fetchImpl,
        path: `/vector_stores/${encodeURIComponent(handle.vectorStoreId)}`,
        init: { method: "DELETE" }
      });
      await openAiJsonRequest({
        apiKey: options.apiKey,
        fetchImpl,
        path: `/files/${encodeURIComponent(handle.fileId)}`,
        init: { method: "DELETE" }
      });
    }
  };
}

async function createVectorStore({
  apiKey,
  fetchImpl,
  name
}: {
  apiKey: string;
  fetchImpl: typeof fetch;
  name: string;
}): Promise<{ id: string }> {
  const response = await openAiJsonRequest({
    apiKey,
    fetchImpl,
    path: "/vector_stores",
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    }
  });
  return { id: readRequiredString(response, "id", "openai_vector_store_missing_id") };
}

async function uploadKnowledgeFile({
  apiKey,
  fetchImpl,
  knowledgeFile
}: {
  apiKey: string;
  fetchImpl: typeof fetch;
  knowledgeFile: FlowAiKnowledgeFile;
}): Promise<{ id: string }> {
  const form = new FormData();
  form.set("purpose", "assistants");
  form.set("file", new Blob([knowledgeFile.content], { type: knowledgeFile.contentType }), knowledgeFile.filename);

  const response = await openAiJsonRequest({
    apiKey,
    fetchImpl,
    path: "/files",
    init: {
      method: "POST",
      body: form
    }
  });
  return { id: readRequiredString(response, "id", "openai_file_missing_id") };
}

async function attachFileToVectorStore({
  apiKey,
  fetchImpl,
  vectorStoreId,
  fileId
}: {
  apiKey: string;
  fetchImpl: typeof fetch;
  vectorStoreId: string;
  fileId: string;
}): Promise<void> {
  await openAiJsonRequest({
    apiKey,
    fetchImpl,
    path: `/vector_stores/${encodeURIComponent(vectorStoreId)}/files`,
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file_id: fileId })
    }
  });
}

async function openAiJsonRequest({
  apiKey,
  fetchImpl,
  path,
  init
}: {
  apiKey: string;
  fetchImpl: typeof fetch;
  path: string;
  init: RequestInit;
}): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${apiKey}`);
  const response = await fetchImpl(`${OPENAI_API_BASE}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`openai_vector_store_error:${response.status}:${await safeErrorBody(response)}`);
  }

  return response.json();
}

function parseSearchMatches(response: unknown): FlowAiKnowledgeBaseSearchMatch[] {
  if (!response || typeof response !== "object") return [];
  const data = (response as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      text: readSearchText(record.content),
      score: typeof record.score === "number" ? record.score : 0,
      sourceRefId: readAttributesString(record.attributes, "sourceRefId") ?? extractSourceRefId(readSearchText(record.content)),
      fileId: typeof record.file_id === "string" ? record.file_id : null
    };
  });
}

function readSearchText(content: unknown): string {
  if (!Array.isArray(content)) return "";
  const texts = content.flatMap((part) => {
    if (!part || typeof part !== "object") return [];
    const text = (part as Record<string, unknown>).text;
    return typeof text === "string" ? [text] : [];
  });
  return texts.join("\n");
}

function readAttributesString(attributes: unknown, key: string): string | null {
  if (!attributes || typeof attributes !== "object") return null;
  const value = (attributes as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

function readRequiredString(response: unknown, key: string, errorCode: string): string {
  if (!response || typeof response !== "object") throw new Error(errorCode);
  const value = (response as Record<string, unknown>)[key];
  if (typeof value !== "string" || !value) throw new Error(errorCode);
  return value;
}

function extractSourceRefId(text: string): string | null {
  const match = /^SOURCE_REF:\s*(\S+)/m.exec(text);
  return match?.[1] ?? null;
}

async function safeErrorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 500);
  } catch {
    return "missing_error_body";
  }
}
