# TASK-010: Owner-First AI Builder Orchestration

Status: planned
Owner/Agent: Codex
Context shards: `product.md`, `architecture.md`, `business-understanding.md`, `security.md`

## Goal

Turn the accepted owner-first product direction into a concrete AI builder orchestration contract before implementation.

The orchestration path is:

```text
owner conversation / pasted source text / later documents and website
-> SourceDocument / sourceRefs
-> BusinessUnderstanding draft
-> ProductCatalog draft
-> missing questions
-> WorkflowGenerationPlan
-> strict Workflow JSON DSL draft
-> validation
-> runtime test loop
-> channel preview descriptors
-> portable export and integration mapping plan
```

This task is planning/spec only. It does not call an AI provider, add dependencies, add upload endpoints, add persistence, add crawling, add RAG, add Studio UI, add WhatsApp, or change the Workflow DSL/runtime contracts.

## Why Now

The visible MVP proved the safe internal pipeline, but the owner review showed the current user experience is too technical. FlowAI needs to feel like a smart builder for business owners, not a JSON/demo dashboard.

The old FlowAI reference validates the product direction: chat-first builder, follow-up questions, document input, decision tree, channel preview, and export/deployment. The old implementation remains reference-only because it included unsafe executable flow strings, hardcoded tokens, and mixed boundaries.

TASK-010 defines how to recover the owner-facing product feel while preserving the safe new architecture.

## Non-Goals

- No live OpenAI call.
- No provider SDK or dependency.
- No use of `.flowai.local.json` in application code yet.
- No upload endpoint or file storage.
- No PDF/DOCX parser.
- No website crawler.
- No RAG, embeddings, vector DB, or retrieval runtime.
- No persistence/database.
- No auth, tenants, billing, or production deployment.
- No live Telegram polling/webhooks.
- No WhatsApp integration.
- No visual workflow editor implementation.
- No exporters implementation.
- No Workflow DSL or runtime semantic change.

## Orchestration Units

### 1. AI Builder Orchestrator

Purpose:

- Own the builder session state.
- Decide which specialized agent should run next.
- Keep the user conversation natural and business-owner friendly.
- Convert every AI or deterministic output into reviewable structured artifacts.

Inputs:

- User message.
- Language hint.
- Current `SourceDocument` list.
- Current `BusinessUnderstanding` draft.
- Current `ProductCatalogDraft`.
- Current `WorkflowGenerationPlan`.
- Current validation and runtime preview results.

Outputs:

- Next assistant message.
- Updated artifact drafts.
- Missing questions.
- Suggested user actions.
- Safe tool calls to deterministic package boundaries.

Rules:

- Never write secrets to workflow, business understanding, logs, traces, or preview descriptors.
- Never bypass `validateWorkflow()`.
- Never generate executable conditions or JavaScript expressions.
- Ask one high-value missing question at a time.

### 2. Business Interview Agent

Purpose:

- Understand the business from owner conversation.
- Ask follow-up questions in Arabic or English as appropriate.
- Identify services, products, policies, forms, handoff rules, and unknowns.

Key behavior:

- Produce source-backed facts when sourceRefs exist.
- Mark conversation-only facts as owner-provided.
- Separate facts from assumptions.
- Prefer clarification over inventing.

### 3. Source Understanding Agent

Purpose:

- Review accepted source text and later parsed documents.
- Convert safe text into evidence candidates for BusinessUnderstanding.

Key behavior:

- Preserve `sourceRefs`.
- Report conflicts instead of resolving silently.
- Avoid product, price, policy, availability, or recommendation claims without source evidence.

### 4. Product Catalog Agent

Purpose:

- Handle businesses with multiple products or service packages.
- Extract catalog-like facts into a reviewable draft.

Key behavior:

- Track product names, categories, descriptions, prices, availability, eligibility, and source confidence.
- Mark stale, missing, or conflicting product facts.
- Block product recommendation workflows when evidence is insufficient.

