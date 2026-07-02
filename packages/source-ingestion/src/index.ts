import { createHash } from "node:crypto";
import type {
  ExtractedDocumentIngestionOptions,
  ExtractedDocumentInput,
  ExtractedDocumentPage,
  ExtractedDocumentTable,
  SourceDocument,
  SourceDocumentChunk,
  SourceDocumentError,
  SourceDocumentExtractionMethod,
  SourceDocumentIngestionOptions,
  SourceDocumentIngestionResult,
  SourceDocumentInput,
  SourceDocumentLimits,
  SourceDocumentMetadata,
  SourceDocumentWarning,
  SourceRef,
  SupportedSourceDocumentMimeType
} from "./types.js";

export type {
  ExtractedDocumentBlock,
  ExtractedDocumentEntity,
  ExtractedDocumentIngestionOptions,
  ExtractedDocumentInput,
  ExtractedDocumentPage,
  ExtractedDocumentSourceKind,
  ExtractedDocumentTable,
  SourceDocument,
  SourceDocumentAccepted,
  SourceDocumentChunk,
  SourceDocumentError,
  SourceDocumentExtractionMethod,
  SourceDocumentFormat,
  SourceDocumentIngestionOptions,
  SourceDocumentIngestionResult,
  SourceDocumentInput,
  SourceDocumentLimits,
  SourceDocumentMetadata,
  SourceDocumentRejection,
  SourceDocumentStatus,
  SourceDocumentWarning,
  SourceLocator,
  SourceRef,
  SupportedSourceDocumentMimeType
} from "./types.js";

export const DEFAULT_SOURCE_DOCUMENT_LIMITS: SourceDocumentLimits = {
  maxInputBytes: 256 * 1024,
  maxExtractedTextBytes: 256 * 1024,
  maxFilenameLength: 160
};

const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.7;

const supportedMimeByExtension: Record<string, SupportedSourceDocumentMimeType> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown"
};

const rejectedExtensionMessages: Record<string, string> = {
  pdf: "PDF parsing is not implemented in TASK-006A.",
  docx: "DOCX parsing is not implemented in TASK-006A.",
  html: "HTML ingestion is not implemented in TASK-006A.",
  htm: "HTML ingestion is not implemented in TASK-006A.",
  js: "Script-like formats are not accepted.",
  json: "JSON ingestion is not accepted in TASK-006A."
};

