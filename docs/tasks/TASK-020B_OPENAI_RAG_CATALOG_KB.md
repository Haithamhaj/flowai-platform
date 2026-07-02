# TASK-020B: OpenAI RAG Catalog Knowledge Base

Status: in review
Owner/Agent: Codex
Parent: `TASK-020_DOCUMENT_INTELLIGENCE_EVALUATION`

## Goal

Prove a hosted RAG/catalog knowledge boundary using OpenAI Vector Stores after FlowAI already has `SourceDocument` chunks and stable sourceRefs.

This task validates the path:

```text
SourceDocument chunks/sourceRefs
-> sourceRef-backed knowledge file
-> OpenAI Vector Store
-> search result with sourceRef
-> cleanup of hosted vector store and file
```

## Scope

- Add a backend package adapter for OpenAI Vector Stores without adding a new SDK dependency.
- Serialize `SourceDocument` chunks into a Markdown knowledge file that preserves `SOURCE_DOCUMENT`, `SOURCE_REF`, content hash, filename, extraction method, and text.
- Create a vector store, upload the knowledge file, attach it, search it, and delete the vector store/file.
- Add mocked CI tests for request sequencing, search parsing, cleanup, and secret redaction expectations.
- Add an optional local smoke command that uses ignored backend-only OpenAI config.

## Non-Goals

- No OCR implementation.
- No PDF parsing.
- No upload endpoint.
- No Google Document AI integration.
- No crawling.
- No RAG runtime node behavior change.
- No persistent vector-store registry.
- No browser-exposed provider key.
- No AI-generated final Workflow JSON.
- No catalog price, availability, recommendation, or medical claim source-of-truth decision from retrieval alone.
- No external dependency addition.

## Acceptance Criteria

- `@flowai/ai-builder-orchestrator` exports an OpenAI vector store client boundary.
- SourceDocument chunks become a sourceRef-backed knowledge file.
- Mocked tests prove create/upload/attach/search/delete behavior.
- Search results preserve a usable `sourceRefId`.
- Provider secrets are not written into request bodies, workflow JSON, BusinessUnderstanding, traces, docs, or demo output.
- The optional smoke command creates, searches, and cleans up a real OpenAI vector store when local backend config is present.
- No OCR/parser/crawler dependency is added.

## Test Plan

- `CI=true pnpm --filter @flowai/ai-builder-orchestrator test`
- `CI=true pnpm --filter @flowai/ai-builder-orchestrator typecheck`
- `CI=true pnpm smoke:flowai-rag`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`

## Implementation Notes

- RAG is retrieval over extracted source chunks; it is not the source of truth for FlowAI workflow generation.
- OpenAI Vector Stores are useful for MVP hosted retrieval, but catalog facts still need reviewed sourceRefs, freshness, and conflict rules before becoming workflow/business decisions.
- The smoke command reads ignored local provider config only through the backend-only config loader.
- The uploaded knowledge file uses Markdown because OpenAI file upload rejects `.jsonl` for this path.

## Skill/MCP Readiness

- Task type: AI provider, RAG/vector search, security, backend package, smoke test.
- Skills used: Superpowers `using-superpowers`, `executing-plans`, `test-driven-development`, `systematic-debugging`, and `verification-before-completion`.
- No extra MCP/plugin required.
- No dependency install required.
- Missing future capability: OCR/parser sandbox and crawler sandbox for later spikes, not needed for this task.
- Tool risks: OpenAI Vector Stores transfer uploaded knowledge text to a hosted provider; local smoke requires an ignored backend-only OpenAI key and cleanup verification.

## Risks

- Hosted vector store retention, billing, and region behavior still need product/security review before production use.
- Search result text can include metadata lines; a later presentation layer should strip internal metadata before owner-facing display.
- There is no durable registry or expiration policy yet; the current smoke explicitly deletes its vector store and file.
- RAG can return relevant chunks but cannot validate catalog claims, prices, availability, or recommendations by itself.
- OCR, extraction, and crawling remain unimplemented.

## Next Recommended Task

`TASK-020C_OCR_PARSER_LOCAL_SPIKE`

Goal: evaluate one local open-source OCR/parser path against FlowAI fixtures and the `ExtractedDocument` contract, with documented dependency/license/security approval before installing or integrating it.
