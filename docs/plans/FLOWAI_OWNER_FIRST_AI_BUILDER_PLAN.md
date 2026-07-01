# FlowAI Owner-First AI Builder Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. This document is the operating reference for rebuilding FlowAI around an owner-first AI chatbot builder experience.

**Goal:** Turn FlowAI into a smart Business-to-Workflow Chatbot Generator where a business owner talks naturally with FlowAI, provides business context/documents/website input, gets a generated chatbot workflow, edits the decision tree on web, tests it, previews Telegram/WhatsApp, and exports workflow JSON/API mappings to other systems.

**Architecture:** Keep the safe FlowAI core: `SourceDocument -> BusinessUnderstanding -> WorkflowGenerationPlan -> strict Workflow JSON DSL -> validation -> runtime -> channel preview/export`. Replace the current technical dashboard-style demo with a chat-first owner workspace plus a visual workflow editor. AI may assist extraction and planning, but AI output must be structured, source-backed, validated, and never bypass `validateWorkflow()`.

**Tech Stack:** Current monorepo packages, backend-only OpenAI through local secret config, strict JSON workflow DSL, runtime-core, channel-adapters, future visual editor likely with React Flow/Xyflow only after dependency review.

---

## 1. Product Definition

FlowAI is not a generic prompt generator or manual flow builder. FlowAI is a product that helps a non-technical business owner create a working chatbot from business knowledge.

The primary user is:

- A clinic owner.
- A service company owner.
- A store owner with many products.
- A support/ticketing/CRM operator.
- A business team member who knows the business but does not know workflow JSON.

The user should experience FlowAI as:

> "I explain my business. FlowAI understands it, asks useful follow-up questions, builds a chatbot workflow, lets me edit the decision tree visually, lets me test the conversation, and gives me a portable JSON/API package I can use elsewhere."

## 2. Reference Lessons From Old FlowAI

The old repo at `/Users/haitham/development/flowai-backend-dev-Old` is reference-only.

Useful ideas to preserve:

- Chat-first bot builder experience.
- Floating/web widget concept.
- Follow-up prompts during creation.
- PDF/document input concept.
- Generated decision tree concept.
- Tree advisor concept.
- Web widget and channel preview concept.
- WhatsApp/CRM-style deployment direction.

Do not copy or preserve:

- Executable flow tree strings.
- `new Function`.
- `eval`.
- Zod schemas embedded as generated strings.
- Hardcoded WhatsApp tokens.
- Hardcoded localhost URLs.
- Loose `any` flow tree persistence.
- Channel-specific logic owning core runtime.

New FlowAI should be better than old FlowAI by combining the old product feel with the new safe architecture.

## 3. Target User Journey

### Stage A: Start With Conversation

The first screen should be a polished AI builder conversation.

The first prompt should feel like:

> "Tell me about the chatbot you want to build. You can describe your business, paste text, add products/services, or later attach a document or website."

The user can:

- Type a business description.
- Paste source text.
- Add products/services manually.
- Add a document later when upload safety is implemented.
- Add a website URL later when crawling is implemented.
- Continue in Arabic or English.

### Stage B: FlowAI Understands The Business

FlowAI extracts and shows:

- Business name.
- Business category.
- Services.
- Products/catalog.
- FAQs.
- Policies.
- Required fields.
- Handoff rules.
- Unknowns.
- Missing questions.
- SourceRefs and confidence.

This should be shown as a live artifact beside the chat, not as raw JSON.

### Stage C: FlowAI Asks Missing Questions

FlowAI should ask one useful question at a time.

Good questions:

- "Do you want the bot to collect name and phone before handing off?"
- "Should the bot allow appointment booking or only collect a request?"
- "For product questions, do you have prices and stock availability, or should the bot avoid those claims?"
- "When should the bot transfer to a human?"

Bad questions:

- Generic long forms.
- Technical questions about workflow nodes.
- Asking the owner to understand JSON.

### Stage D: Build Chatbot

When enough information exists, FlowAI proposes:

- Workflow scenarios.
- Required fields.
- Knowledge/source usage.
- Handoff behavior.
- Channel limitations.
- Missing blockers.

The user clicks:

- Build chatbot.
- Ask FlowAI to improve.
- Add more business info.

### Stage E: Web Decision Tree Editor

On web, the user can edit the generated tree.

Must support:

- Add node.
- Delete node.
- Edit node text.
- Edit button/quick reply labels.
- Connect node to node.
- Add condition/fallback.
- Mark handoff node.
- Preview path.
- See validation issues.

Workflow JSON remains source of truth. UI never becomes a separate hidden model.

### Stage F: Channel Preview

Telegram and WhatsApp cannot be visually edited like the web tree. They are preview/test surfaces.

They should show:

- Conversation preview.
- Buttons/quick replies where supported.
- Handoff behavior.
- AI answer behavior.
- Unsupported action warnings.

Labels must be clear:

- "Telegram mock preview, not production bot."
- "WhatsApp mock preview, not production WhatsApp."

### Stage G: Export And Integration

FlowAI must produce portable outputs:

- FlowAI Workflow JSON DSL.
- WorkflowGenerationPlan.
- BusinessUnderstanding JSON.
- ProductCatalog JSON.
- CRM/ticketing mapping JSON.
- Channel preview descriptors.
- API contract for external systems.

This lets FlowAI integrate with:

- CRM systems.
- Ticketing systems.
- Internal chatbot platforms.
- Future Leap/chatbot exporters.

## 4. Product Screens

### Screen 1: AI Builder Chat

Layout:

- Left/main: owner conversation with FlowAI.
- Right: live business brief artifact.
- Bottom/right action: "Build chatbot".

Core UI elements:

- Chat input.
- Attach/paste source controls.
- Suggested replies.
- AI status.
- Language indicator.
- Missing-question cards.

### Screen 2: Business Brain Review

Purpose: show what FlowAI understood before building.

Panels:

- Business profile.
- Services.
- Products/catalog.
- FAQs.
- Policies.
- Handoff rules.
- Missing questions.
- Source evidence.

Everything user-facing should be editable.

### Screen 3: Workflow Builder Proposal

Purpose: show the plan before generating/editing the tree.

Panels:

- Selected scenarios.
- Required fields.
- Capabilities.
- Blockers.
- Warnings.
- Why this workflow was chosen.

### Screen 4: Visual Workflow Editor

Purpose: edit chatbot decision tree.

Panels:

- Canvas.
- Node inspector.
- Validation panel.
- Test path panel.
- JSON export drawer.

### Screen 5: Test And Channel Preview

Tabs:

- Web chat test.
- Telegram mock.
- WhatsApp mock.
- Runtime trace.

### Screen 6: Export Hub

Outputs:

- FlowAI JSON.
- CRM mapping JSON.
- Ticketing mapping JSON.
- API package.
- Channel descriptors.

## 5. AI System Architecture

AI must be tool-using and structured. Do not build one huge prompt that directly generates final workflows.

### 5.1 AI Builder Orchestrator

Responsibility:

- Owns conversation with the business owner.
- Decides which specialist agent/tool to call.
- Asks missing questions.
- Presents business understanding.
- Requests confirmation before building workflow.

It does not directly produce executable workflow JSON.

### 5.2 Agents

#### Business Interview Agent

Extracts:

- Business profile.
- Goals.
- Services.
- Policies.
- Handoff requirements.
- Required customer data.

#### Source Understanding Agent

Extracts from source text/documents/web pages:

- SourceDocument facts.
- SourceRefs.
- Evidence excerpts.
- Conflicts.
- Unknowns.

#### Product Catalog Agent

Handles businesses with many products.

Extracts:

- Product names.
- Categories.
- Descriptions.
- Prices when source-backed.
- Availability when source-backed.
- Variants/options.
- Recommendation constraints.
- Freshness warnings.

Must not invent products, prices, availability, or comparisons.

#### Workflow Planner Agent

Converts BusinessUnderstanding + ProductCatalog into a WorkflowGenerationPlan:

- Scenarios.
- Required fields.
- Handoff nodes.
- FAQ paths.
- Product inquiry paths.
- Channel preview needs.

#### Workflow Critic Agent

Reviews before generation:

- Missing source evidence.
- Unsupported product claims.
- Missing handoff rules.
- Conflicts.
- Unsafe medical/legal/financial claims.
- Channel limitations.

#### Channel Preview Agent

Formats previews for:

- Web chat.
- Telegram mock.
- WhatsApp mock.

It does not own core workflow logic.

#### Integration Mapper Agent

Maps FlowAI output to external systems:

- CRM lead schema.
- Ticketing issue schema.
- Generic chatbot platform import schema.
- Webhook/action placeholders.

It should produce mapping plans first, not live integrations.

### 5.3 Tools

Initial tool set:

- `ingest_source_text(input) -> SourceDocument`
- `review_source_document(sourceDocument) -> SourceDocumentReview`
- `extract_business_facts(sourceDocument) -> BusinessFactsDraft`
- `extract_product_catalog(sourceDocument | businessText) -> ProductCatalogDraft`
- `list_missing_questions(businessUnderstanding, productCatalog) -> MissingQuestion[]`
- `propose_workflow_plan(businessUnderstanding, productCatalog) -> WorkflowGenerationPlan`
- `generate_workflow_draft(workflowPlan) -> WorkflowDefinition`
- `validate_workflow(workflowDefinition) -> ValidationResult`
- `simulate_conversation(workflowDefinition, scenario) -> RuntimeTranscript`
- `render_channel_preview(workflowDefinition, channel) -> ChannelPreview`
- `export_flowai_json(workflowDefinition) -> JSON`
- `map_to_crm(workflowDefinition, targetSchema) -> MappingPlan`
- `map_to_ticketing(workflowDefinition, targetSchema) -> MappingPlan`

Future tools:

- `parse_uploaded_document(file)`
- `crawl_website(url)`
- `retrieve_source_answer(query)`
- `publish_telegram_bot(config)`
- `publish_whatsapp_bot(config)`

## 6. Prompt Pack

Prompts must live in maintainable files and be covered by tests with mocked providers.

### System Prompt

Purpose:

- Define FlowAI as a Business-to-Workflow Chatbot Generator.
- Require source-backed outputs.
- Ban invented claims.
- Require structured JSON for tool outputs.
- Keep workflow JSON strict and safe.

### Builder Conversation Prompt

Behavior:

- Warm, concise, business-owner friendly.
- Ask one question at a time.
- Avoid technical terms unless user asks.
- Keep progress visible.
- Use Arabic if user writes Arabic.

### Business Extraction Prompt

Output:

- Business profile.
- Services.
- FAQs.
- Policies.
- Required fields.
- Handoff rules.
- SourceRefs.
- Confidence.
- Unknowns.

### Product Catalog Prompt

Output:

- Product catalog only when source supports it.
- Price/availability only with evidence.
- Missing catalog questions when evidence is absent.

### Workflow Planning Prompt

Output:

- WorkflowGenerationPlan only.
- Scenarios.
- Required fields.
- Channel constraints.
- Blockers.
- Warnings.

### Critic Prompt

Output:

- Approve.
- Needs more questions.
- Block workflow generation.
- Downgrade unsafe claims.

### Integration Mapping Prompt

Output:

- Mapping plan.
- Required external fields.
- Unsupported mappings.
- API/export recommendations.

## 7. Core Data Models

### ProductCatalogDraft

Recommended shape:

```json
{
  "id": "catalog_demo",
  "businessUnderstandingId": "bu_demo",
  "products": [
    {
      "id": "product_1",
      "name": "Product name",
      "category": "Category",
      "description": "Source-backed description",
      "price": {
        "amount": 10,
        "currency": "USD",
        "sourceRefs": ["source_ref_id"],
        "freshness": "unknown"
      },
      "availability": {
        "status": "unknown",
        "sourceRefs": []
      },
      "variants": [],
      "recommendationRules": [],
      "sourceRefs": ["source_ref_id"],
      "confidence": 0.8
    }
  ],
  "warnings": [],
  "missingQuestions": []
}
```

