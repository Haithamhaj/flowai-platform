# Project State

## Current Goal

Implement TASK-006A source document text ingestion for review.

## Current Reality

`flowai-platform` exists. TASK-000 is done for skeleton/setup. TASK-001 is done for workflow-dsl after review and revision. TASK-002 is done for runtime-core after implementation revision and verification. TASK-003 is done for the API test loop after implementation revision and verification. TASK-004 is merged into `main` as Telegram preview mock adapter. The current accepted operating mode is task-first.

Telegram mock/update preview is implemented and merged. TASK-005A package-first direct business interview analysis is merged into `main`. Business Understanding v1 architecture planning is merged into `main` as docs only. TASK-005B planning and implementation are merged into `main`; `packages/workflow-generator` now provides deterministic package-local `BusinessUnderstanding -> WorkflowGenerationPlan -> WorkflowDefinition` draft generation for clinic booking and service lead templates. TASK-005C planning and implementation are merged into `main`; `POST /workflow-drafts/from-business-understanding` is the accepted narrow API wrapper around the generator. TASK-005D end-to-end smoke tests are accepted and merged through PR #11 at final main HEAD `f2e44819757a0ef015b2674323feac4391ea0d8e`. TASK-006 document ingestion planning is merged into `main`. The current branch implements TASK-006A source document text ingestion in `packages/source-ingestion` for text/markdown input objects only. It adds no upload endpoints, parser dependencies, PDF parsing, storage, RAG, AI providers, crawling, persistence, auth, Studio UI, WhatsApp, live Telegram, or exporters.

## Active Decisions

- FlowAI is a Business-to-Workflow Chatbot Generator.
- Old backend is reference-only.
- Skill/MCP Readiness Check is required before every task.
- Workflow JSON DSL is source of truth.
- Runtime core interprets validated Workflow JSON safely and channel-neutrally.
- Runtime proof comes before generator/crawling/UI.
- Telegram preview comes before WhatsApp.
- Channels are adapters, not workflow owners.
- No executable workflow code.
- No unsafe OSS copying.
- Workflow DSL validator is dependency-free for now.
- `handoff` and `end` are terminal runtime nodes.
- Runtime `ai_response` and `rag_answer` are deterministic placeholders only.
- API test loop exposes only health, workflow validation, in-memory runtime start/message/trace/reset.
- API test loop uses `stateSummary` and safe structured errors for test/debug flows.
- TASK-004 preview uses a mock Telegram update endpoint first.
- grammY remains the recommended future dependency for live polling, but no external Telegram SDK has been added yet.
- Production webhook work is later and must include verification.
- TASK-005 should start with BusinessUnderstanding schema plus deterministic direct-interview analysis.
- Workflow draft generation from BusinessUnderstanding should be split into TASK-005B or a later approved task.
- TASK-005A uses deterministic local analysis only; it does not call AI providers and does not generate Workflow JSON.
- Business Understanding v1 should separate source-backed BusinessGraph facts from CapabilityMap decisions before any WorkflowGenerator consumes them.
- Product/catalog recommendations require sourceRefs, freshness, confidence, and conflict status.
- TASK-005B should be package-first, deterministic, and validator-backed before any API endpoint is added.
- Workflow generation should pass through a `WorkflowGenerationPlan` before producing Workflow JSON.
- `targetChannel` can be an optional hint later, but must not change core workflow semantics.
- TASK-005B non-strict mode may create a draft workflow while reporting publish blockers; strict mode returns no workflow when blocking questions remain unresolved.
- Clinic booking and service lead capture are the only implemented generator templates in TASK-005B.
- Explicit unsupported template hints must return blocking reports; inference is allowed only when `templateHint` is absent.
- TASK-005B `capabilitiesUsed` must describe actual generated workflow behavior, not theoretical template support.
- Invalid `BusinessUnderstanding` input must return a blocking generation report, not throw during planning.
- FAQ-only generation, ecommerce/product recommendations, RAG, actions, and webhook nodes remain deferred.
- TASK-005C should expose workflow draft generation through a narrow API wrapper that validates request shape, delegates to `@flowai/workflow-generator`, and returns reports without side effects.
- TASK-005C API strict mode should default to `true`; draft generation blockers should remain generation reports rather than template reinterpretation.
- TASK-005C may return `runtimePreviewHint`, but must not automatically create runtime test sessions or Telegram preview sessions.
- TASK-005C request validation rejects malformed bodies and obvious provider/secret request fields, while valid request shapes with generator blockers return `workflow: null` and a report.
- TASK-005D proves the first internal vertical slice through tests only; production orchestration, persistence, and external integrations remain deferred.
- TASK-005D is accepted and merged via PR #11 at `f2e44819757a0ef015b2674323feac4391ea0d8e`.
- TASK-006 planning should start with SourceDocument plus text/markdown ingestion only in a later implementation task; PDF requires a separate parser/security review.
- TASK-006A implements `packages/source-ingestion` as the text/markdown-only SourceDocument foundation without external parser dependencies.

