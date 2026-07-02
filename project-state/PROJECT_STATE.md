# Project State

## Current Goal

Prove the first hosted RAG/catalog knowledge boundary using OpenAI Vector Stores over existing FlowAI `SourceDocument` chunks and sourceRefs, without adding OCR, upload endpoints, parser dependencies, crawling, persistence, or a production RAG lifecycle.

## Current Reality

`flowai-platform` exists. TASK-000 is done for skeleton/setup. TASK-001 is done for workflow-dsl after review and revision. TASK-002 is done for runtime-core after implementation revision and verification. TASK-003 is done for the API test loop after implementation revision and verification. TASK-004 is merged into `main` as Telegram preview mock adapter. The current accepted operating mode is task-first.

Telegram mock/update preview is implemented and merged. TASK-005A package-first direct business interview analysis is merged into `main`. Business Understanding v1 architecture planning is merged into `main` as docs only. TASK-005B planning and implementation are merged into `main`; `packages/workflow-generator` now provides deterministic package-local `BusinessUnderstanding -> WorkflowGenerationPlan -> WorkflowDefinition` draft generation for clinic booking and service lead templates. TASK-005C planning and implementation are merged into `main`; `POST /workflow-drafts/from-business-understanding` is the accepted narrow API wrapper around the generator. TASK-005D end-to-end smoke tests are accepted and merged through PR #11 at final main HEAD `f2e44819757a0ef015b2674323feac4391ea0d8e`. TASK-006 document ingestion planning is merged into `main`. TASK-006A source document text ingestion is merged into `main` through PR #14 at `5d388ff79e84f42cf302b347590b703a8f3602b0`.

The visible local MVP demo support is merged. `packages/source-review` converts accepted text/markdown `SourceDocument` records into deterministic review facts and `BusinessUnderstanding` drafts, and `pnpm demo:flowai` shows clinic appointment, service lead, FAQ, and Arabic examples through workflow generation, runtime test conversation, and Telegram preview mock. It adds no upload endpoints, parser dependencies, PDF parsing, storage, RAG, AI providers, crawling, persistence, auth, Studio UI, WhatsApp, live Telegram, or exporters.

Owner review rejected the original visible surface as too technical and not the right user experience. The accepted direction is now owner-first: the business owner should talk naturally with FlowAI, provide business context/documents/website later, review what FlowAI understood, build a chatbot workflow, edit the decision tree on web, test channel previews, and export/integrate portable JSON/API mappings.

The owner-first plan is captured in `docs/plans/FLOWAI_OWNER_FIRST_AI_BUILDER_PLAN.md`. TASK-010 formalized AI builder agents, tools, prompt pack, data models, and UX flow before implementation. TASK-011 implemented `apps/studio` as an owner-first local builder UI shell backed by deterministic source ingestion, source review, BusinessUnderstanding draft, WorkflowGenerationPlan, Workflow JSON draft, runtime preview, and Telegram mock preview. TASK-012 added `packages/ai-builder-orchestrator` with prompt pack files, mocked provider tests, structured output validation, product catalog sourceRef blockers, and deterministic fallback. TASK-013 Product Catalog Workspace is merged into `main` at `df2c615`. TASK-014 Visual Workflow Editor is merged into `main` at `776208b`. TASK-015 Channel Preview Workspace is merged into `main` at `e718c70`. TASK-016 Export & Integration Hub is merged into `main` at `8ccd895d4a995435bf74fb397b958fcdd81df8de`; Studio now shows local FlowAI Workflow JSON, CRM mapping, and ticketing mapping copy blocks. The ignored local `.flowai.local.json` may hold development model preferences and API key material, but application code must not read it until a later approved live provider task.

TASK-017 is merged as the live AI provider boundary plan. TASK-017A is merged as the backend-only OpenAI extraction spike: `packages/ai-builder-orchestrator` now has an OpenAI Responses API provider adapter, disabled unless explicitly configured, with mocked CI tests and an optional local smoke script. It reads ignored `.flowai.local.json` only when the backend caller explicitly allows local config. TASK-018 is merged: Studio exposes live AI review as an explicit owner toggle while keeping deterministic fallback and Workflow JSON generation unchanged. TASK-019 is merged: it produces `docs/demo/FLOWAI_LIVE_AI_OWNER_REVIEW.md` from `pnpm demo:flowai:live` so the owner can compare deterministic and live AI review output.

TASK-020 is merged. It documents the approved direction for document intelligence: OCR/PDF extraction, cloud extraction, RAG/vector search, crawling, and catalog extraction must start from source-backed extraction and stable sourceRefs, not from a RAG-first implementation.

TASK-020A is merged. It adds an `ExtractedDocument` contract and fixture harness so FlowAI can prove the path from OCR-like output to SourceDocument/sourceRefs/chunks, BusinessUnderstanding, WorkflowGenerationPlan, WorkflowDefinition, runtime test conversation, and Telegram preview mock without implementing OCR, upload endpoints, parser dependencies, RAG, crawling, persistence, or cloud providers.