const secretLikePatterns = [
  /\b(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?[^"'\s,;]+/i,
  /\bbearer\s+[a-z0-9._~+/=-]+/i,
  /\bsk-[a-z0-9][a-z0-9_-]{8,}\b/i
];

const piiLikePatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(?:\+?\d[\d\s().-]{7,}\d)/
];

export function ingestSourceDocument(
  input: SourceDocumentInput,
  options: SourceDocumentIngestionOptions = {}
): SourceDocumentIngestionResult {
  const limits = { ...DEFAULT_SOURCE_DOCUMENT_LIMITS, ...(options.limits ?? {}) };
  const filenameResult = normalizeFilename(input.filename, limits);

  if (!filenameResult.ok) {
    return rejectDocument({
      filename: safeFallbackFilename(input.filename),
      extension: "",
      mimeType: safeMime(input.mimeType),
      error: filenameResult.error
    });
  }

  const filename = filenameResult.filename;
  const extension = readExtension(filename);
  const mimeType = safeMime(input.mimeType);
  const inputSizeBytes = byteLength(input.content);

  if (inputSizeBytes > limits.maxInputBytes) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      error: {
        code: "CONTENT_TOO_LARGE",
        message: "Document content exceeds the configured input size limit.",
        details: { maxInputBytes: limits.maxInputBytes, sizeBytes: inputSizeBytes }
      }
    });
  }

  const expectedMime = supportedMimeByExtension[extension];

  if (!expectedMime) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      error: {
        code: "UNSUPPORTED_FILE_TYPE",
        message: rejectedExtensionMessages[extension] ?? "Only text and markdown documents are supported in TASK-006A.",
        details: { extension: extension || "none", mimeType }
      }
    });
  }

  if (mimeType !== expectedMime) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      error: {
        code: "MIME_EXTENSION_MISMATCH",
        message: "Document extension and MIME type do not match the accepted TASK-006A file types.",
        details: { extension, mimeType, expectedMimeType: expectedMime }
      }
    });
  }

  if (hasBinaryControlBytes(input.content)) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      error: {
        code: "BINARY_CONTENT_REJECTED",
        message: "Document content must be UTF-8 text without binary control bytes."
      }
    });
  }

  const text = normalizeText(input.content);

  if (text.length === 0) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      error: {
        code: "EMPTY_DOCUMENT",
        message: "Document content is empty after normalization."
      }
    });
  }

  const extractedTextBytes = byteLength(text);

  if (extractedTextBytes > limits.maxExtractedTextBytes) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      error: {
        code: "EXTRACTED_TEXT_TOO_LARGE",
        message: "Normalized document text exceeds the configured extraction size limit.",
        details: { maxExtractedTextBytes: limits.maxExtractedTextBytes, extractedTextBytes }
      }
    });
  }

  const detectedFormat = expectedMime === "text/markdown" ? "markdown" : "plain_text";
  const contentHash = hashText(text);
  const id = createDocumentId(contentHash);
  const lines = text.split("\n");
  const headingRefs = detectedFormat === "markdown" ? createHeadingRefs({ id, lines }) : [];
  const lineLocator = { kind: "line_range" as const, startLine: 1, endLine: lines.length };
  const documentRef: SourceRef = {
    id: `${id}#document`,
    sourceDocumentId: id,
    locator: { kind: "document" },
    label: filename
  };
  const lineRef: SourceRef = {
    id: `${id}#line_1_${lines.length}`,
    sourceDocumentId: id,
    locator: lineLocator,
    label: `${filename} lines 1-${lines.length}`
  };
  const warnings = detectWarnings(text);
  const metadata: SourceDocumentMetadata = {
    lineCount: lines.length,
    headingCount: headingRefs.length,
    detectedFormat,
    encoding: "utf-8"
  };
  const chunk: SourceDocumentChunk = {
    id: `${id}#chunk_1`,
    sourceDocumentId: id,
    sourceRefId: lineRef.id,
    locator: lineLocator,
    text,
    contentHash,
    extractionMethod: detectedFormat
  };

  return {
    ok: true,
    document: {
      id,
      sourceType: "uploaded_document",
      filename,
      extension,
      mimeType: expectedMime,
      sizeBytes: inputSizeBytes,
      contentHash,
      status: "extracted",
      text,
      metadata,
      sourceRefs: [documentRef, lineRef, ...headingRefs],
      chunks: [chunk],
      warnings,
      errors: []
    }
  };
}

