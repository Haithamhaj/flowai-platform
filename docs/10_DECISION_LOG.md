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
