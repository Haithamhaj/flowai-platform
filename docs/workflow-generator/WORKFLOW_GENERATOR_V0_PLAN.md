# Workflow Generator V0 Plan

## Purpose

Workflow Generator V0 should turn accepted business understanding into a safe, editable, validated Workflow JSON draft.

This is a planning document only. It does not implement workflow generation, crawling, document ingestion, RAG, provider calls, API endpoints, runtime behavior, channel behavior, persistence, Studio UI, or exporters.

## Current Package Status

`packages/workflow-generator` exists.

Current files:

- `src/index.ts`
- `package.json`
- `tsconfig.json`

Current behavior:

- placeholder status export
- provider-shaped interface
- no generation logic
- no tests beyond pass-with-no-tests script

Verdict:

- Keep the package boundary.
- Replace the placeholder with deterministic package-first generation in a future TASK-005B implementation.
- Do not accept the current placeholder as product behavior.

## V0 Pipeline

The planned generator pipeline is:

```text
Validate BusinessUnderstanding input
-> build WorkflowGenerationPlan
-> choose narrow deterministic template
-> build WorkflowDefinition draft
-> run validateWorkflow()
-> build generationReport
-> generate workflow test scenarios
```

The generator should be deterministic because the first value is proving the mapping contract, not AI quality.

## Input Contract

Required:

- `businessUnderstanding`: accepted TASK-005A `BusinessUnderstanding`.

Optional:

- `templateHint`
- `targetChannel`
- `generationMode`

Example shape:

```json
{
  "businessUnderstanding": {},
  "templateHint": "clinic_booking",
  "targetChannel": "channel_agnostic",
  "generationMode": "deterministic_v0"
}
```

Rules:

- `targetChannel` is optional.
- `targetChannel` must not change core workflow semantics.
- `telegram_preview` may affect later preview formatting only through channel adapters, not generator logic.
- `generationMode` starts with `deterministic_v0`.
- Unknown template hints should produce a clear report and conservative fallback, not guessed behavior.

## Output Contract

Example shape:

