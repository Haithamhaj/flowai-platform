# TASK-006A: Source Document Text Ingestion

Status: implemented
Owner/Agent: Codex
Context shards: `business-understanding.md`, `security.md`

## Goal

Implement the smallest safe source-document foundation:

```text
text / markdown input object
-> SourceDocument
-> normalized safe text and metadata
-> sourceRefs
-> later BusinessUnderstanding / BusinessGraph extraction
```

This task does not implement upload endpoints, PDF parsing, DOCX parsing, OCR, crawling, RAG, embeddings, AI extraction, persistence, auth, Studio UI, WhatsApp, live Telegram, or exporters.

## Implementation Boundary

Implemented package:

- `packages/source-ingestion`

The package is source-only and deterministic. It performs no network calls, provider calls, database writes, runtime sessions, Telegram adapter creation, workflow generation, or RAG indexing.

## Supported Inputs

- `.txt` with `text/plain`
- `.md` with `text/markdown`
- `.markdown` with `text/markdown`

## Rejected Inputs

- `.pdf`
- `.docx`
- `.html`
- `.js`
- `.json`
- unsupported MIME types
- extension/MIME mismatches
- path traversal filenames
- oversized input content
- oversized normalized extracted text
- binary control bytes
- empty normalized text

## Implemented Behavior

- `SourceDocument` model and exported types.
- `SourceRef` model and exported types.
- Deterministic text normalization.
- Filename normalization and path traversal rejection.
- MIME and extension validation.
- Configurable input and extracted-text limits.
- SHA-256 `contentHash`.
- Stable document id from content hash.
- Safe rejection reports with no raw content echo.
- Document-level sourceRef.
- Line-range sourceRef.
- Markdown heading sourceRefs.
- Single deterministic chunk with sourceRef locator.
- Secret-like and PII-like warning flags for accepted text without echoing secret values in warnings/errors.

## Test Coverage

Package tests cover:

- clinic services markdown;
- clinic FAQ text;
- policy/terms markdown;
- Arabic markdown;
- unsupported PDF;
- unsupported DOCX;
- unsupported HTML, JS, and JSON;
- path traversal filename rejection;
- MIME/extension mismatch;
- oversized input content;
- oversized normalized extracted text;
- secret-like content not echoed in rejection/errors;
- stable content hash and document id;
- sourceRefs with document id and locators;
- no external provider/channel/database keys required;
- no workflow/runtime/Telegram side effects in output.

## Verification Commands

Run:

```bash
CI=true pnpm --filter @flowai/source-ingestion test
CI=true pnpm --filter @flowai/source-ingestion typecheck
CI=true pnpm test
CI=true pnpm build
git diff --check
```

## Risks

- This package accepts text input objects only; real uploads remain unimplemented.
- PDF parsing remains unimplemented.
- Extracted text is evidence, not reviewed business fact.
- PII-like and secret-like warnings are basic deterministic flags, not a complete DLP system.
- Durable storage, tenant isolation, and retention controls remain future tasks.

## Handoff Notes

Do not wire this package into an API endpoint until upload, storage, auth, and operational controls are explicitly approved.

Recommended next task: TASK-006B_SOURCE_DOCUMENT_REVIEW_INTEGRATION.
