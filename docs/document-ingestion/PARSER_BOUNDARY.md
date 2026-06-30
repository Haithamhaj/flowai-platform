# Parser Boundary

## Purpose

Define where document parsing belongs and how parser dependencies should be evaluated later. This is planning only and does not choose or add a parser.

## Boundary Rule

Parsing belongs behind a document-ingestion boundary that emits safe normalized text, metadata, chunks, and sourceRefs.

Parsing must not live in:

- `packages/workflow-dsl`;
- `packages/runtime-core`;
- `packages/workflow-generator`;
- `packages/channel-adapters`;
- Telegram preview services;
- future exporters.

Those layers may consume reviewed facts later, not raw untrusted files.

## Planned Flow

```text
Input bytes or text
-> file type gate
-> safety checks
-> parser adapter
-> normalized text
-> chunking and sourceRefs
-> ingestion report
-> later BusinessUnderstanding / BusinessGraph extraction
```

## Parser Adapter Contract

Future parser adapters should return:

```json
{
  "ok": true,
  "text": "Extracted visible text.",
  "metadata": {
    "title": "Document title",
    "pageCount": null,
    "language": "en"
  },
  "warnings": [],
  "sourceLocators": [
    {
      "kind": "line_range",
      "start": 1,
      "end": 20
    }
  ]
}
```

Failure should be safe:

```json
{
  "ok": false,
  "code": "PARSE_FAILED",
  "message": "Document could not be parsed safely.",
  "warnings": []
}
```

The parser contract must not return executable content, scripts, hidden attachments, raw binary data, cookies, credentials, or private chain-of-thought.

## Text And Markdown First

TASK-006A should avoid third-party parser dependency by starting with text and markdown normalization.

Allowed first parser behavior:

- validate UTF-8 text;
- normalize line endings;
- trim unsafe control characters;
- preserve line-based locators;
- chunk by deterministic line or character limits;
- compute content hashes.

Markdown should be treated as source text, not rendered HTML. Links may be preserved as text metadata later, but no fetching should occur.

## PDF Later

PDF support should be a separate review or spike because PDF parsing can involve:

- malformed object streams;
- embedded files;
- JavaScript/actions;
- forms and annotations;
- encrypted documents;
- image-only pages and OCR ambiguity;
- inconsistent reading order;
- parser dependency vulnerabilities.

Before PDF implementation, evaluate candidate libraries for:

- license;
- maintenance activity;
- security history;
- native dependency footprint;
- ability to disable JavaScript/actions;
- deterministic text extraction;
- metadata exposure controls;
- behavior on malformed files;
- sandboxing options.

## Dependency Evaluation Policy

Any parser dependency proposal must document:

- package name and version;
- license;
- maintenance status;
- security advisories;
- transitive dependency size;
- native binaries or postinstall behavior;
- network/file-system behavior;
- alternatives considered;
- why simpler text/markdown handling is insufficient;
- tests proving safe rejection and extraction behavior.

No parser dependency should be added without explicit approval.

## SourceRefs From Parsers

Parser output must support stable source references.

For text/markdown:

- line ranges;
- character offsets if useful;
- chunk IDs.

For PDF later:

- page number;
- text block or approximate line;
- extraction confidence;
- warning when reading order is uncertain.

## Integration With BusinessUnderstanding Later

Parser output is evidence, not business understanding.

Later extraction should:

- create candidate services, FAQs, policies, forms, scenarios, and missing questions;
- attach sourceRefs to every candidate fact;
- include confidence and freshness;
- detect conflicts against existing sources;
- require review for sensitive or high-risk facts.

## Explicit Non-Goals

- No parser code in this planning task.
- No PDF parsing in TASK-006A.
- No OCR.
- No RAG chunk embeddings.
- No AI summarization.
- No workflow generation from parser output.
- No automatic Telegram preview.
