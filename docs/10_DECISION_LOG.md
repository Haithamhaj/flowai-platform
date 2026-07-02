# 10 Decision Log

## 2026-06-28: Greenfield Project

Decision: Start FlowAI as a greenfield project.
Reason: The old backend is useful for intent but not a safe architecture base.
Consequences: New work must be task-scoped and not migrate legacy modules.
Revisit trigger: Only if a specific legacy component is proven safe and worth reimplementing.

## 2026-06-28: Legacy Repo Reference-Only

Decision: Use the old backend only for intent, risks, and concepts.
Reason: Avoid carrying unsafe runtime and mixed boundaries.
Consequences: No code copying or architecture preservation.
Revisit trigger: User explicitly requests a comparison or extraction plan.

## 2026-06-28: Workflow JSON DSL Is Source Of Truth

Decision: Store workflows as strict JSON DSL.
Reason: Safe validation, runtime, exports, and review require structured data.
Consequences: No executable workflow strings.
Revisit trigger: DSL cannot express a core product workflow safely.

## 2026-06-28: Runtime Before Generator

Decision: Prove validator/runtime before AI generation.
Reason: Generated workflows need a safe execution contract.
Consequences: AI and crawling wait until runtime proof exists.
Revisit trigger: Runtime contract is stable and tested.

## 2026-06-28: Telegram Before WhatsApp

Decision: Telegram preview comes before WhatsApp.
Reason: Lower setup friction for early external preview.
Consequences: WhatsApp is deferred.
Revisit trigger: Telegram preview proves useful or a customer requires WhatsApp.

## 2026-06-28: Crawling After Runtime Proof

Decision: Website crawling comes after DSL/runtime proof.
Reason: Crawling introduces uncertain input; runtime must be testable first.
Consequences: Crawlee or similar tools are deferred.
Revisit trigger: Runtime and generator contracts exist.

## 2026-06-28: Studio UI After Runtime Proof

Decision: Studio UI comes after DSL/runtime/API proof.
Reason: UI should review real workflow semantics, not invent them.
Consequences: No visual builder-first implementation.
Revisit trigger: API test loop is stable.

## 2026-06-28: No Unsafe OSS Copying

Decision: Learn from OSS, but copy only when license and fit are reviewed.
Reason: Avoid license contamination and architecture drift.
Consequences: Dify, Typebot, and Firecrawl are learn-only by default.
Revisit trigger: Dependency proposal documents license and risks.

## 2026-06-28: TASK-000 Accepts Skeleton Only

Decision: Treat TASK-000 as acceptance of the project skeleton and operating structure only.
Reason: Prototype implementation files already exist from earlier setup, but the operating pack requires task-by-task review before product code is accepted.
Consequences: Existing prototype code remains provisional until TASK-001, TASK-002, and TASK-003 are reviewed.
Revisit trigger: Starting each corresponding task and explicitly accepting, replacing, or revising the prototype.

## 2026-06-28: Skill/MCP Readiness Before Every Task

Decision: Require a lightweight Skill/MCP Readiness Check before implementation.
Reason: Agents should use available high-leverage capabilities when useful and recommend missing ones before they become blockers.
Consequences: Every task must document expected tools, available tools, missing recommended tools, and whether work can proceed.
Revisit trigger: The check becomes too heavy, blocks simple work, or misses important tool/security decisions.

## 2026-06-28: Accept Workflow DSL Prototype After Revision

Decision: Accept the existing `packages/workflow-dsl` prototype as TASK-001 product code after strengthening validation and tests.
Reason: The prototype matched the intended DSL direction, and targeted revisions closed the main safety gaps without requiring a rebuild or new dependency.
Consequences: Workflow DSL is now the accepted source-of-truth package for future runtime/API tasks. Runtime and API remain provisional until their tasks are reviewed.
Revisit trigger: DSL expands enough that manual validation becomes brittle, external JSON Schema is needed, or importer/exporter compatibility requires stricter schema tooling.

## 2026-06-28: Accept Runtime Core As Safe Interpreter

