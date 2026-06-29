# TASK-005B Workflow Draft Generator

Status: implemented
Owner/Agent: Codex
Context shards: `business-understanding.md`, `workflow-dsl.md`, `runtime-core.md`, `security.md`

## Goal

Plan and then implement a deterministic package-first generator that converts accepted `BusinessUnderstanding` into a safe draft `WorkflowDefinition`.

The generator should not jump directly from business facts to opaque workflow JSON. It should first create an explainable `WorkflowGenerationPlan`, then build a `WorkflowDefinition`, run `validateWorkflow()`, and return a generation report plus generated workflow test scenarios.

## Why Now

PR #5 accepted direct-interview `BusinessUnderstanding` v0.

PR #6 accepted Business Understanding v1 planning docs for BusinessGraph, source pipeline, ProductCatalog, CapabilityMap, source conflicts, and recommendation policy.

The next useful step is a narrow WorkflowGenerator planning and implementation path that proves FlowAI can move from business understanding to strict Workflow JSON without AI providers, crawling, RAG, persistence, or channel-specific behavior.

## Current Prototype Review

Historical context: before TASK-005B implementation, `packages/workflow-generator` existed and contained only placeholder code:

- `packages/workflow-generator/src/index.ts`
- `packages/workflow-generator/package.json`
- `packages/workflow-generator/tsconfig.json`

Prototype verdict:

- The package boundary is useful and should be kept.
- The current provider-shaped placeholder should be revised for TASK-005B implementation.
- No existing generator behavior should be treated as accepted product behavior.
- The future implementation should be rebuilt around deterministic `BusinessUnderstanding -> WorkflowGenerationPlan -> WorkflowDefinition` generation.

TASK-005B implementation replaced that placeholder with deterministic package code. The planning review remains useful as the accepted boundary for this implementation.

## Implementation Boundary

Recommended TASK-005B implementation path:

```text
BusinessUnderstanding v0
-> WorkflowGenerationPlan
-> WorkflowDefinition draft
-> validateWorkflow()
-> generated test scenarios
```

TASK-005B should be deterministic first. It may use the accepted `@flowai/business-understanding` and `@flowai/workflow-dsl` packages, but should not call external services or require secrets.

Strict non-goals:

- No website crawling.
- No PDF/document ingestion.
- No RAG.
- No AI/provider calls.
- No product catalog extraction.
- No live Telegram or WhatsApp changes.
- No persistence/database.
- No Studio UI.
- No runtime-core changes.
- No workflow-dsl changes unless a later task explicitly approves a DSL extension.
- No API endpoint in TASK-005B; keep API wiring for a later TASK-005C.

## Inputs

Required input:

- accepted `BusinessUnderstanding` from TASK-005A.

Optional planning input:

```json
{
  "businessUnderstanding": {},
  "templateHint": "clinic_booking",
  "targetChannel": "channel_agnostic",
  "generationMode": "deterministic_v0"
}
```

Allowed `templateHint` values for planning:

- `clinic_booking`
- `service_lead`
- `faq_support`
- `restaurant_inquiry`
- `ecommerce_assistant`

Allowed `targetChannel` values for planning:

- `channel_agnostic`
- `telegram_preview`
- `web_preview`

Rules:

- `targetChannel` must be optional.
- `targetChannel` must not change core workflow semantics.
- Channel-specific formatting belongs to channel adapters.
- If no `templateHint` is provided, the generator should choose the safest supported template from `category`, `scenarios`, `services`, `forms`, and `missingQuestions`.
- `generationMode` starts as `deterministic_v0` only.

## Outputs

TASK-005B implementation should return:

```json
{
  "workflow": {},
  "generationReport": {
    "businessUnderstandingId": "bu_123",
    "templateUsed": "clinic_booking",
    "capabilitiesUsed": [],
    "assumptions": [],
    "warnings": [],
    "missingQuestionsBlockingPublish": [],
    "sourceCoverage": {},
    "validation": {
      "valid": true,
      "issues": []
    }
  },
  "tests": []
}
```

`workflow` must be a `WorkflowDefinition` that passes `validateWorkflow()`.

If blockers prevent safe generation, the generator should return a clear report and either no workflow or a non-publishable draft, depending on the implementation mode approved in the future task. It must not silently create a confident workflow from incomplete business facts.

Implemented behavior:

- Non-strict generation may return a valid draft workflow while reporting publish blockers such as missing handoff/refusal approvals.
- Strict generation returns no workflow when blocking questions remain unresolved.
- Unsupported templates, missing generation-critical facts, invalid BusinessUnderstanding input, and unresolved conflicts return no workflow plus a blocking report.
- Generated workflow JSON is validated with `validateWorkflow()` before being returned.

## WorkflowGenerationPlan

Before building Workflow JSON, the generator should create an intermediate plan:

```json
{
  "businessUnderstandingId": "bu_123",
  "selectedTemplate": "clinic_booking",
  "selectedScenarios": [],
  "selectedCapabilities": [],
  "requiredFields": [],
  "knowledgeNeeds": [],
  "handoffNeeds": [],
  "missingBlockers": [],
  "nodePlan": [],
  "edgePlan": [],
  "assumptions": [],
  "warnings": []
}
```

Purpose:

- Keep generation explainable before JSON construction.
- Make missing blockers visible before invalid workflows are produced.
- Preserve sourceRefs and confidence before node metadata is created.
- Make tests easier to derive from selected scenarios and expected terminal paths.

Suggested plan objects:

- `selectedScenarios`: chosen `BusinessUnderstanding.scenarios` that can safely become routes.
- `selectedCapabilities`: inferred or future CapabilityMap entries used by the template.
- `requiredFields`: normalized form fields and sourceRefs.
- `knowledgeNeeds`: FAQ/policy/source requirements that can become messages or later knowledge sources.
- `handoffNeeds`: handoff destination or unresolved handoff requirements.
- `missingBlockers`: missing questions, conflicts, or unknowns that block publish.
- `nodePlan`: planned nodes with ids, node types, sourceRefs, confidence, and rationale.
- `edgePlan`: planned edges with safe AST condition intent or fallback behavior.
- `assumptions`: approved or visible assumptions copied into workflow assumptions.
- `warnings`: non-blocking limitations in the generated draft.

## Initial Templates

TASK-005B implementation should start narrow. Clinic booking and service lead capture are the recommended first accepted templates because they can be generated from TASK-005A direct-interview data without catalog, crawling, RAG, provider calls, or integrations.

### A. Clinic / Appointment Booking

Planned flow:

- `start`
- welcome message
- route intent
- collect booking fields
- handoff to staff
- FAQ path if approved FAQs exist
- unsupported request handoff
- `end`

Required evidence:

- clinic or appointment-like category/scenario
- services or appointment types
- required customer fields
- handoff rule or visible warning if handoff is missing
- medical/refusal policy if clinic input includes sensitive constraints

Initial status:

- recommended for first TASK-005B implementation.

### B. Service Lead Capture

Planned flow:

- `start`
- welcome message
- collect service interest
- collect contact fields
- ask qualifying questions when source-backed
- handoff
- `end`

Required evidence:

- one or more source-backed services
- required lead/contact fields
- handoff route or warning

Initial status:

- recommended for first TASK-005B implementation.

### C. FAQ Support

Planned flow:

- `start`
- welcome message
- route question
- answer from known FAQs as deterministic `message` nodes when exact FAQ coverage exists
- fallback handoff
- `end`

Rules:

- `rag_answer` should only be used when a future approved source-backed knowledge source exists.
- Do not generate RAG behavior in TASK-005B.
- Unknown questions route to handoff or unsupported answer.

Initial status:

- possible after clinic/service lead, but should stay deterministic.

### D. Ecommerce Assistant

Planned flow:

- `start`
- welcome message
- category or product inquiry
- product recommendation placeholder only if ProductCatalog exists later
- compare products placeholder only if comparable attributes exist later
- handoff or link out
- `end`

Rules:

- No product recommendation nodes without catalog evidence.
- No price claims without sourceRefs and freshness.
- No availability claims without sourceRefs and freshness.

Initial status:

- planning only; do not implement in first TASK-005B unless ProductCatalog facts are accepted first.

## Mapping Rules

Map accepted `BusinessUnderstanding` to Workflow DSL as follows:

- `businessName` and `category` -> `workflow.sourceSummary`.
- `summary` -> `workflow.description` and `sourceSummary.summary`.
- `sources` -> `workflow.sourceSummary.sources` and node metadata references.
- `services` -> quick replies, route options, service-interest variables, or field collection context.
- `scenarios` -> condition routes using safe `intent_is`, `contains`, `equals`, or fallback edges.
- `forms` and `requiredFields` -> declared `variables` and `field_collection` nodes.
- `faqs` -> deterministic `message` nodes when exact answers are available.
- `policies` -> answer constraints, refusal copy, or handoff warnings.
- `missingQuestions.blocksWorkflow` -> `generationReport.missingQuestionsBlockingPublish` and publish blockers.
- `assumptions` -> `workflow.assumptions` and generation report assumptions.
- `sourceRefs` and `confidence` -> node metadata where behavior depends on business facts.
- `low confidence` -> warnings or conservative handoff path.
- `conflicts` -> blockers when they affect an enabled route, answer, or handoff.
- `unknowns` -> generation report warnings and missing blockers if they affect workflow completion.
- handoff capability or unresolved action -> `handoff` node, not `action` or `webhook`.

