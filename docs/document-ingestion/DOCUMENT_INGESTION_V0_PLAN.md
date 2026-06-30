# Document Ingestion V0 Plan

## Purpose

Plan a safe document source pipeline for FlowAI without implementing upload, parsing, storage, RAG, embeddings, AI extraction, or API endpoints.

Future document ingestion should transform:

```text
uploaded text / markdown first, PDF later
-> SourceDocument
-> extracted safe text and metadata
-> sourceRefs
-> later BusinessUnderstanding / BusinessGraph extraction
```

The output is source-backed evidence for later review. It is not Workflow JSON, not a chatbot answer, and not a RAG index.

## Scope

This plan defines:

- `SourceDocument` and related planning models.
- Accepted file type recommendation.
- Upload safety expectations.
- Parser boundary.
- Dependency evaluation policy.
- Source reference behavior.
- Later BusinessUnderstanding and BusinessGraph integration.
- Conflict and source-priority behavior.
- Future API plan only.
- Storage options and risks.
- Privacy and PII rules.
- Future test plan.

## Non-Goals

- No upload endpoint.
- No file storage implementation.
- No parser code.
- No PDF parser selection.
- No dependency additions.
- No RAG, embeddings, vector DB, or retrieval.
- No AI/provider extraction.
- No crawling.
- No persistence/database.
- No auth, tenants, or billing.
- No Studio UI.
- No workflow-dsl or runtime-core changes.
- No Telegram, WhatsApp, or exporters.

## SourceDocument Model

Future `SourceDocument`:

```json
{
  "sourceDocumentId": "doc_123",
  "sourceType": "document",
  "origin": "upload",
  "fileName": "services.md",
  "mediaType": "text/markdown",
  "extension": "md",
  "sizeBytes": 12400,
  "contentHash": "sha256:...",
  "receivedAt": "2026-06-30T00:00:00.000Z",
  "safetyStatus": "accepted",
  "parseStatus": "parsed",
  "language": "en",
  "title": "Service Guide",
  "metadata": {
    "pageCount": null,
    "encoding": "utf-8"
  },
  "sourceRefs": ["doc_123#chunk_1"],
  "riskFlags": [],
  "retentionPolicy": "review_workspace",
  "createdAt": "2026-06-30T00:00:00.000Z"
}
```

Future `SourceDocumentChunk`:

```json
{
  "chunkId": "doc_123#chunk_1",
  "sourceDocumentId": "doc_123",
  "locator": {
    "kind": "line_range",
    "start": 1,
    "end": 40
  },
  "text": "Visible extracted source text.",
  "contentHash": "sha256:...",
  "confidence": 0.95,
  "extractionMethod": "plain_text",
  "createdAt": "2026-06-30T00:00:00.000Z"
}
```

Future `DocumentIngestionReport`:

```json
{
  "sourceDocumentId": "doc_123",
  "accepted": true,
  "warnings": [],
  "rejections": [],
  "chunksCreated": 3,
  "piiFlags": [],
  "nextReviewAction": "review_extracted_text"
}
```

## Accepted File Type Recommendation

TASK-006A should accept only:

- `.txt` as `text/plain`.
- `.md` and `.markdown` as `text/markdown`.

Reasons:

- Text and markdown can be handled with minimal parser surface.
- They preserve reviewer-readable source text.
- They avoid PDF parser complexity, embedded files, scripts, forms, malformed object streams, and image/OCR ambiguity.

PDF should be a separate review/spike after parser/security evaluation. DOCX, spreadsheets, images, email archives, ZIP files, HTML, and rich office formats should remain out of scope until individually approved.

## SourceRefs

Every extracted fact created later from a document must preserve source references that answer:

- Which uploaded document supplied the fact?
- Which chunk or locator contains the evidence?
- When was the document received?
- What file type and parser path produced the text?
- What confidence and safety status apply?

SourceRefs should use stable locators such as:

```text
doc_123#chunk_4
doc_123#line_10_25
doc_123#page_2_later
```

For TASK-006A, line ranges are enough. Page references wait for PDF planning.

## Later BusinessUnderstanding Integration

Document ingestion should feed later extraction, not skip review boundaries.

Allowed future flow:

```text
SourceDocument + chunks
-> candidate BusinessUnderstanding / BusinessGraph facts
-> missing questions, assumptions, conflicts
-> WorkflowGenerator only after reviewable facts exist
```

Disallowed in TASK-006:

- Direct document to Workflow JSON.
- Direct document to runtime session.
- Direct document to Telegram preview.
- Direct document to RAG answer.
- Direct document to AI/provider extraction.

## Conflict And Source Priority

Uploaded documents should follow the existing source priority model:

1. Human-approved manual review.
2. Future integration/API with freshness metadata.
3. Structured website data confirmed by visible content.
4. Visible official website content.
5. Uploaded documents after upload safety and extraction review.
6. Manual interview statements.
7. Generated candidates requiring approval.

Document-derived facts should not silently overwrite existing facts. If a document conflicts with interview, website, or future integration data, the system should create a conflict record and block affected high-risk capabilities until reviewed.

High-risk conflicts include:

- price, availability, listing, or menu differences;
- policy differences;
- medical, legal, safety, or compliance statements;
- business identity or location differences;
- handoff or customer-data collection requirements.

## Future API Plan Only

A later API may expose document ingestion, but not in this planning task.

Possible future endpoints:

```text
POST /source-documents
GET /source-documents/:sourceDocumentId
GET /source-documents/:sourceDocumentId/chunks
GET /source-documents/:sourceDocumentId/report
```

The future API should:

- reject unsupported file types before parsing;
- return safe structured errors;
- avoid logging raw document text by default;
- return sourceRefs and ingestion reports;
- not create workflows, runtime sessions, Telegram adapters, RAG indexes, or BusinessGraph facts as side effects unless a later task explicitly approves each boundary.

## Storage Options And Risks

Planning options:

- In-memory only for tests: lowest setup, not durable, not production-safe.
- Local filesystem quarantine: useful for local development, requires path traversal controls and cleanup.
- Object storage later: durable, needs auth, retention, encryption, malware scanning, and tenant isolation.
- Database metadata later: useful for review state, requires migration and tenant/security design.

Recommendation:

- TASK-006A should avoid durable storage and prove model plus text/markdown normalization with fixtures.
- Durable storage should wait for explicit persistence/auth planning.

## Future Test Plan

Future implementation tests should cover:

- accepts `.txt` and `.md` fixtures;
- rejects unsupported extensions and media types;
- rejects empty files and oversized files;
- normalizes line endings and UTF-8 text;
- creates stable `SourceDocument` and chunk IDs;
- preserves content hashes and sourceRefs;
- detects obvious secret-like strings and PII flags without storing them in logs;
- does not create workflows, runtime sessions, Telegram adapters, RAG indexes, or provider calls;
- produces safe rejection reports.

## Next Recommended Task

TASK-006A_SOURCE_DOCUMENT_TEXT_INGESTION.