Decision: Accept `packages/runtime-core` as TASK-002 product code after revising it into a safe Workflow JSON interpreter.
Reason: The runtime now validates DSL input before execution, tracks pending user input explicitly, interprets safe condition AST only, emits replay-ready traces, and keeps channel/provider logic out of the core.
Consequences: `handoff` and `end` are terminal runtime nodes; `question` and required `field_collection` nodes pause across turns; `ai_response` and `rag_answer` stay deterministic placeholders with no external calls.
Revisit trigger: Runtime needs durable persistence, action/webhook execution, real AI/RAG provider integration, or channel-specific behavior.

## 2026-06-29: Accept API Test Loop As Test-Only Runtime Surface

Decision: Accept `apps/api` as TASK-003 product code after revising it into a minimal test-only API around Workflow DSL validation and Runtime Core sessions.
Reason: The API now delegates validation and execution to the accepted packages, uses predictable safe error shapes, returns explicit `stateSummary`/`traceDelta` debug responses, and avoids channel/provider/persistence scope.
Consequences: Runtime test sessions are temporary, process-local, capped in memory, resettable, and not production persistence. Ended sessions return `409 SESSION_ENDED` instead of silently mutating or returning empty output.
Revisit trigger: API needs auth, tenants, durable storage, production session semantics, channel delivery, or public client contracts beyond this local test loop.

## 2026-06-29: Telegram Preview Starts With Mock Update Endpoint

Decision: Implement TASK-004 Telegram Preview v0 with pure adapter mapping and a mock/local update API endpoint, while deferring grammY and live polling.
Reason: The first Telegram preview proof only needs safe update mapping, runtime session orchestration, Telegram-formatted descriptors, reset, and trace lookup. Adding a Telegram SDK before live polling would create unused dependency and token-handling surface.
Consequences: No real Telegram network calls, polling, webhook verification, or bot token is required for TASK-004 tests. `grammy@1.44.0` was verified as MIT licensed and remains the recommended dependency for a future live polling task.
Revisit trigger: A follow-up task explicitly adds live Telegram polling or production webhook handling.

## 2026-06-29: Split Business Understanding From Workflow Draft Generation

Decision: Scope TASK-005A to BusinessUnderstanding schema plus deterministic direct-interview extraction, and defer Workflow JSON draft generation to TASK-005B or a later approved task.
Reason: Direct interview understanding can be validated locally without AI providers, crawling, RAG, persistence, or changes to runtime/workflow DSL. Workflow generation needs its own mapping contract and acceptance checks.
Consequences: `packages/business-understanding` should become the next package-first implementation target. `packages/workflow-generator` remains placeholder-only until BusinessUnderstanding output is accepted.
Revisit trigger: BusinessUnderstanding v0 is accepted and a follow-up task explicitly starts workflow draft generation.

## 2026-06-29: Plan TASK-005B As Deterministic Package-First Generator

Decision: TASK-005B should implement a deterministic package-first `BusinessUnderstanding -> WorkflowGenerationPlan -> WorkflowDefinition` generator before any API endpoint, AI provider, crawler, RAG, persistence, or channel-specific behavior is added.
Reason: The accepted BusinessUnderstanding and Workflow DSL contracts are strong enough to plan a narrow generator, but safe generation needs an explainable intermediate plan, validator-backed output, and source/confidence blockers before user-facing API or UI work.
Consequences: `packages/workflow-generator` should be revised from placeholder status into deterministic generator code in the next implementation task. The first templates should be clinic booking and service lead capture. API wiring should wait for a later TASK-005C or explicitly approved task.
Revisit trigger: TASK-005B implementation proves the package contract, or generator requirements require DSL changes, API state, provider calls, or source pipeline data.

## 2026-06-29: Implement TASK-005B Draft Generation Strictness Split