### IntegrationMappingPlan

Recommended shape:

```json
{
  "id": "mapping_demo",
  "targetSystem": "crm",
  "workflowId": "wf_demo",
  "objects": [
    {
      "source": "collectedFields.phone",
      "target": "lead.phone",
      "required": true
    }
  ],
  "unsupportedFields": [],
  "requiredConfiguration": [],
  "warnings": []
}
```

## 8. Task Graph

### TASK-010: Owner-First AI Builder Orchestration Plan

Objective:

- Formalize AI builder orchestration, agents, tools, prompts, data models, and UX flow.

Scope:

- Docs/spec only.
- No provider implementation.
- No new dependencies.

Files likely touched:

- `docs/plans/FLOWAI_OWNER_FIRST_AI_BUILDER_PLAN.md`
- `docs/tasks/TASK-010_OWNER_FIRST_AI_BUILDER_ORCHESTRATION.md`
- `project-state/PROJECT_STATE.md`
- `project-state/TASK_GRAPH.md`
- `docs/10_DECISION_LOG.md`

Acceptance criteria:

- Agents and tools are clearly defined.
- Prompt pack is specified.
- ProductCatalog and IntegrationMappingPlan are specified.
- Clear next implementation task is identified.

Tests:

- `git diff --check`

Expected PR title:

- `TASK-010: Plan owner-first AI builder orchestration`

### TASK-011: Owner-First Builder UI

Objective:

- Replace technical dashboard with chat-first business owner workspace.

Scope:

- Web UI first.
- Conversation panel.
- Live business brief.
- Suggested replies.
- Build chatbot action.
- Deterministic fallback pipeline.

Non-goals:

- No real upload endpoint.
- No crawling.
- No production AI publish.
- No persistence/auth.

Files likely touched:

- `apps/flowai-studio-preview/` or `apps/studio/`
- `docs/demo/FLOWAI_PRODUCT_REVIEW_UI.md`
- `project-state/PROJECT_STATE.md`

Acceptance criteria:

- First screen is owner conversation, not JSON/dashboard.
- User can describe business and see business brief update.
- Arabic input produces Arabic-facing UI text where practical.
- Build chatbot leads to workflow proposal.
- AI unavailable state is clear.

Tests:

- UI pipeline tests.
- Browser verification.
- `CI=true pnpm test`
- `CI=true pnpm build`

Expected PR title:

- `TASK-011: Build owner-first chatbot builder UI`

### TASK-012: AI Builder Prompt Pack And Mocked Orchestrator

Objective:

- Add backend-only AI orchestration interface with mocked provider tests.

Scope:

- Prompt files.
- Provider interface.
- Mock AI outputs.
- Schema validation.
- AI disabled fallback.

Non-goals:

- No live provider requirement in CI.
- No direct workflow generation by AI.

Files likely touched:

- `packages/ai-builder-orchestrator/`
- `packages/business-understanding/`
- `packages/source-review/`
- `apps/flowai-studio-preview/`

Acceptance criteria:

- AI can produce structured BusinessUnderstanding draft in tests.
- Malformed AI output falls back safely.
- Product/pricing claims require source evidence.
- No secrets in logs/workflow/traces.

Tests:

- AI disabled fallback.
- Mocked success.
- Malformed output fallback.
- Product catalog blocker.
- Secret leakage scan.

Expected PR title:

- `TASK-012: Add mocked AI builder orchestration`

### TASK-013: Product Catalog Workspace

Objective:

- Support businesses with many products without inventing product facts.

Scope:

- ProductCatalogDraft model.
- UI catalog review.
- Source-backed product extraction.
- Product inquiry workflow planning.

Non-goals:

- No live inventory integration.
- No price recommendations without sourceRefs.

Files likely touched:

- `packages/business-understanding/`
- `packages/source-review/`
- `packages/workflow-generator/`
- `apps/flowai-studio-preview/`

Acceptance criteria:

- Product catalog is visible and editable.
- Price/availability show source confidence.
- Missing catalog blocks recommendation workflows.