```json
{
  "workflow": {
    "version": "0.1",
    "workflowId": "wf_example",
    "publishStatus": "draft"
  },
  "generationReport": {
    "businessUnderstandingId": "bu_example",
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

`workflow` must be a complete `WorkflowDefinition` when generation succeeds.

`generationReport` must explain what was used, what was skipped, what is blocked, and whether DSL validation passed.

`tests` should contain generated path scenarios that can be copied into `WorkflowDefinition.tests` or validated by package tests.

## WorkflowGenerationPlan

The intermediate plan is the main design guardrail. It lets reviewers see why a workflow was generated before the final JSON exists.

Suggested shape:

```json
{
  "businessUnderstandingId": "bu_example",
  "selectedTemplate": "clinic_booking",
  "selectedScenarios": ["scenario_booking_or_reservation"],
  "selectedCapabilities": ["book_appointments", "answer_faq", "handoff_to_human"],
  "requiredFields": [
    {
      "key": "phone",
      "label": "phone",
      "type": "phone",
      "sourceRefs": ["source_business_interview"],
      "confidence": 0.9
    }
  ],
  "knowledgeNeeds": [],
  "handoffNeeds": [],
  "missingBlockers": [],
  "nodePlan": [],
  "edgePlan": [],
  "assumptions": [],
  "warnings": []
}
```

Plan rules:

- No node plan item should exist without a reason.
- Any node based on business facts should carry sourceRefs and confidence.
- Missing questions that block workflow should appear before JSON generation.
- Conflicts should stop affected routes before they become nodes.
- Low confidence should create warnings or handoff paths.

## Template Selection

Template selection should prefer the safest useful template.

Recommended order for TASK-005B implementation:

1. `clinic_booking` when category/scenarios indicate appointment or clinic flow.
2. `service_lead` when services and lead/contact fields exist.
3. `faq_support` when known FAQs exist and no action workflow is safe.

Planning-only templates:

- `restaurant_inquiry`
- `ecommerce_assistant`

Do not implement product recommendation or product comparison until ProductCatalog facts exist.

## Template Plans

### Clinic Booking

Node plan:

- `start`
- `welcome`
- `route_intent`
- `collect_appointment`
- `answer_faq` when exact FAQs exist
- `handoff_staff`
- `unsupported`
- `done`

Edge plan:

- `start -> welcome`
- `welcome -> route_intent`
- booking intent -> `collect_appointment`
- FAQ intent -> `answer_faq` or handoff
- unsupported -> `handoff_staff`
- collection complete -> `handoff_staff`
- handoff/end terminal path

Required safeguards:

- emergency or medical advice limitations become policy warning or refusal route.
- no diagnosis or treatment advice.
- missing handoff destination becomes warning or blocker.

### Service Lead

Node plan:

- `start`
- `welcome`
- `ask_service_interest`
- `collect_lead`
- `handoff_sales`
- `unsupported`
- `done`

Required safeguards:

- required fields must be declared variables.
- unsupported service requests route to handoff.
- pricing or guarantee claims only appear when source-backed.

### FAQ Support

Node plan:

- `start`
- `welcome`
- `route_question`
- deterministic FAQ message nodes when exact FAQ coverage exists
- `handoff`
- `done`

Required safeguards:

- source-only answers only.
- no RAG unless a later approved task adds source-backed knowledge sources.
- unsupported questions route to handoff or missing source message.

### Ecommerce Assistant

Planning status:

- not recommended for first implementation.

Required future facts:

- ProductCatalog
- price freshness
- availability freshness
- conflict status
- sourceRefs for attributes used in recommendation/comparison

Without these facts, generated ecommerce workflows may collect inquiries or hand off, but must not recommend, compare, show prices, or claim stock.

## Mapping Rules

BusinessUnderstanding to WorkflowDefinition:

- `id` -> `generationReport.businessUnderstandingId`.
- `businessName` -> `sourceSummary.businessName`; use safe fallback if null.
- `category` -> `sourceSummary.businessCategory`.
- `summary` -> workflow description and source summary.
- `sources` -> source summary sources and metadata references.
- `services` -> quick replies, service variables, route choices, and collection context.
- `faqs` -> message nodes only when answers are directly available.
- `policies` -> refusal, warning, or handoff copy.
- `forms` -> declared variables and `field_collection` nodes.
- `scenarios` -> safe AST condition routes.
- `missingQuestions` -> blockers or report warnings.
- `assumptions` -> `workflow.assumptions`.
- `unknowns` -> report warnings.
- `conflicts` -> blockers when route behavior depends on disputed facts.
- `confidence` -> report confidence and node metadata.

Workflow JSON requirements:

- complete top-level `WorkflowDefinition`.
- strict JSON-compatible data only.
- one `start` node.
- at least one `handoff` or `end` terminal node.
- declared variables for every question and field key.
- safe condition AST, never condition strings.
- no raw webhook URLs.
- no secrets.

## Safety Rules

The generator must not:

- invent services, products, prices, policies, FAQs, locations, or handoff routes;
- recommend products without ProductCatalog evidence;
- compare products without comparable source-backed attributes;
- claim prices or availability without sourceRefs and freshness;
- generate `action` or `webhook` nodes without configured tools;
- embed provider keys, bot tokens, webhook secrets, or private URLs;
- store private chain-of-thought;
- output JavaScript expressions, `eval`, `new Function`, or executable workflow strings;
- make target channel change workflow semantics.

The generator must:

- return publish blockers when required facts are missing;
- include fallback/handoff paths;
- preserve sourceRefs and confidence where behavior depends on business facts;
- run `validateWorkflow()` before returning success;
- include validation issues in `generationReport.validation`;
- produce generated tests for expected paths.

## Generated Tests

Every successful generated workflow should include tests for:

- happy path;
- required field retry or missing field;
- FAQ path when FAQs exist;
- handoff path;
- unsupported request fallback;
- Arabic/English path when language data exists.

Package tests should also verify:

- generated workflow passes `validateWorkflow()`;
- no executable strings are present;
- no secrets are present;
- no product recommendation appears without catalog evidence;
- low-confidence or conflicted facts produce warnings/blockers.

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

Implementation should revise `src/index.ts` to export deterministic generator APIs, not provider-call abstractions.

## API Boundary

Do not add an API endpoint in TASK-005B.

Recommended later task:

- TASK-005C API: `POST /workflow-drafts/from-business-understanding`.

Reason:

- The package contract should be proven with deterministic tests before API state, request validation, storage, auth, or Studio concerns are added.

## Acceptance Gate For TASK-005B Implementation

Accept implementation only when:

- deterministic package generator exists;
- no AI/provider/crawling/RAG dependencies are added;
- clinic booking and service lead fixtures generate valid workflows;
- blockers prevent unsafe generation;
- generation report includes source coverage, warnings, blockers, and validation result;
- generated tests are present;
- package tests, typecheck, full tests, build, and diff check pass.

## Recommended Next Task

TASK-005B implementation: deterministic `BusinessUnderstanding -> Workflow JSON` draft generator.