Decision: TASK-005B generator supports non-strict draft generation with publish blockers reported, while strict mode returns no workflow when required approvals remain unresolved.
Reason: TASK-005A always surfaces missing handoff/refusal rules as blocking questions, but FlowAI still needs a reviewable draft workflow before publish approval. Separating draft validity from publish readiness keeps generated Workflow JSON validator-backed without pretending unresolved business approvals are complete.
Consequences: Clinic booking and service lead templates can produce draft `WorkflowDefinition` output when source-backed services and fields exist. Unresolved conflicts, invalid BusinessUnderstanding input, unsupported templates, and missing generation-critical facts still block draft generation. API exposure, ecommerce recommendations, FAQ-only generation, RAG, actions, and webhooks remain deferred.
Revisit trigger: CapabilityMap, BusinessGraph, or API review introduces a richer publish-readiness model separate from workflow validation.

## 2026-06-29: Keep TASK-005B Reports Behavior-Actual

Decision: `capabilitiesUsed` in TASK-005B reports only behavior present in the generated workflow, and invalid BusinessUnderstanding input returns a blocking report before planning.
Reason: Reviewers need reports to distinguish actual generated capability from possible template support, and malformed input must not crash the safe generation boundary.
Consequences: FAQ capability appears only with an actual deterministic FAQ node. Invalid input returns no workflow, no tests, empty capabilities, validation issues, and a minimal safe generation plan.
Revisit trigger: A later CapabilityMap introduces separate fields for possible, deferred, and generated capabilities.

## 2026-06-30: Plan TASK-005C As API Wrapper Around Workflow Generator

Decision: TASK-005C should expose workflow draft generation through a narrow API endpoint that validates request shape, applies safe defaults, delegates to `@flowai/workflow-generator`, and returns the generator plan/report with `workflow: null` when blocked.
Reason: TASK-005B already owns deterministic template selection, unsupported-hint blocking, Workflow DSL validation, and generated tests. The API should make that package behavior reachable without creating a second generator or adding side effects.
Consequences: `POST /workflow-drafts/from-business-understanding` should default to strict generation, return generator blockers as safe response data for valid request shapes, and provide only an informational `runtimePreviewHint`. Runtime sessions, Telegram preview connections, persistence, crawling, RAG, AI providers, ecommerce, and restaurant workflows remain deferred.
Revisit trigger: API review proves the response contract is insufficient for Studio review, runtime preview handoff, or publish-readiness modeling.

## 2026-06-30: Prove First Internal Vertical Slice With Smoke Tests

Decision: TASK-005D should prove `BusinessUnderstanding -> workflow draft API -> Runtime Test Loop -> Telegram Preview Mock` through deterministic smoke tests only.
Reason: The accepted package and API boundaries now exist, and a vertical proof reduces integration risk without adding product orchestration or external services.
Consequences: The smoke can assert manual chaining, blocked-generation behavior, session isolation, traces, and no required provider/channel/database keys. Production orchestration, persistence, crawling, RAG, AI providers, live Telegram, auth, Studio UI, and exporters remain deferred.
Revisit trigger: A later task adds production orchestration, durable state, real channels, or UI-driven preview.

## 2026-06-30: Plan Document Ingestion With Text/Markdown First

Decision: TASK-006 should remain planning-only and recommend TASK-006A as `SourceDocument` model plus text/markdown ingestion before PDF, upload endpoints, parser dependencies, durable storage, RAG, crawling, or AI extraction.
Reason: Document ingestion introduces untrusted input, parser, privacy, PII, source-reference, and conflict risks. Text and markdown provide a narrow first implementation path with lower parser surface.
Consequences: PDF parsing requires a separate parser/security review. Document ingestion should produce source-backed evidence and sourceRefs for later BusinessUnderstanding/BusinessGraph extraction, not Workflow JSON, runtime sessions, Telegram adapters, RAG indexes, or provider calls.
Revisit trigger: TASK-006A text/markdown ingestion is accepted, or a customer requirement justifies a PDF parser spike with documented dependency and security evaluation.

## 2026-06-30: Implement SourceDocument Text/Markdown Foundation