### 5. Workflow Planner Agent

Purpose:

- Convert reviewed business understanding into a `WorkflowGenerationPlan`.
- Choose safe templates and planned capabilities.

Key behavior:

- Use existing deterministic generator boundaries first.
- Generate a plan before Workflow JSON.
- Expose blockers before publish.
- Treat `targetChannel` as a preview/export hint, not as runtime ownership.

### 6. Workflow Critic Agent

Purpose:

- Review generated workflow drafts before owner preview.

Key behavior:

- Run validation.
- Identify unsupported claims.
- Identify missing handoff/refusal policies.
- Identify channel-preview limitations.
- Recommend precise fixes, not broad rewrites.

### 7. Channel Preview Agent

Purpose:

- Convert validated workflow behavior into web, Telegram mock, and later WhatsApp mock preview descriptors.

Key behavior:

- Preview only; no production channel claim.
- Show unsupported channel behavior clearly.
- Keep channel adapters out of runtime ownership.

### 8. Integration Mapper Agent

Purpose:

- Prepare portable integration mapping plans for CRM, ticketing, and chatbot platforms.

Key behavior:

- Map fields, nodes, events, handoff routes, and required external capabilities.
- Report unmapped behavior.
- Never inject credentials or executable integration code.

## Tool Contract

The orchestrator may eventually call these tools. TASK-010 only defines them.

| Tool | Purpose | Boundary |
| --- | --- | --- |
| `ingest_source_text` | Convert text/markdown input into `SourceDocument` | Deterministic, existing source-ingestion package |
| `review_source_document` | Produce source-backed fact candidates | Deterministic first, AI-assisted later |
| `extract_business_facts` | Draft/update BusinessUnderstanding | Structured AI output plus validator |
| `extract_product_catalog` | Draft ProductCatalog facts | Requires sourceRefs for claims |
| `list_missing_questions` | Choose next owner question | One question at a time |
| `propose_workflow_plan` | Draft WorkflowGenerationPlan | Must expose blockers |
| `generate_workflow_draft` | Create strict Workflow JSON draft | Existing generator boundary |
| `validate_workflow` | Validate DSL | Existing workflow-dsl package |
| `simulate_conversation` | Test runtime path | Existing runtime-core/test API boundary |
| `render_channel_preview` | Produce preview descriptors | Existing/future channel adapters |
| `export_flowai_json` | Produce portable FlowAI export | Future exporter task |
| `map_to_crm` | Produce CRM mapping plan | Future exporter/integration task |
| `map_to_ticketing` | Produce ticketing mapping plan | Future exporter/integration task |

Tool outputs must be strict JSON-compatible data. Tool outputs must not contain executable workflow strings, function bodies, hidden prompts, credentials, or private reasoning.

## Prompt Pack Specification

Prompt files should be created in a later implementation task, likely under `packages/ai-builder-orchestrator/prompts/`.

Required prompts:

- `system.md`: project identity, safety rules, strict JSON boundaries, source-backed claims.
- `builder-conversation.md`: business-owner conversation style, Arabic/English behavior, one question at a time.
- `business-extraction.md`: BusinessUnderstanding draft extraction with facts, assumptions, unknowns, and sourceRefs.
- `product-catalog.md`: product/service catalog extraction with price/availability safety.
- `workflow-planning.md`: WorkflowGenerationPlan creation with blockers and capability mapping.
- `workflow-critic.md`: validation, claim review, safety review, and owner-facing fix suggestions.
- `integration-mapping.md`: CRM/ticketing/export mapping plan without credentials or executable code.

Prompt rules:

- Prompts must require structured output.
- Prompts must forbid secrets in output.
- Prompts must require sourceRefs for product, price, policy, availability, recommendation, and claim-like facts.
- Prompts must tell the model to return blockers instead of inventing missing facts.
- Prompts must not ask the model to produce JavaScript, arbitrary expressions, or executable workflow conditions.
- Prompts must treat generated Workflow JSON as draft-only until validated.