TASK-020B is the active implementation task. It adds a narrow OpenAI Vector Stores adapter in `packages/ai-builder-orchestrator` so FlowAI can create a sourceRef-backed knowledge file from `SourceDocument` chunks, create/search/delete a hosted vector store, and prove the path with a local smoke command using ignored backend-only OpenAI config. This is a RAG/catalog retrieval boundary, not production OCR, crawling, upload, persistence, tenant isolation, or catalog source-of-truth behavior.

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
- Visible MVP review should prioritize observable demo output over additional invisible infrastructure.
- Owner-first AI builder work should preserve the safe pipeline while replacing the technical demo UX.
- AI builder orchestration should be split into agents/tools/prompts with structured outputs and validation boundaries before any live provider call.
- Model names should be configurable; do not hardcode a single future model as an architectural assumption.
- TASK-011 owner-first UI uses deterministic fallback only and must label live AI as pending.
- TASK-012 mocked AI orchestration does not call providers and does not let AI produce final Workflow JSON.
- Product catalog price, availability, eligibility, and recommendation-like claims must remain sourceRef-gated.
- TASK-013 Product Catalog Workspace is deterministic and review-first; price and availability labels are source-backed review markers, not publish-ready commerce evidence.
- TASK-014 visual editor keeps Workflow JSON as the source of truth; UI edits must re-run validator/runtime preview rather than becoming a separate hidden workflow model.
- TASK-015 channel preview workspace renders channel-specific previews from runtime output only; Telegram and WhatsApp remain mock previews, not live integrations.
- TASK-016 export hub produces local copy-ready JSON and mapping plans only; it does not connect to CRM, ticketing, webhooks, or external platforms.
- TASK-017 live AI work must start as backend-only BusinessUnderstanding extraction/refinement, disabled by default, with mocked tests first and no AI-generated final Workflow JSON.
- TASK-017A uses OpenAI Responses API with strict structured output for BusinessUnderstanding refinement only; deterministic generation remains responsible for WorkflowGenerationPlan and WorkflowDefinition.
- TASK-018 Studio live AI review must remain off by default and must use backend-only provider config; the browser can request live review but must never receive or send provider keys.
- TASK-019 owner demo output should show live AI as review assistance, while Workflow JSON remains deterministic and validator-backed.
- TASK-020 document intelligence should start with evaluation and sourceRefs before implementation.
- FlowAI should not go RAG-first; RAG/vector search should sit on extracted chunks with stable sourceRefs.
- MinerU, Docling, and PaddleOCR are the first local PDF/OCR candidates to evaluate, but no dependency is approved yet.
- LeapAI-SA/leap-ocr-platform is an internal reference and possible OCR/extraction service adapter candidate, not a direct code-copy source.
- Google Document AI OCR/Form Parser/Custom Extractor is a cloud extraction candidate that requires separate credential, billing, privacy, and region approval before any spike.
- OpenAI Vector Stores/File Search is the accepted first hosted MVP RAG adapter after extracted chunks/sourceRefs exist, but not as the source of truth for catalog or workflow decisions.
- Crawl4AI and Crawlee are crawling candidates for a later website ingestion spike; Firecrawl remains learn-only until license/security/provider review.
- TASK-020A uses fixture-based extracted output only; OCR/parser providers should map into `ExtractedDocument` later rather than owning FlowAI workflow logic.
- `ExtractedDocument` is evidence and sourceRefs, not BusinessUnderstanding and not Workflow JSON.
- TASK-020B uses OpenAI Vector Stores over sourceRef-backed knowledge Markdown; retrieval results remain review evidence, not final workflow/catalog truth.

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
- The existing local demo can mislead reviewers if treated as final UX instead of a technical proof.
- Live AI provider integration can leak secrets or overclaim facts unless backend-only config, sourceRefs, structured outputs, and redaction checks are enforced.
- Product catalog extraction can overclaim prices, availability, or recommendations without source-backed evidence.
- TASK-013 deterministic catalog extraction is shallow and should not be treated as ecommerce parsing, live inventory, or AI recommendation quality.
- TASK-014 visual editor is local preview-only; no persistence, publish flow, production graph layout, or external editor dependency exists yet.
- TASK-015 WhatsApp preview may be mistaken for live WhatsApp unless mock labels and PR notes stay explicit.
- TASK-016 mapping plans may be mistaken for live integrations unless unsupported items and no-credential boundaries stay visible.
- Owner-first UI may feel incomplete until TASK-012 adds mocked AI orchestration and prompt-pack behavior.
- Mocked AI orchestration may be mistaken for live AI unless UI labels and PR notes stay explicit.
- Live AI provider integration can leak secrets or overclaim facts unless TASK-017A keeps provider access backend-only, disabled by default, sourceRef-gated, mocked in CI, and sanitized in diagnostics.
- TASK-017A live smoke proves the provider can return structured output locally, but Studio is not wired to live AI yet and the output remains a review draft, not publish-ready chatbot behavior.
- Studio live AI review may be mistaken for production chatbot intelligence unless UI notes continue to say Workflow JSON is still generated and validated deterministically.
- OCR/parser tools may add heavy native binaries, GPU requirements, model downloads, custom licenses, and supply-chain risk.
- The internal LeapOCR repo can accelerate OCR/extraction learning, but direct reuse needs ownership/license confirmation and would otherwise pull in MongoDB, GCS, auth, OpenRouter, Vertex AI, Terraform, and deployment scope.
- Google Document AI or OpenAI Vector Stores may transfer customer documents to third-party providers and need privacy, retention, region, and deletion review.
- RAG can produce unsupported answers if chunking, sourceRefs, freshness, and citation rules are weak.
- Crawling can introduce SSRF, robots, rate-limit, stale-data, and privacy risks.
- Arabic OCR and extraction quality must be proven on fixtures rather than assumed from multilingual claims.
- TASK-020A proves only contract compatibility and deterministic pipeline shape; it does not prove real OCR quality.
- TASK-020B proves only create/search/delete against OpenAI Vector Stores for a small sourceRef-backed fixture; it does not prove production RAG lifecycle, tenant isolation, retention policy, catalog truth, OCR quality, or crawling quality.

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
- Do not use `.flowai.local.json` from application code until a provider-integration task explicitly approves backend-only secret handling.
- Do not continue polishing the technical demo as the final product experience.
- Do not expose provider keys to browser code, workflow JSON, BusinessUnderstanding, traces, logs, screenshots, docs, tests, or export packages.
- Do not wire live AI into Studio without an explicit review toggle/status and backend-only provider access.
- Do not add OCR, PDF parsers, cloud extraction, crawling, upload endpoints, or production RAG lifecycle behavior without their own approved task.
- Do not copy code from LeapAI-SA/leap-ocr-platform into FlowAI until ownership/reuse permission, security boundaries, and a specific adapter task are approved.
- Do not use RAG results as source of truth for prices, availability, recommendations, medical/legal policy, or workflow decisions without source-backed review.
- Do not let OCR/parser adapters generate final Workflow JSON or bypass SourceDocument/sourceRefs review.