export function ingestExtractedDocument(
  input: ExtractedDocumentInput,
  options: ExtractedDocumentIngestionOptions = {}
): SourceDocumentIngestionResult {
  const limits = { ...DEFAULT_SOURCE_DOCUMENT_LIMITS, ...(options.limits ?? {}) };
  const filenameResult = normalizeFilename(input.filename, limits);

  if (!filenameResult.ok) {
    return rejectDocument({
      filename: safeFallbackFilename(input.filename),
      extension: "",
      mimeType: safeMime(input.mimeType),
      error: filenameResult.error
    });
  }

  const filename = filenameResult.filename;
  const extension = readExtension(filename);
  const mimeType = safeMime(input.mimeType);
  const minPageConfidence = options.minPageConfidence ?? 0;
  const lowConfidenceThreshold = options.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD;
  const pages = Array.isArray(input.pages) ? input.pages : [];
  const acceptedPages = pages
    .filter((page) => Number.isFinite(page.pageNumber) && page.pageNumber > 0)
    .filter((page) => (page.confidence ?? 1) >= minPageConfidence)
    .map(normalizeExtractedPage)
    .filter((page) => page.text.length > 0);
  const text = acceptedPages.map((page) => page.text).join("\n\n");
  const inputSizeBytes = byteLength(text);

  if (text.length === 0) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: 0,
      error: {
        code: "EMPTY_EXTRACTED_DOCUMENT",
        message: "Extracted document contains no reviewable text after applying confidence and normalization rules."
      }
    });
  }

  if (inputSizeBytes > limits.maxExtractedTextBytes) {
    return rejectDocument({
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      error: {
        code: "EXTRACTED_TEXT_TOO_LARGE",
        message: "Extracted document text exceeds the configured extraction size limit.",
        details: { maxExtractedTextBytes: limits.maxExtractedTextBytes, extractedTextBytes: inputSizeBytes }
      }
    });
  }

  const contentHash = hashText(text);
  const id = createDocumentId(`${input.sourceId}:${contentHash}`);
  const lines = text.split("\n");
  const documentRef: SourceRef = {
    id: `${id}#document`,
    sourceDocumentId: id,
    locator: { kind: "document" },
    label: filename,
    metadata: {
      sourceId: safeMetadataValue(input.sourceId),
      sourceKind: input.sourceKind
    }
  };
  const confidenceValues = acceptedPages.flatMap((page) => (page.confidence === undefined ? [] : [page.confidence]));
  const minConfidence = confidenceValues.length > 0 ? Math.min(...confidenceValues) : undefined;
  const averageConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : undefined;
  const pageLineRanges = buildPageLineRanges(acceptedPages);
  const pageRefs = pageLineRanges.map(({ page, startLine, endLine }) => ({
    id: `${id}#page_${page.pageNumber}`,
    sourceDocumentId: id,
    locator: { kind: "line_range" as const, startLine, endLine },
    label: `${filename} page ${page.pageNumber}`,
    metadata: {
      pageNumber: page.pageNumber,
      confidence: page.confidence ?? 1
    }
  }));
  const detailRefs = acceptedPages.flatMap((page) => createExtractedDetailRefs({ id, filename, page, pageLineRanges }));
  const chunks: SourceDocumentChunk[] = pageLineRanges.map(({ page, startLine, endLine }, index) => {
    const sourceRef = pageRefs[index];
    const contentHash = hashText(page.text);
    return {
      id: `${id}#chunk_page_${page.pageNumber}`,
      sourceDocumentId: id,
      sourceRefId: sourceRef?.id ?? `${id}#document`,
      locator: { kind: "line_range", startLine, endLine },
      text: page.text,
      contentHash,
      extractionMethod: input.sourceKind,
      metadata: {
        pageNumber: page.pageNumber,
        confidence: page.confidence ?? 1
      }
    };
  });
  const confidenceWarnings: SourceDocumentWarning[] = minConfidence !== undefined && minConfidence < lowConfidenceThreshold
    ? [
        {
          code: "LOW_EXTRACTION_CONFIDENCE",
          message: "One or more extracted pages are below the configured confidence threshold. Review source evidence before using facts."
        }
      ]
    : [];

  return {
    ok: true,
    document: {
      id,
      sourceType: "uploaded_document",
      filename,
      extension,
      mimeType,
      sizeBytes: inputSizeBytes,
      contentHash,
      status: "extracted",
      text,
      metadata: {
        lineCount: lines.length,
        headingCount: countMarkdownHeadings(lines),
        detectedFormat: input.sourceKind,
        encoding: "utf-8",
        pageCount: acceptedPages.length,
        blockCount: acceptedPages.reduce((count, page) => count + (page.blocks?.length ?? 0), 0),
        tableCount: acceptedPages.reduce((count, page) => count + (page.tables?.length ?? 0), 0),
        entityCount: acceptedPages.reduce((count, page) => count + (page.entities?.length ?? 0), 0),
        language: input.language,
        sourceId: input.sourceId,
        sourceKind: input.sourceKind,
        minConfidence,
        averageConfidence
      },
      sourceRefs: [documentRef, ...pageRefs, ...detailRefs],
      chunks,
      warnings: [...detectWarnings(text), ...confidenceWarnings],
      errors: []
    }
  };
}