## Model Routing Recommendation

The local ignored `.flowai.local.json` can hold model preferences for development, but application code must not read it until a later approved AI provider task.

Recommended routing for best quality:

- Builder orchestrator: highest-quality reasoning model.
- Workflow planner: highest-quality reasoning model.
- Workflow critic: highest-quality reasoning model.
- Business extraction: high-quality model with medium reasoning.
- Product catalog: high-quality model with medium reasoning.
- Customer/channel preview copy: faster/lower-reasoning model is acceptable after quality gates.

Model names must be configurable. Code must not hardcode a single future model name as an architectural assumption.

## Data Models To Specify In Implementation

### ProductCatalogDraft

Required fields:

- `catalogId`
- `language`
- `items`
- `unknowns`
- `conflicts`
- `sourceRefs`
- `reviewStatus`

Each item should support:

- `id`
- `name`
- `type`
- `category`
- `description`
- `price`
- `availability`
- `eligibility`
- `questionsToAsk`
- `sourceRefs`
- `confidence`
- `conflictStatus`

### IntegrationMappingPlan

Required fields:

- `targetSystem`
- `workflowId`
- `fieldMappings`
- `nodeMappings`
- `handoffMappings`
- `unsupportedBehaviors`
- `requiredExternalCapabilities`
- `exportWarnings`

The mapping plan is descriptive. It must not contain credentials or executable integration scripts.

## UX Flow Contract

The owner-facing UI should use these stages:

1. AI Builder Chat.
2. Business Brain Review.
3. Workflow Builder Proposal.
4. Visual Workflow Editor.
5. Runtime and channel preview.
6. Export and integration hub.

The next implementation should not start with a generic dashboard. It should start with an owner conversation plus a live business artifact.

## Skill/MCP Readiness

- Task type: docs, AI provider planning, product architecture.
- Skills/tools used: Superpowers `using-superpowers`, `brainstorming`, `writing-plans`; local repo inspection.
- Can proceed without extra tools: yes, because TASK-010 is docs/spec only.
- Missing tools worth recommending: none for TASK-010.
- Future implementation notes:
  - Use official OpenAI docs before provider integration.
  - Use Context7 or official docs before adding a UI graph/editor dependency.
  - Use browser/Playwright verification for owner-facing UI tasks.
  - Do not install dependencies without written dependency review.

## Acceptance Criteria

- AI builder agents are defined with clear responsibilities.
- Tool contract is defined without implementation.
- Prompt pack is specified.
- ProductCatalogDraft and IntegrationMappingPlan are specified.
- Security boundaries are explicit.
- The plan preserves the safe architecture:

```text
SourceDocument -> BusinessUnderstanding -> WorkflowGenerationPlan -> strict Workflow JSON DSL -> validation -> runtime -> preview/export
```

- The next task is exactly one implementation step.

## Verification Commands

Run:

```bash
git diff --check
```

Full tests/build are optional for this docs-only task. If any source files change, stop and report.

## Risks

- The team may jump directly to provider calls before mock/schema safety is ready.
- The UI may become a generic workflow builder instead of an owner-first AI builder.
- Product catalog extraction may overclaim prices or availability without source evidence.
- Provider configuration could leak secrets if not handled backend-only.
- Visual tree editing may drift from strict Workflow JSON if it creates a hidden UI model.

## Handoff Notes

Recommended next task: TASK-011_OWNER_FIRST_BUILDER_UI.

TASK-011 should implement the owner-first builder UI shell and deterministic fallback path first:

- chat-first owner workspace;
- live business brief;
- suggested follow-up questions;
- build-chatbot action;
- workflow proposal view;
- explicit AI unavailable/live AI pending state.

TASK-012 should add the mocked AI builder orchestrator and prompt pack after TASK-011 creates the correct product surface.
