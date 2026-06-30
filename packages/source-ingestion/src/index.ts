import { createHash } from "node:crypto";
import type {
  SourceDocument,
  SourceDocumentChunk,
  SourceDocumentError,
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
  SourceDocument,
  SourceDocumentAccepted,
  SourceDocumentChunk,
  SourceDocumentError,
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
