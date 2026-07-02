# TASK-020A: ExtractedDocument Contract And Fixture Harness

Status: accepted / merged
Owner/Agent: Codex
Parent: `TASK-020_DOCUMENT_INTELLIGENCE_EVALUATION`

## Goal

Prove that FlowAI can accept OCR-like or parser-like extracted document output and continue through the existing source-backed product pipeline without implementing OCR, upload endpoints, parser dependencies, RAG, crawling, persistence, or cloud providers.

This task validates the path:

```text
OCR-like extracted output fixture
-> ExtractedDocument contract
-> SourceDocument/sourceRefs/chunks
-> source review and deterministic business facts
-> BusinessUnderstanding draft
-> WorkflowGenerationPlan
-> WorkflowDefinition
-> runtime test conversation
-> Telegram preview mock
```

## Scope

- Add an `ExtractedDocument` input contract in `@flowai/source-ingestion`.
- Add `ingestExtractedDocument()` that maps safe page/block/table/entity output into the existing `SourceDocument` shape.
- Preserve page-level chunks and stable sourceRefs.
- Preserve extraction metadata such as source kind, source id, language, page count, table count, confidence, and page locators.
- Add tests for OCR-like pages, table sourceRefs, Arabic extracted text, low-confidence warnings, and safe rejection.
- Add a visible local demo command for the fixture harness.

## Non-Goals

- No OCR implementation.
- No PDF parsing.
- No file upload endpoint.
- No file storage.
- No Google Document AI integration.
- No OpenAI Vector Stores/File Search.
- No RAG, embeddings, or vector DB.
- No crawling.
- No persistence/database.
- No auth, tenants, or billing.
- No Studio UI changes.
- No live Telegram or WhatsApp.
- No copying code from LeapOCR or any OSS project.
- No AI-generated final Workflow JSON.

## Acceptance Criteria

- `@flowai/source-ingestion` exports `ingestExtractedDocument()` and relevant contract types.
- Extracted page output maps into `SourceDocument` with page sourceRefs and page chunks.
- Table/block metadata is represented as sourceRef metadata without changing workflow/runtime semantics.
- Arabic extracted text is preserved.
- Low-confidence extracted pages produce a review warning, not a silent failure.
- Empty/low-confidence-only input is rejected without echoing secret-like text.
- A demo command shows the full FlowAI pipeline from OCR-like fixture to runtime and Telegram mock.
- No external dependencies are added.
- No upload, OCR, RAG, crawling, persistence, or provider code is added.

## Test Plan

- `CI=true pnpm --filter @flowai/source-ingestion test`
- `CI=true pnpm --filter @flowai/source-ingestion typecheck`
- `CI=true pnpm demo:flowai:extracted`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`

## Implementation Notes

- `ExtractedDocument` is evidence, not BusinessUnderstanding.
- The SourceDocument contract remains the bridge into source review.
- Page and table locators use current line-range sourceRefs so downstream packages remain compatible.
- `detectedFormat` can now describe extracted-source methods such as `ocr_result`, `parser_result`, or `manual_fixture`.
- LeapOCR can later map to this contract through an adapter, but no LeapOCR code is copied here.

## Skill/MCP Readiness

- Task type: implementation, document ingestion, security, test/demo.
- Skills used: Superpowers `using-superpowers`, `executing-plans`, and `test-driven-development`.
- No extra MCP/plugin required.
- No dependency install required.
- Missing future capability: a parser/OCR sandbox for TASK-020B, not needed here.

## Risks

- SourceRefs are line-range based for compatibility; future OCR adapters may need richer page/block locators.
- Deterministic business fact extraction remains shallow and only proves the FlowAI pipeline shape.
- The demo uses a fixture, not real OCR or real PDF parsing.
- RAG and crawling remain explicitly deferred.

## Next Recommended Task

`TASK-020B_OPENAI_RAG_CATALOG_KB`

Goal: implement a narrow OpenAI Vector Stores adapter over existing sourceRef-backed chunks after owner approval to use the existing OpenAI key path for RAG.

After TASK-020B, evaluate one local open-source OCR/parser candidate as `TASK-020C_OCR_PARSER_LOCAL_SPIKE`, with documented dependency/license/security approval before installing or integrating anything.