function normalizeFilename(filename: string, limits: SourceDocumentLimits): { ok: true; filename: string } | { ok: false; error: SourceDocumentError } {
  if (typeof filename !== "string") {
    return {
      ok: false,
      error: { code: "INVALID_FILENAME", message: "Document filename must be a string." }
    };
  }

  const normalized = filename.replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    return {
      ok: false,
      error: { code: "INVALID_FILENAME", message: "Document filename is required." }
    };
  }

  if (normalized.length > limits.maxFilenameLength) {
    return {
      ok: false,
      error: {
        code: "INVALID_FILENAME",
        message: "Document filename exceeds the configured length limit.",
        details: { maxFilenameLength: limits.maxFilenameLength }
      }
    };
  }

  if (normalized.includes("/") || normalized.includes("\\") || normalized.split(".").includes("..") || normalized.includes("..")) {
    return {
      ok: false,
      error: { code: "INVALID_FILENAME", message: "Document filename must be a label, not a path." }
    };
  }

  return { ok: true, filename: normalized };
}

function safeFallbackFilename(filename: string): string {
  const stripped = typeof filename === "string" ? filename.replace(/[/\\\u0000-\u001f\u007f]/g, "_").trim() : "";
  return stripped ? stripped.slice(0, DEFAULT_SOURCE_DOCUMENT_LIMITS.maxFilenameLength) : "rejected-document";
}

function safeMime(mimeType: string): string {
  return typeof mimeType === "string" ? mimeType.trim().toLowerCase().split(";")[0] ?? "" : "";
}

function readExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
}

function normalizeText(content: string): string {
  return content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n+$/g, "");
}

function normalizeExtractedPage(page: ExtractedDocumentPage): ExtractedDocumentPage {
  const pageTextParts = [page.text, ...(page.tables ?? []).map(tableToMarkdown)]
    .map((value) => normalizeText(value).trim())
    .filter(Boolean);
  return {
    ...page,
    text: pageTextParts.join("\n").trim()
  };
}

function tableToMarkdown(table: ExtractedDocumentTable): string {
  if (!Array.isArray(table.rows) || table.rows.length === 0) return "";
  const rows = table.rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
  const width = Math.max(...rows.map((row) => row.length), 1);
  const normalizedRows = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""));
  const header = normalizedRows[0] ?? [];
  const body = normalizedRows.slice(1);
  const separator = Array.from({ length: width }, () => "---");
  return [header, separator, ...body].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function countMarkdownHeadings(lines: string[]): number {
  return lines.filter((line) => /^(#{1,6})\s+.+?\s*$/.test(line)).length;
}

function buildPageLineRanges(pages: ExtractedDocumentPage[]): Array<{ page: ExtractedDocumentPage; startLine: number; endLine: number }> {
  let nextLine = 1;
  return pages.map((page, index) => {
    const lineCount = Math.max(page.text.split("\n").length, 1);
    const startLine = nextLine;
    const endLine = startLine + lineCount - 1;
    nextLine = endLine + (index === pages.length - 1 ? 1 : 2);
    return { page, startLine, endLine };
  });
}

function createExtractedDetailRefs({
  id,
  filename,
  page,
  pageLineRanges
}: {
  id: string;
  filename: string;
  page: ExtractedDocumentPage;
  pageLineRanges: Array<{ page: ExtractedDocumentPage; startLine: number; endLine: number }>;
}): SourceRef[] {
  const range = pageLineRanges.find((candidate) => candidate.page === page);
  const locator = { kind: "line_range" as const, startLine: range?.startLine ?? 1, endLine: range?.endLine ?? 1 };
  const blockRefs = (page.blocks ?? []).map((block, index) => ({
    id: `${id}#page_${page.pageNumber}_block_${normalizeRefSegment(block.blockId ?? String(index + 1))}`,
    sourceDocumentId: id,
    locator,
    label: `${filename} page ${page.pageNumber} block ${block.blockId ?? index + 1}`,
    metadata: {
      pageNumber: page.pageNumber,
      blockId: block.blockId ?? String(index + 1),
      blockKind: block.kind,
      confidence: block.confidence ?? page.confidence ?? 1
    }
  }));
  const tableRefs = (page.tables ?? []).map((table, index) => ({
    id: `${id}#page_${page.pageNumber}_table_${normalizeRefSegment(table.tableId ?? String(index + 1))}`,
    sourceDocumentId: id,
    locator,
    label: `${filename} page ${page.pageNumber} table ${table.tableId ?? index + 1}`,
    metadata: {
      pageNumber: page.pageNumber,
      tableId: table.tableId ?? String(index + 1),
      confidence: table.confidence ?? page.confidence ?? 1
    }
  }));
  const entityRefs = (page.entities ?? []).map((entity, index) => ({
    id: `${id}#page_${page.pageNumber}_entity_${normalizeRefSegment(entity.entityId ?? String(index + 1))}`,
    sourceDocumentId: id,
    locator,
    label: `${filename} page ${page.pageNumber} entity ${entity.entityId ?? index + 1}`,
    metadata: {
      pageNumber: page.pageNumber,
      entityId: entity.entityId ?? String(index + 1),
      entityClass: entity.entityClass,
      confidence: entity.confidence ?? page.confidence ?? 1
    }
  }));
  return [...blockRefs, ...tableRefs, ...entityRefs];
}

function normalizeRefSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "item";
}

function safeMetadataValue(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160);
}