## Safe Default Behavior

The generator must:

- Never invent services, products, prices, policies, FAQs, locations, or handoff destinations.
- Never generate product recommendation nodes without catalog evidence.
- Never generate price or availability claims without sourceRefs and freshness.
- Never generate webhook or action nodes unless tools are explicitly configured in a later approved task.
- Never embed secrets, raw webhook URLs, API keys, bot tokens, provider credentials, or private URLs.
- Never output executable expressions, JavaScript condition strings, `eval`, or `new Function`.
- Always use safe Workflow DSL condition AST.
- Always declare variables used by question and field collection nodes.
- Always include exactly one `start` node.
- Always include at least one terminal `handoff` or `end` node.
- Always include fallback paths for condition routes.
- Always run `validateWorkflow()` before returning a workflow.
- Fail with a clear generation report if required blockers remain.

## Generated Test Scenarios

For each generated workflow, TASK-005B should produce workflow tests that reference expected node ids and terminal behavior.

Required generated test categories:

- happy path
- missing required field or empty input retry
- FAQ/question path if FAQs exist
- handoff path
- unsupported request path
- Arabic/English path if language data exists

The generated tests should be valid `WorkflowTestCase` entries when possible, plus richer generator-level expectations in package tests.

## Future Package Structure

Recommended implementation structure:

```text
packages/workflow-generator/
  src/
    types.ts
    generation-plan.ts
    generator.ts
    templates/
      clinic-booking.ts
      service-lead.ts
      faq-support.ts
    report.ts
    index.ts
  test/
    workflow-generator.test.ts
```

The package should depend on:

- `@flowai/business-understanding`
- `@flowai/workflow-dsl`

It should not add provider, crawler, RAG, Telegram, persistence, or API dependencies.

## Future API Surface

Potential later endpoint:

```text
POST /workflow-drafts/from-business-understanding
```

Possible request:

```json
{
  "businessUnderstanding": {},
  "templateHint": "clinic_booking",
  "generationMode": "deterministic_v0"
}
```

Possible response:

```json
{
  "workflow": {},
  "generationReport": {},
  "tests": []
}
```

Decision for now:

- Keep TASK-005B package-first.
- Defer API wiring to TASK-005C or another explicit follow-up.

## Acceptance Criteria For Future Implementation

TASK-005B implementation should be accepted only if:

- `packages/workflow-generator` contains deterministic generator code.
- It takes accepted `BusinessUnderstanding` as input.
- It creates a `WorkflowGenerationPlan`.
- It outputs a valid `WorkflowDefinition` draft or a clear blocking report.
- It runs `validateWorkflow()` and returns validation result in `generationReport`.
- It creates generated workflow tests.
- It keeps output channel-neutral by default.
- It preserves assumptions, sourceRefs, and confidence metadata.
- It avoids AI/provider/crawling/RAG calls.
- It avoids channel-specific logic.
- It avoids action/webhook nodes unless configured tools exist in a later task.
- It includes examples or fixtures for clinic booking and service lead capture.
- `pnpm` package tests, typecheck, full tests, and build pass.

Implementation status:

- `packages/workflow-generator` now contains deterministic generator code.
- Clinic booking and service lead templates are implemented.
- FAQ-only generation is explicitly deferred; exact known FAQs can appear only as deterministic message paths inside supported templates.
- Ecommerce/product recommendation generation is not implemented.
- API wiring is not implemented.

## Required Tests For Future Implementation

- Clinic `BusinessUnderstanding` generates a valid workflow.
- Service lead `BusinessUnderstanding` generates a valid workflow.
- Missing bot goal returns blocking report instead of invalid workflow.
- Missing handoff route produces warning or blocker.
- Unresolved conflicts block affected routes.
- Strict mode does not generate workflow when required blockers exist.
- Workflow includes assumptions/sourceRefs/confidence metadata.
- `validateWorkflow()` passes for generated workflow.
- Generated tests exist.
- Generated workflow has exactly one start node and at least one terminal node.
- Question and field nodes reference declared variables.
- Condition edges use safe AST, not strings.
- No nodes or edges contain executable strings.
- No secrets appear in workflow, report, or tests.
- No product recommendation appears without catalog evidence.
- No provider keys or network configuration are required.

## Checks

Planning-only changes should run:

```bash
git diff --check
```

Future implementation should run:

```bash
CI=true pnpm --filter @flowai/workflow-generator test
CI=true pnpm --filter @flowai/workflow-generator typecheck
CI=true pnpm test
CI=true pnpm build
git diff --check
```

## Recommended Next Task

Review TASK-005B implementation PR. If accepted, the next recommended task is TASK-005C API draft-generation endpoint planning or TASK-006 only if explicitly approved.

Do not start TASK-006 until the generator boundary has been implemented or explicitly deferred.