Tests:

- Multi-product fixture.
- Missing price/availability blocker.
- Product inquiry workflow plan.

Expected PR title:

- `TASK-013: Add product catalog review workspace`

### TASK-014: Visual Workflow Editor

Objective:

- Let owner edit chatbot decision tree on web.

Scope:

- Canvas/editor.
- Add/delete/edit/connect nodes.
- Node inspector.
- Validation panel.
- Test selected path.

Non-goals:

- No UI-owned workflow model.
- No unsafe expressions.

Files likely touched:

- `apps/studio/` or `apps/flowai-studio-preview/`
- `packages/workflow-dsl/`
- `packages/workflow-generator/`

Acceptance criteria:

- Edits update strict Workflow JSON.
- Invalid workflows show validation errors.
- Runtime test uses edited workflow.
- Channel previews use edited workflow.

Tests:

- Add node.
- Delete node.
- Edit text.
- Connect nodes.
- Invalid graph validation.
- Browser screenshots.

Expected PR title:

- `TASK-014: Add visual workflow tree editor`

### TASK-015: Channel Preview Workspace

Objective:

- Preview generated workflow as web, Telegram mock, and WhatsApp mock.

Scope:

- Web chat test.
- Telegram mock.
- WhatsApp mock.
- Runtime trace.

Non-goals:

- No live Telegram polling/webhooks.
- No live WhatsApp.

Files likely touched:

- `packages/channel-adapters/`
- `packages/runtime-core/`
- `apps/flowai-studio-preview/`

Acceptance criteria:

- Channel previews clearly label mock status.
- Web supports visual test.
- Telegram/WhatsApp show interaction constraints.

Tests:

- Channel formatting.
- Runtime preview.
- Mock labels.

Expected PR title:

- `TASK-015: Add channel preview workspace`

### TASK-016: Export And Integration Hub

Objective:

- Export workflow and mapping plans to external CRM/ticketing/chatbot systems.

Scope:

- FlowAI JSON export.
- CRM mapping plan.
- Ticketing mapping plan.
- API package documentation.

Non-goals:

- No live CRM credentials.
- No production webhooks.

Files likely touched:

- `packages/exporters/`
- `docs/exporters/`
- `apps/flowai-studio-preview/`

Acceptance criteria:

- User can copy/download FlowAI Workflow JSON.
- User can view CRM/ticketing mapping plan.
- Unsupported fields are explicit.

Tests:

- Export JSON schema.
- CRM mapping fixture.
- Ticketing mapping fixture.

Expected PR title:

- `TASK-016: Add export and integration hub`

## 9. Requires Explicit Approval

Require approval before:

- Adding React Flow/Xyflow dependency.
- Adding OpenAI live provider implementation beyond local demo usage.
- Adding file upload endpoints.
- Adding PDF/DOCX/OCR parsers.
- Adding website crawling.
- Adding persistence/database.
- Adding auth/tenants.
- Adding live Telegram.
- Adding live WhatsApp.
- Adding CRM/ticketing live connectors.
- Changing Workflow DSL contract.
- Changing runtime execution semantics.

## 10. Local API Key Handling

Local secret file:

```text
.flowai.local.json
```

This file must stay ignored by Git.

Recommended content:

```json
{
  "OPENAI_API_KEY": "",
  "OPENAI_MODEL": "gpt-4.1-mini"
}
```

Rules:

- Never commit this file.
- Never print the key.
- Never send the key to browser code.
- Never store the key in workflow JSON.
- Never store the key in BusinessUnderstanding, SourceDocument, traces, logs, or channel previews.

Later implementation can load this local file only on the backend/dev server and translate it to process env at runtime.

## 11. Immediate Next Action

Recommended next single task:

```text
TASK-010_OWNER_FIRST_AI_BUILDER_ORCHESTRATION
```

Start with docs/spec acceptance, then build `TASK-011_OWNER_FIRST_BUILDER_UI`.

Do not continue polishing PR #17 as the final product UX. Treat PR #17 as a technical spike unless explicitly accepted otherwise.