function hasBinaryControlBytes(content: string): boolean {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content);
}

function createHeadingRefs({ id, lines }: { id: string; lines: string[] }): SourceRef[] {
  return lines.flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) return [];

    return [
      {
        id: `${id}#heading_${index + 1}`,
        sourceDocumentId: id,
        locator: { kind: "heading" as const, heading: match[2] ?? "", line: index + 1 },
        label: match[2] ?? ""
      }
    ];
  });
}

function detectWarnings(text: string): SourceDocumentWarning[] {
  const warnings: SourceDocumentWarning[] = [];

  if (secretLikePatterns.some((pattern) => pattern.test(text))) {
    warnings.push({
      code: "SECRET_LIKE_CONTENT",
      message: "Document contains secret-like content. Review before using extracted facts."
    });
  }

  if (piiLikePatterns.some((pattern) => pattern.test(text))) {
    warnings.push({
      code: "PII_LIKE_CONTENT",
      message: "Document contains personal-data-like content. Review before using extracted facts."
    });
  }

  return warnings;
}

function rejectDocument({
  filename,
  extension,
  mimeType,
  sizeBytes = 0,
  error
}: {
  filename: string;
  extension: string;
  mimeType: string;
  sizeBytes?: number;
  error: SourceDocumentError;
}): SourceDocumentIngestionResult {
  const safeFilename = safeFallbackFilename(filename);
  const contentHash = hashText("");
  const id = createDocumentId(`${safeFilename}:${mimeType}:${error.code}`);

  return {
    ok: false,
    error,
    document: {
      id,
      sourceType: "uploaded_document",
      filename: safeFilename,
      extension,
      mimeType,
      sizeBytes,
      contentHash,
      status: "rejected",
      text: "",
      metadata: {
        lineCount: 0,
        headingCount: 0,
        detectedFormat: "plain_text",
        encoding: "utf-8"
      },
      sourceRefs: [],
      chunks: [],
      warnings: [],
      errors: [error]
    }
  };
}

function createDocumentId(seed: string): string {
  const rawHash = seed.startsWith("sha256:") ? seed.slice("sha256:".length) : createHash("sha256").update(seed).digest("hex");
  return `src_doc_${rawHash.slice(0, 16)}`;
}

function hashText(text: string): string {
  return `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}