Decision: TASK-006A should introduce `packages/source-ingestion` as the package-local SourceDocument boundary for text and markdown input objects only.
Reason: A dedicated package keeps untrusted source handling separate from workflow DSL, runtime, generator, API routes, and channel adapters while preserving sourceRefs for later BusinessUnderstanding/BusinessGraph extraction.
Consequences: The package supports `.txt`, `.md`, and `.markdown` validation, normalization, content hashes, sourceRefs, and safe rejection reports. Upload endpoints, PDF/DOCX parsing, parser dependencies, durable storage, RAG, crawling, AI extraction, and API wiring remain deferred.
Revisit trigger: TASK-006A is accepted and a follow-up explicitly starts review integration, upload API design, or parser evaluation.

## 2026-06-30: Prioritize Visible MVP Demo

Decision: The next delivery should prove the visible product path with `pnpm demo:flowai`, not continue adding invisible infrastructure.
Reason: The owner needs to see whether FlowAI is on the right product path through real local output: source document, sourceRefs, extracted facts, workflow plan, workflow summary, runtime conversation, and Telegram mock output.
Consequences: `packages/source-review` stays deterministic and narrow. AI extraction, upload endpoints, PDF parsing, crawling, RAG, persistence, Studio UI, WhatsApp, production Telegram, and exporters remain deferred until the visible flow is reviewed.
Revisit trigger: Owner reviews the visible MVP demo and decides whether deterministic extraction should be expanded, simplified, or replaced with AI-assisted extraction.

## 2026-07-01: Shift To Owner-First AI Builder Experience

Decision: Supersede the technical visible demo UX with an owner-first AI builder direction while preserving the safe FlowAI pipeline.
Reason: Owner review found the current local UI too technical for business owners. The product should feel like a smart chatbot-building assistant that understands the business, asks useful questions, builds a workflow, supports web decision-tree editing, previews channels, and exports portable JSON/API mappings.
Consequences: TASK-010 formalizes the AI builder orchestration, agents, tools, prompt pack, ProductCatalog draft, IntegrationMappingPlan, and UX flow before implementation. The old FlowAI repo remains reference-only for product feel, not code or architecture. Live AI provider calls, upload endpoints, crawling, RAG, persistence, WhatsApp, visual editor dependencies, and exporters still require explicit tasks and approval.
Revisit trigger: TASK-011 and TASK-012 prove whether the owner-first UI plus mocked/structured AI orchestration produces a better product review than the technical demo.

## 2026-07-01: Owner-First UI Starts With Deterministic Local Shell

Decision: Implement TASK-011 as a local owner-first builder UI shell backed by the existing deterministic pipeline before adding live AI provider calls.
Reason: The owner needs a visible product experience immediately, but provider integration should not precede structured prompts, mocked orchestration, sourceRefs, validation, and secret-safety boundaries.
Consequences: `apps/studio` can show the business-owner journey from pasted text to business brief, workflow proposal, runtime conversation, and Telegram mock preview. Live AI remains clearly labeled as pending. `.flowai.local.json` is still ignored and not read by application code.
Revisit trigger: TASK-012 adds prompt pack and mocked AI orchestration, or owner review shows the UI shell still does not match the intended product path.

## 2026-07-01: Mock AI Orchestration Before Live Provider Calls

Decision: Add `packages/ai-builder-orchestrator` with prompt pack files, provider interface, mocked provider tests, structured output validation, deterministic fallback, and sourceRef-gated product catalog blockers before any live AI provider integration.
Reason: FlowAI needs smart AI behavior, but live provider calls must not precede source-backed schemas, redaction, malformed-output fallback, and tests that prove AI cannot bypass WorkflowGenerationPlan, validation, or product-claim safety.
Consequences: Studio can reference the AI builder orchestrator prompt pack while still using deterministic fallback. `.flowai.local.json` remains ignored and unread. Live OpenAI integration remains a later approved task.
Revisit trigger: A live provider task is approved and implements backend-only secret loading, structured output parsing, provider error handling, and non-CI smoke checks.