## Active Risks

- Agents may overbuild without following task files.
- Future AI/RAG/channel work may be claimed before it is tested.
- Manual DSL validation may become harder to maintain if DSL scope expands.
- API runtime test sessions are process-local, temporary, capped in memory, lost on restart, not tenant-safe, and not horizontally scalable.
- Telegram preview may accidentally grow into production channel infrastructure if endpoints, token handling, and persistence are not kept minimal.
- TASK-004 Telegram preview sessions are also process-local and preview-only.
- TASK-005 may overpromise AI generation if provider calls are added before explicit approval.
- BusinessUnderstanding may become too coupled to channels/runtime/API if the package boundary is not kept clean.
- Deterministic TASK-005A extraction is intentionally conservative and should not be treated as production AI extraction quality.
- BusinessGraph planning may be mistaken for implemented crawling, catalog extraction, or recommendations unless follow-up tasks stay explicit.
- Catalog facts such as prices, availability, listings, and menu items are high-risk when stale or conflicted.
- Workflow generation may over-infer services, handoff routes, FAQs, or product recommendations if future tasks weaken blockers and source-backed mappings.
- Future API or UI work could accidentally weaken unsupported-template blockers or auto-start runtime/channel preview sessions if the draft/review boundary is not kept narrow.
- TASK-005C endpoint output is a draft/review surface; callers still need to inspect `generationReport` before treating a workflow as publish-ready.
- TASK-005D smoke tests are controller/service-level integration tests, not production HTTP, persistence, auth, or live-channel tests.
- Document ingestion can create upload, parser, privacy, PII, and source-conflict risks if implemented before the safety boundary is accepted.
- TASK-006A warning flags for secret-like and PII-like content are basic deterministic safeguards, not complete DLP.

## Protected Areas

- Do not copy code from legacy backend, Dify, Typebot, Firecrawl, or unsafe-license projects.
- Do not add `eval`, `new Function`, arbitrary workflow expressions, or secrets in workflow JSON.
- Do not implement crawling, WhatsApp, Studio UI, RAG, or AI generation without explicit task approval.
- Do not put Telegram bot tokens or webhook secrets in workflow JSON, logs, or runtime traces.
- Do not store secrets or private chain-of-thought in BusinessUnderstanding JSON.
- Do not generate Workflow JSON in TASK-005A; TASK-005B owns the package-local draft generator boundary.
- Do not claim crawling, catalog extraction, source priority resolution, recommendation ranking, or BusinessGraph persistence works until implementation tasks prove it.
- Do not recommend products, compare listings, show prices, or answer policy questions without source-backed facts and conflict handling.
- Do not generate action or webhook nodes unless configured tools exist in a later approved task.
- Do not let workflow generation embed secrets, executable expressions, channel-specific semantics, or product/price claims without source-backed evidence.
- Do not add document upload endpoints, parser dependencies, PDF parsing, durable storage, RAG, embeddings, or AI extraction during TASK-006 planning.

