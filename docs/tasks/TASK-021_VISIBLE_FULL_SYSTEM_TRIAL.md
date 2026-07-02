# TASK-021: Visible Full System Trial

Status: in progress
Owner/Agent: Codex
Parent: Owner request for a complete local system trial

## Goal

Make FlowAI locally reviewable as one visible owner-facing system instead of separate technical proofs.

The owner should be able to paste a business description, document text, or website text, optionally provide a website URL reference, enable live AI review and OpenAI RAG search, then see:

```text
SourceDocument/sourceRefs
-> BusinessUnderstanding draft
-> product/catalog review
-> RAG knowledge evidence
-> launch checklist
-> WorkflowGenerationPlan summary
-> WorkflowDefinition summary
-> visual workflow editor
-> runtime test conversation
-> Telegram/Web/WhatsApp mock previews
-> copy-ready export package
```

## Scope

- Improve Studio preview model with an owner launch checklist.
- Preserve source kind and optional website URL reference in the source panel.
- Add explicit RAG knowledge search status and matches to the preview.
- Wire Studio `/api/build` to optional backend-only OpenAI Vector Stores search.
- Keep vector store use temporary per request: create, search, cleanup.
- Show blockers for OCR/PDF ingestion and website crawling instead of claiming they work.
- Keep Workflow JSON deterministic and validator-backed.

## Non-Goals

- No OCR implementation.
- No PDF parser.
- No file upload endpoint.
- No crawler.
- No Google Document AI integration.
- No durable vector-store registry.
- No persistence/database.
- No auth, tenants, or billing.
- No live Telegram or WhatsApp.
- No external dependency addition.
- No AI-generated final Workflow JSON.

## Acceptance Criteria

- Studio preview includes an owner checklist with done/review/blocked/not-enabled statuses.
- Studio accepts `sourceKind` and optional `sourceUrl` for review context.
- Studio can run sourceRef-backed RAG search when explicitly enabled and backend OpenAI config exists.
- RAG search returns sourceRef-backed evidence and cleans up temporary vector store resources.
- UI renders checklist and RAG evidence visibly.
- Tests prove checklist and mocked RAG behavior.
- Full tests/build pass.
- Browser smoke confirms the local page renders the visible system.

## Test Plan

- `CI=true pnpm --filter @flowai/studio test`
- `CI=true pnpm --filter @flowai/studio typecheck`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`
- Local browser smoke against Studio preview.

## Skill/MCP Readiness

- Task type: Studio UI, AI provider boundary, RAG, visible product demo, security.
- Skills used: Superpowers `using-superpowers`, `executing-plans`, `test-driven-development`, and `verification-before-completion`.
- Browser verification is expected for the visible UI.
- No extra dependency or plugin installation required.
- OpenAI key is used only through existing ignored backend-only config when live AI or RAG is explicitly enabled.

## Risks

- RAG search transfers source text to OpenAI Vector Stores when enabled; production privacy, retention, billing, deletion, and tenant isolation are not complete.
- Website mode is pasted website text plus URL reference only; no crawler exists yet.
- OCR/PDF remains blocked until an OCR/parser spike is approved.
- Product/catalog claims remain review-required, not source-of-truth automation.

## Next Recommended Task

`TASK-022_OCR_PARSER_LOCAL_SPIKE`

Goal: evaluate a local open-source OCR/parser candidate against FlowAI fixtures and the `ExtractedDocument` contract, with dependency/license/security approval before installation or integration.