## Next Recommended Action

Review TASK-020B OpenAI RAG Catalog Knowledge Base PR. After acceptance, start `TASK-020C_OCR_PARSER_LOCAL_SPIKE` only if dependency/license/security approval is documented.

## Critical References

- `AGENTS.md`
- `docs/00_PROJECT_CONTEXT.md`
- `docs/06_AGENT_WORKFLOW.md`
- `docs/07_TASK_SYSTEM.md`
- `docs/17_SKILL_MCP_READINESS.md`
- `docs/tasks/`
- `docs/tasks/TASK-010_OWNER_FIRST_AI_BUILDER_ORCHESTRATION.md`
- `docs/tasks/TASK-011_OWNER_FIRST_BUILDER_UI.md`
- `docs/tasks/TASK-012_AI_BUILDER_PROMPT_PACK_AND_MOCKED_ORCHESTRATOR.md`
- `docs/tasks/TASK-013_PRODUCT_CATALOG_WORKSPACE.md`
- `docs/tasks/TASK-014_VISUAL_WORKFLOW_EDITOR.md`
- `docs/tasks/TASK-015_CHANNEL_PREVIEW_WORKSPACE.md`
- `docs/tasks/TASK-016_EXPORT_AND_INTEGRATION_HUB.md`
- `docs/exporters/EXPORT_AND_INTEGRATION_HUB.md`
- `docs/tasks/TASK-017_LIVE_AI_PROVIDER_PLANNING_OR_EXTRACTION_SPIKE.md`
- `docs/tasks/TASK-017A_BACKEND_ONLY_OPENAI_EXTRACTION_SPIKE.md`
- `docs/tasks/TASK-018_STUDIO_LIVE_AI_REVIEW_TOGGLE.md`
- `docs/tasks/TASK-019_OWNER_REVIEW_DEMO_WITH_LIVE_AI.md`
- `docs/demo/FLOWAI_LIVE_AI_OWNER_REVIEW.md`
- `docs/tasks/TASK-020_DOCUMENT_INTELLIGENCE_EVALUATION.md`
- `docs/tasks/TASK-020A_EXTRACTED_DOCUMENT_CONTRACT_AND_FIXTURE_HARNESS.md`
- `docs/tasks/TASK-020B_OPENAI_RAG_CATALOG_KB.md`
- `docs/document-intelligence/DOCUMENT_INTELLIGENCE_OPTIONS.md`
- `docs/ai-provider/LIVE_AI_PROVIDER_BOUNDARY.md`
- `docs/plans/FLOWAI_OWNER_FIRST_AI_BUILDER_PLAN.md`
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
- `packages/source-review/src/index.ts`
- `packages/source-review/test/source-review.test.ts`
- `examples/flowai-demo/visible-mvp-demo.mjs`
- `docs/demo/FLOWAI_VISIBLE_MVP_DEMO.md`
- `docs/api/WORKFLOW_DRAFT_ENDPOINT_PLAN.md`