## 2026-07-01: Product Catalog Workspace Is Review-First

Decision: TASK-013 exposes Product Catalog Review in Studio using deterministic source-backed catalog drafts and product inquiry guardrails, while keeping product recommendations, prices, and availability review-required unless sourceRefs exist.
Reason: Businesses with many products or service packages need a visible catalog workspace before FlowAI can build trustworthy product-question workflows. The system must not invent product facts, current prices, stock, or recommendations.
Consequences: Catalog items can be reviewed with sourceRefs, confidence labels, missing questions, and blockers. Deterministic extraction remains shallow and is not ecommerce parsing, live inventory, RAG, or AI recommendation behavior.
Revisit trigger: A later task adds AI extraction, stronger source freshness/conflict handling, product editing persistence, or live inventory/API integrations.

## 2026-07-01: Visual Editor Uses Workflow JSON Directly

Decision: TASK-014 implements a simple local visual workflow editor without adding a graph dependency, and every edit operates on strict Workflow JSON followed by validation and preview reruns.
Reason: The owner needs visible tree editing now, but adding React Flow/Xyflow or persistence before the product shape is accepted would expand scope and dependency risk.
Consequences: Studio can inspect, edit text, add/delete/connect preview nodes, show validation issues, and rerun runtime/Telegram mock previews from edited JSON. The editor is local preview-only and not a durable publish workflow.
Revisit trigger: A later task requires production-grade graph layout, persisted edits, collaborative editing, or richer node/edge editing.

## 2026-07-01: Channel Preview Workspace Uses Runtime Output Only

Decision: TASK-015 renders web chat, Telegram mock, and WhatsApp mock previews from the same channel-neutral runtime output.
Reason: Owners need to compare how one chatbot workflow will feel across channels without introducing live channel credentials, webhooks, or channel-owned workflow logic.
Consequences: Studio can show mock channel constraints and runtime trace side by side. Telegram and WhatsApp remain preview-only; no bot token, phone number, webhook, network delivery, or production channel behavior is implemented.
Revisit trigger: A later task explicitly adds live Telegram, live WhatsApp, channel credential handling, or production publish semantics.

## 2026-07-01: Export Hub Is Copy-Ready Mapping, Not Live Integration

Decision: TASK-016 implements FlowAI JSON, CRM mapping, and ticketing mapping as local copy-ready artifacts.
Reason: Owners and technical buyers need to see how generated workflows can leave FlowAI and fit CRM/ticketing/chatbot systems before live integrations or platform-specific exporters are added.
Consequences: Exporters validate workflow JSON, sanitize secret-like channel settings, and report unsupported webhook/action/AI/RAG nodes. No CRM credentials, ticketing credentials, webhooks, external API calls, persistence, or deployment behavior is implemented.
Revisit trigger: A later task explicitly adds a target-system exporter, live integration credentials, webhook delivery, or production publish semantics.

## 2026-07-01: Plan Live AI Provider Before Calling It

Decision: TASK-017 should define a backend-only live AI provider boundary before any provider implementation reads local keys, adds SDK dependencies, or calls OpenAI.
Reason: The owner wants smarter AI behavior, but provider integration is security-sensitive and can weaken sourceRefs, Workflow JSON safety, and deterministic fallback if added directly inside the UI or generator.
Consequences: The first live use case should be BusinessUnderstanding extraction/refinement only. AI may improve source-backed summaries, services, FAQs, missing questions, and product catalog drafts, but the deterministic generator still owns WorkflowGenerationPlan and final WorkflowDefinition creation. Provider access must be disabled by default, mocked in CI, sanitized in diagnostics, and configured only through backend-only secret handling after explicit implementation approval.
Revisit trigger: TASK-017A proves backend-only OpenAI extraction with mocked tests and an optional local non-CI smoke test without leaking secrets or allowing AI-generated Workflow JSON.

## 2026-07-01: First Live AI Spike Is Backend-Only Extraction

