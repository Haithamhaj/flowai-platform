# TASK-006 Document Ingestion

Status: planning
Owner/Agent: Codex
Context shards: `business-understanding.md`, `security.md`

## Goal

Plan safe document ingestion as a future source pipeline:

```text
uploaded document / text / markdown / PDF later
-> SourceDocument
-> extracted safe text and metadata
-> sourceRefs
-> later BusinessUnderstanding / BusinessGraph extraction
```

This task is planning only. It does not implement upload, storage, parsing, extraction, RAG, embeddings, AI calls, API endpoints, persistence, auth, Studio UI, crawling, WhatsApp, or exporters.

## Why Now

TASK-005D proved the internal review path from `BusinessUnderstanding` through workflow draft, runtime test loop, and Telegram preview mock. Documents are a natural next input type, but they create upload, parser, privacy, and source-citation risk. Planning the ingestion boundary first keeps later implementation narrow and reviewable.

## Scope

TASK-006 planning defines:

- `SourceDocument` model and lifecycle.
- Recommended first accepted file types.
- Upload safety requirements.
- Parser boundary and dependency evaluation policy.
- Source reference requirements.
- Later BusinessUnderstanding / BusinessGraph integration.
- Conflict and source-priority behavior.
- Future API plan only.
- Storage options and risks.
- Privacy and PII rules.
- Future test plan.
- Next single implementation task recommendation.

## Non-Goals

- No upload endpoints.
- No file storage.
- No PDF parsing.
- No text extraction code.
- No parser dependency addition.
- No RAG, embeddings, vector DB, or retrieval.
- No AI extraction or provider calls.
- No crawling.
- No persistence/database.
- No auth, tenants, or billing.
- No Studio UI.
- No WhatsApp.
- No exporters.
- No workflow-dsl or runtime-core changes.

## Planning Documents

- `docs/document-ingestion/DOCUMENT_INGESTION_V0_PLAN.md`
- `docs/document-ingestion/UPLOAD_SECURITY.md`
- `docs/document-ingestion/PARSER_BOUNDARY.md`

## Recommended Decision

TASK-006A should start with a package-local `SourceDocument` model plus text and markdown ingestion only. PDF should be a separate review/spike after parser and security evaluation. Crawling remains deferred to TASK-007 or later.

## Expected Future Output

When implementation is approved later, the ingestion boundary should produce source-backed document records and source references, not Workflow JSON and not bot answers.

Future output shape:

```text
SourceDocument
SourceDocumentChunk
SourceRef
DocumentIngestionReport
```

## Acceptance Criteria For This Planning Task

- Scope and non-goals are explicit.
- `SourceDocument` model is specified.
- First accepted file types are recommended.
- Upload safety rules are documented.
- Parser boundary is documented.
- Dependency evaluation policy is documented.
- SourceRefs are specified.
- BusinessUnderstanding / BusinessGraph integration is deferred and bounded.
- Conflict/source-priority behavior is documented.
- Future API plan is informational only.
- Storage options and risks are documented.
- Privacy/PII rules are documented.
- Future test plan is documented.
- Next recommended task is exactly one.
- No implementation code or source files are changed.

## Skill/MCP Readiness

- Task type: document ingestion planning, security, source modeling.
- Useful available capabilities: local repository inspection, docs editing, GitHub PR workflow.
- External MCPs/connectors required: none.
- Missing recommended tools: none for planning.
- Future implementation may need current parser-library documentation review before adding any dependency.
- Decision: proceed with docs-only planning and no new tools.

## Test Plan

Planning-only verification:

```bash
git diff --check
```

Full tests/build are optional because this task does not modify source files.

## Risks

- Unsafe upload handling if later implementation skips validation and quarantine.
- Parser vulnerabilities or hidden network/file-system behavior.
- PII leakage in logs, traces, sourceRefs, or generated workflows.
- Treating extracted text as verified facts without review, confidence, freshness, and conflict handling.
- Expanding into RAG, embeddings, PDF parsing, storage, or API upload before explicit approval.

## Handoff Notes

TASK-006 is planning-only. Do not implement document ingestion until the planning PR is accepted.

Recommended next task: TASK-006A_SOURCE_DOCUMENT_TEXT_INGESTION.
