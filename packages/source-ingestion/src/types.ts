export type SupportedSourceDocumentMimeType = "text/plain" | "text/markdown";
export type SourceDocumentStatus = "extracted" | "rejected" | "failed";
export type SourceDocumentFormat = "plain_text" | "markdown";

export interface SourceDocumentInput {
  filename: string;
  mimeType: string;
  content: string;
}

export interface SourceDocumentLimits {
  maxInputBytes: number;
  maxExtractedTextBytes: number;
  maxFilenameLength: number;
}

export interface SourceDocumentWarning {
  code: string;
  message: string;
}

export interface SourceDocumentError {
  code: string;
  message: string;
  details?: Record<string, string | number | boolean>;
}

export type SourceLocator =
  | { kind: "document" }
  | { kind: "line_range"; startLine: number; endLine: number }
  | { kind: "heading"; heading: string; line: number };

export interface SourceRef {
  id: string;
  sourceDocumentId: string;
  locator: SourceLocator;
  label: string;
}

export interface SourceDocumentChunk {
  id: string;
  sourceDocumentId: string;
  sourceRefId: string;
  locator: Extract<SourceLocator, { kind: "line_range" }>;
  text: string;
  contentHash: string;
  extractionMethod: SourceDocumentFormat;
}

export interface SourceDocumentMetadata {
  lineCount: number;
  headingCount: number;
  detectedFormat: SourceDocumentFormat;
  encoding: "utf-8";
}

export interface SourceDocument {
  id: string;
  sourceType: "uploaded_document";
  filename: string;
  extension: string;
  mimeType: SupportedSourceDocumentMimeType | string;
  sizeBytes: number;
  contentHash: string;
  status: SourceDocumentStatus;
  text: string;
  metadata: SourceDocumentMetadata;
  sourceRefs: SourceRef[];
  chunks: SourceDocumentChunk[];
  warnings: SourceDocumentWarning[];
  errors: SourceDocumentError[];
}

export interface SourceDocumentAccepted {
  ok: true;
  document: SourceDocument;
}

export interface SourceDocumentRejection {
  ok: false;
  error: SourceDocumentError;
  document: SourceDocument;
}

export type SourceDocumentIngestionResult = SourceDocumentAccepted | SourceDocumentRejection;

export interface SourceDocumentIngestionOptions {
  limits?: Partial<SourceDocumentLimits>;
}