Decision: TASK-017A implements the first OpenAI integration as a backend-only Responses API adapter inside `packages/ai-builder-orchestrator`, using strict structured output for BusinessUnderstanding refinement only.
Reason: The owner needs smarter AI behavior, but the safest first step is a narrow provider boundary that can be mocked in CI and locally smoke-tested without wiring secrets into the browser or letting AI own Workflow JSON.
Consequences: The provider is disabled unless configured, reads ignored local config only when explicitly allowed, adds no SDK dependency, sanitizes provider failures, and falls back to deterministic extraction. `gpt-5.5` can be selected by local config for quality, but model choice remains backend configuration rather than a permanent architecture assumption. Studio live AI wiring, uploads, persistence, crawling, RAG, live channels, and production deployment remain separate tasks.
Revisit trigger: TASK-018 wires the provider into Studio behind an explicit review/status control, or live smoke shows structured extraction is not good enough for owner review.

## 2026-07-01: Studio Live AI Review Requires Explicit Toggle

Decision: TASK-018 exposes live AI review in Studio only through an owner-controlled toggle that calls backend-only provider code.
Reason: Live AI should make the product feel smarter, but provider credentials and AI behavior must remain outside browser code and outside final Workflow JSON generation.
Consequences: Studio defaults to deterministic fallback. When live AI is requested, the server may use ignored local provider config and return a review draft with clear status. WorkflowGenerationPlan and WorkflowDefinition remain deterministic and validator-backed.
Revisit trigger: Owner review confirms whether live AI output improves the builder experience enough to justify richer extraction, product catalog review, or follow-up agent tools.

## 2026-07-01: Owner Demo Compares Deterministic And Live AI Review

Decision: TASK-019 generates a Markdown owner-review artifact from `pnpm demo:flowai:live`.
Reason: The owner needs a concrete artifact showing what the brain does now, what AI improves, and what is still deterministic or deferred.
Consequences: The demo compares deterministic extraction with live AI review using local ignored provider config when available. The artifact must not contain provider secrets, and Workflow JSON remains deterministic and validator-backed.
Revisit trigger: Owner review shows the live AI output is not materially better than deterministic extraction or the UI still feels too technical.

## 2026-07-02: Document Intelligence Starts With SourceRefs, Not RAG First

Decision: TASK-020 evaluates OCR/PDF parsing, cloud extraction, RAG/vector search, crawling, and catalog extraction as a document intelligence layer that must first produce safe extracted chunks and stable sourceRefs.
Reason: FlowAI needs source-backed business and catalog facts before retrieval. Starting with a vector database would make it too easy to answer from opaque chunks without traceable evidence, freshness, conflict handling, or review gates.
Consequences: LeapAI-SA/leap-ocr-platform is an internal OCR/extraction reference and possible service adapter candidate, not a direct code-copy source. MinerU, Docling, and PaddleOCR are local PDF/OCR candidates; Google Document AI is a separate cloud extraction candidate; OpenAI Vector Stores/File Search is a later hosted RAG candidate after chunks/sourceRefs exist; Crawl4AI and Crawlee are later crawling candidates. No dependency, provider credential, upload endpoint, parser, vector store, RAG runtime, crawler, or LeapOCR code reuse is approved by this decision.
Revisit trigger: TASK-020A proves the extracted document contract and fixture harness, or a parser/cloud/RAG/crawler spike produces evidence that the ordering should change.

## 2026-07-02: ExtractedDocument Is The OCR Boundary

Decision: TASK-020A introduces `ExtractedDocument` as the boundary between future OCR/parser providers and FlowAI source review.
Reason: FlowAI needs to prove the product path using OCR-like output without waiting for real OCR integration or importing the LeapOCR platform into the monorepo.
Consequences: OCR/parser candidates should map pages, blocks, tables, entities, confidence, and language into `ExtractedDocument`, which then becomes `SourceDocument`, chunks, and sourceRefs. FlowAI workflow generation remains downstream of source review and BusinessUnderstanding. No OCR, PDF parser, upload endpoint, RAG, crawling, cloud provider, persistence, or LeapOCR code reuse is approved by this decision.
Revisit trigger: TASK-020B evaluates real OCR/parser output and shows the contract needs richer page/block locators or provider-specific metadata.

