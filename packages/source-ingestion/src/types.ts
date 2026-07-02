export type SupportedSourceDocumentMimeType = "text/plain" | "text/markdown";
export type SourceDocumentStatus = "extracted" | "rejected" | "failed";
export type SourceDocumentFormat = "plain_text" | "markdown";
export type ExtractedDocumentSourceKind = "ocr_result" | "parser_result" | "manual_fixture";
export type SourceDocumentExtractionMethod = SourceDocumentFormat | ExtractedDocumentSourceKind | "website_crawl";

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
  metadata?: Record<string, string | number | boolean>;
}

export interface SourceDocumentChunk {
  id: string;
  sourceDocumentId: string;
  sourceRefId: string;
  locator: Extract<SourceLocator, { kind: "line_range" }>;
  text: string;
  contentHash: string;
  extractionMethod: SourceDocumentExtractionMethod;
  metadata?: Record<string, string | number | boolean>;
}

export interface SourceDocumentMetadata {
  lineCount: number;
  headingCount: number;
  detectedFormat: SourceDocumentExtractionMethod;
  encoding: "utf-8";
  pageCount?: number;
  blockCount?: number;
  tableCount?: number;
  entityCount?: number;
  language?: string;
  sourceId?: string;
  sourceKind?: ExtractedDocumentSourceKind;
  minConfidence?: number;
  averageConfidence?: number;
}

export interface SourceDocument {
  id: string;
  sourceType: "uploaded_document" | "website";
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

export interface ExtractedDocumentBlock {
  blockId?: string;
  kind: "paragraph" | "heading" | "list" | "table" | "key_value" | "entity" | "unknown";
  text: string;
  confidence?: number;
}

export interface ExtractedDocumentTable {
  tableId?: string;
  rows: string[][];
  confidence?: number;
}

export interface ExtractedDocumentEntity {
  entityId?: string;
  entityClass: string;
  text: string;
  attributes?: Record<string, string | number | boolean>;
  confidence?: number;
}

export interface ExtractedDocumentPage {
  pageNumber: number;
  text: string;
  confidence?: number;
  blocks?: ExtractedDocumentBlock[];
  tables?: ExtractedDocumentTable[];
  entities?: ExtractedDocumentEntity[];
}

export interface ExtractedDocumentInput {
  sourceId: string;
  sourceKind: ExtractedDocumentSourceKind;
  filename: string;
  mimeType: string;
  language?: string;
  pages: ExtractedDocumentPage[];
}

export interface ExtractedDocumentIngestionOptions extends SourceDocumentIngestionOptions {
  minPageConfidence?: number;
  lowConfidenceThreshold?: number;
}
