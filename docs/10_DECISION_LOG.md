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