## 2026-07-02: Use OpenAI Vector Stores For First Hosted RAG Adapter

Decision: TASK-020B implements a narrow backend OpenAI Vector Stores adapter over existing `SourceDocument` chunks and sourceRefs.
Reason: The owner approved using the existing OpenAI key path for RAG, and TASK-020A already provides a sourceRef-backed extracted document boundary. This lets FlowAI prove catalog/knowledge retrieval without adding a self-hosted vector DB, crawler, OCR dependency, or upload system yet.
Consequences: RAG can create, search, and clean up a hosted vector store for MVP smoke/testing. It remains downstream of extraction and source review. Retrieval results must not become the source of truth for catalog prices, availability, recommendations, medical/legal claims, or final Workflow JSON decisions without review gates. Production use still needs retention, deletion, tenant isolation, billing, privacy, and citation policy.
Revisit trigger: OCR/parser spike shows sourceRefs need richer locators, OpenAI retrieval quality is insufficient, hosted retention/privacy is unacceptable, or a production requirement justifies a self-hosted vector database.

## 2026-07-02: Visible System Trial Before More Invisible Infrastructure

Decision: TASK-021 should make Studio show one complete owner-facing trial across sourceRefs, business understanding, catalog review, optional RAG evidence, checklist, workflow, runtime, channel previews, and export.
Reason: The owner wants to judge whether FlowAI feels like the right product, not review isolated backend proofs. The fastest useful path is to expose the existing safe pipeline in one visible local flow and clearly label the missing production pieces.
Consequences: Studio may call backend-only live AI and OpenAI Vector Stores only when explicitly enabled. Website mode accepts pasted website text plus an optional URL reference; it does not crawl. OCR/PDF, upload, crawling, persistence, auth/tenants, live Telegram/WhatsApp, and production RAG lifecycle remain separate tasks.
Revisit trigger: Owner trial shows the UI still does not match the desired chatbot-builder experience, or OCR/parser/crawler integration becomes the next unavoidable blocker.

## 2026-07-02: Use Crawlee For First Website Crawler

Decision: TASK-022 uses Crawlee `CheerioCrawler` for the first real website crawling path.
Reason: Crawlee is TypeScript, Apache-2.0, current, and fits the monorepo without adding a Python/Docker service. `CheerioCrawler` provides a lower-risk HTTP/HTML crawl path before browser automation.
Consequences: Studio can crawl bounded same-origin public http/https pages into a website SourceDocument/sourceRefs. Private-network targets are blocked by default. Crawl4AI remains a strong later candidate for LLM-friendly Markdown, screenshots, PDFs, Docker service deployment, and JS-heavy crawling, but it is not the first dependency because it expands operational and security scope.
Revisit trigger: Real customer sites require JavaScript rendering, Crawl4AI-style Markdown quality, deep crawling, authenticated sessions, or production crawling policy.

## 2026-07-02: Crawl URL Should Build A Visible Owner Preview

Decision: TASK-023 adds a Studio crawl-build path that runs bounded website crawl output through the existing owner-first preview, optional live AI review, optional OpenAI RAG search, workflow generation, runtime test, channel previews, and export blocks.
Reason: The owner needs to paste a URL and see the full FlowAI product path, not inspect crawler output as a separate technical artifact.
Consequences: `/api/crawl-preview` remains available for raw crawl inspection, while `/api/crawl-build` is the owner-visible path. Crawled sources are marked separately from pasted website text so the checklist only claims website crawling when the crawler actually ran. This remains a local review flow, not production crawling, persistent ingestion, OCR/PDF parsing, browser rendering, live channel delivery, or RAG source-of-truth behavior.
Revisit trigger: Owner testing shows crawler output is too weak for real websites, or the next task needs browser-rendered/Crawl4AI-style crawling fixtures.
