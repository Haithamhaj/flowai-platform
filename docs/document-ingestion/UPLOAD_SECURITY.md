# Upload Security

## Purpose

Define security expectations for future document ingestion. This is planning only and does not add upload endpoints, storage, parser code, malware scanning, or dependencies.

## Security Goals

- Reject unsafe or unsupported inputs before parsing.
- Keep raw files and extracted text away from logs, workflow JSON, runtime traces, and channel messages.
- Preserve source evidence without exposing secrets or unnecessary personal data.
- Keep upload handling separate from BusinessUnderstanding, WorkflowGenerator, Runtime Core, and channel adapters.

## Recommended TASK-006A Upload Scope

TASK-006A should avoid real multipart upload. It should use local fixtures or explicit text/markdown input objects to prove the `SourceDocument` model and normalization boundary.

Real upload endpoints should wait for a separate approved task with auth, limits, storage, and operational controls.

TASK-006A implementation follows this boundary. It accepts text/markdown input objects in `packages/source-ingestion`; it does not create an upload endpoint or store files.

## File Type Controls

First accepted implementation:

- `.txt` with `text/plain`.
- `.md` or `.markdown` with `text/markdown`.

Reject:

- PDF until parser/security spike is approved.
- DOCX, XLSX, PPTX, images, HTML, XML, ZIP, archives, executables, scripts, email archives, and unknown binary files.
- Files with mismatched extension and media type.
- Files with multiple extensions such as `policy.pdf.exe`.

## Size And Shape Limits

Future implementation should define:

- maximum file size;
- maximum normalized text length;
- maximum line count;
- maximum chunk count;
- maximum filename length;
- accepted character encodings.

Recommended initial limits for TASK-006A planning:

- file size: small fixture-sized text only;
- encoding: UTF-8;
- binary bytes: reject;
- empty text after normalization: reject.

## Filename And Metadata Rules

Filenames are labels, not paths.

Future upload handling must:

- strip directory separators;
- reject path traversal patterns;
- normalize control characters;
- avoid using original filename as a storage path;
- preserve original filename only as display metadata after sanitization.

Metadata must not include secrets, cookies, bearer tokens, API keys, private URLs, or raw credentials.

## Quarantine And Parsing

Future real uploads should use a quarantine-first flow:

```text
receive bytes
-> enforce size/type limits
-> content hash
-> quarantine location
-> parser sandbox
-> normalized text/chunks
-> safe source metadata
-> review
```

Parsing should never happen in channel adapters, runtime-core, workflow-dsl, or workflow-generator.

## Privacy And PII

Document ingestion may contain customer names, phone numbers, emails, addresses, medical details, legal terms, or internal business data.

Rules:

- Do not place raw document text in workflow JSON.
- Do not place raw document text in runtime traces.
- Do not place raw document text in Telegram preview messages unless a later reviewed answer-generation task explicitly permits cited excerpts.
- Do not log raw extracted text by default.
- Flag likely PII and secret-like content in ingestion reports.
- Keep sourceRefs as locators, not full sensitive excerpts.
- Require review before using sensitive facts in generated workflows.

## Rejection Report

Future rejected uploads should return safe structured reasons:

```json
{
  "accepted": false,
  "code": "UNSUPPORTED_FILE_TYPE",
  "message": "Only text and markdown are supported in this task.",
  "details": {
    "extension": "pdf",
    "mediaType": "application/pdf"
  }
}
```

The report should not include raw file bytes or large text excerpts.

## Operational Risks

- Parser vulnerabilities.
- Zip bombs or decompression bombs.
- Path traversal.
- Malicious metadata.
- PII leakage.
- Accidental workflow generation from unreviewed text.
- Treating stale or conflicting document facts as authoritative.

## Required Future Approval Gates

Stop for approval before adding:

- real upload endpoints;
- durable storage;
- parser dependencies;
- PDF support;
- malware scanning integrations;
- OCR;
- AI extraction;
- RAG/vector DB;
- auth or tenant isolation;
- production retention policies.