## Next Recommended Action

Review TASK-006A source document text ingestion PR. Do not start upload endpoints, PDF parsing, persistence, RAG, crawling, AI extraction, or API wiring until this package boundary is accepted.

## Critical References

- `AGENTS.md`
- `docs/00_PROJECT_CONTEXT.md`
- `docs/06_AGENT_WORKFLOW.md`
- `docs/07_TASK_SYSTEM.md`
- `docs/17_SKILL_MCP_READINESS.md`
- `docs/tasks/`
- `docs/shards/`
- `docs/16_PROJECT_SETUP.md`
- `packages/workflow-dsl/src/validator.ts`
- `packages/runtime-core/src/runtime.ts`
- `packages/runtime-core/src/condition-evaluator.ts`
- `apps/api/src/services/runtime-test.service.ts`
- `apps/api/src/routes/runtime.controller.ts`
- `packages/channel-adapters/src/index.ts`
- `packages/channel-adapters/src/telegram/`
- `apps/api/src/services/telegram-preview.service.ts`
- `apps/api/src/routes/telegram-preview.controller.ts`
- `apps/api/src/services/workflow-draft.service.ts`
- `apps/api/src/routes/workflow-draft.controller.ts`
- `apps/api/test/workflow-draft.service.test.ts`
- `apps/api/test/flowai-vertical-slice.test.ts`
- `docs/tasks/TASK-004_TELEGRAM_PREVIEW.md`
- `docs/tasks/TASK-005_BUSINESS_INTERVIEW_GENERATOR.md`
- `packages/business-understanding/src/index.ts`
- `packages/business-understanding/src/types.ts`
- `packages/business-understanding/src/analyzer.ts`
- `packages/business-understanding/src/validator.ts`
- `packages/business-understanding/src/redaction.ts`
- `packages/business-understanding/test/business-understanding.test.ts`
- `packages/workflow-generator/src/index.ts`
- `packages/workflow-generator/src/generation-plan.ts`
- `packages/workflow-generator/src/generator.ts`
- `packages/workflow-generator/src/report.ts`
- `packages/workflow-generator/src/templates/clinic-booking.ts`
- `packages/workflow-generator/src/templates/service-lead.ts`
- `packages/workflow-generator/test/workflow-generator.test.ts`
- `docs/business-understanding/BUSINESS_GRAPH_V1.md`
- `docs/business-understanding/CRAWLING_AND_SOURCE_PIPELINE.md`
- `docs/business-understanding/PRODUCT_CATALOG_MODEL.md`
- `docs/business-understanding/CAPABILITY_MAP.md`
- `docs/business-understanding/SOURCE_PRIORITY_AND_CONFLICTS.md`
- `docs/business-understanding/DECISION_AND_RECOMMENDATION_POLICY.md`
- `docs/tasks/TASK-005B_WORKFLOW_DRAFT_GENERATOR.md`
- `docs/workflow-generator/WORKFLOW_GENERATOR_V0_PLAN.md`
- `docs/tasks/TASK-005C_API_WORKFLOW_DRAFT_ENDPOINT.md`
- `docs/tasks/TASK-005D_END_TO_END_SMOKE.md`
- `docs/tasks/TASK-006_DOCUMENT_INGESTION.md`
- `docs/tasks/TASK-006A_SOURCE_DOCUMENT_TEXT_INGESTION.md`
- `docs/document-ingestion/DOCUMENT_INGESTION_V0_PLAN.md`
- `docs/document-ingestion/UPLOAD_SECURITY.md`
- `docs/document-ingestion/PARSER_BOUNDARY.md`
- `project-state/TASK_GRAPH.md`
- `packages/source-ingestion/src/index.ts`
- `packages/source-ingestion/src/types.ts`
- `packages/source-ingestion/test/source-ingestion.test.ts`
- `docs/api/WORKFLOW_DRAFT_ENDPOINT_PLAN.md`
