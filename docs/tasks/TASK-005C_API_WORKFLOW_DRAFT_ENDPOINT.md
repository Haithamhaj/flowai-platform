# TASK-005C: API Workflow Draft Endpoint

Status: Implemented
Owner: FlowAI task system
Scope: API endpoint wrapper around accepted deterministic workflow generator

## Goal

Expose the accepted TASK-005B deterministic workflow draft generator through a small API endpoint.

The endpoint should let a caller submit a validated `BusinessUnderstanding` object and receive:

- a generated `WorkflowDefinition` when safe,
- the `WorkflowGenerationPlan`,
- the `WorkflowGenerationReport`,
- generated workflow test cases,
- a non-mutating hint about whether the workflow can be sent to the runtime test loop.

## Current Foundations

- `packages/business-understanding` validates direct-interview `BusinessUnderstanding` data.
- `packages/workflow-generator` deterministically maps `BusinessUnderstanding` to a draft workflow for supported templates.
- `packages/workflow-dsl` validates strict JSON workflow definitions.
- `apps/api` already exposes workflow validation, in-memory runtime testing, and Telegram preview mock endpoints.
- TASK-005C adds an API wrapper that delegates to the package generator without starting runtime, Telegram preview, persistence, crawling, RAG, or provider calls.

## Non-Goals

TASK-005C must not implement:

- website crawling,
- document ingestion,
- RAG,
- AI/provider calls,
- ecommerce catalog extraction,
- product recommendation, comparison, price, or availability logic,
- restaurant workflows,
- persistence,
- auth or tenant isolation,
- runtime session creation,
- Telegram preview connection,
- workflow-dsl changes,
- runtime-core changes,
- channel adapter changes,
- Studio UI,
- exporters.

## Planned Endpoint

`POST /workflow-drafts/from-business-understanding`

The API should validate only the HTTP/request boundary, then delegate generation to `generateWorkflowDraft` from `@flowai/workflow-generator`.

The API must not duplicate template-selection rules or reinterpret unsupported template hints. Explicit unsupported hints such as `ecommerce_assistant`, `restaurant_inquiry`, and unknown strings must remain blocking reports with no workflow.

## Implementation Status

Implemented files:

- `apps/api/src/routes/workflow-draft.controller.ts`
- `apps/api/src/services/workflow-draft.service.ts`
- `apps/api/src/module.ts`
- `apps/api/test/workflow-draft.service.test.ts`
- `apps/api/package.json`
- `pnpm-lock.yaml`

Implemented behavior:

- `WorkflowDraftController` exposes `POST /workflow-drafts/from-business-understanding`.
- `WorkflowDraftService` validates request shape, defaults `generationMode` to `deterministic_v0`, defaults `strict` to `true`, rejects obvious provider/secret request fields, delegates to `generateWorkflowDraft()`, normalizes missing workflow output to `workflow: null`, and returns `runtimePreviewHint`.
- Valid generated workflows can be manually passed to `POST /runtime/test/start` by a caller.
- The endpoint does not automatically start runtime sessions.
- The endpoint does not automatically create Telegram preview adapters.
- The endpoint does not persist workflow drafts.
- The endpoint does not call AI providers, crawling, document ingestion, RAG, database, auth, Studio UI, exporters, or channel adapters.

## Planned Request Contract

```json
{
  "businessUnderstanding": {},
  "templateHint": "clinic_booking",
  "targetChannel": "channel_agnostic",
  "generationMode": "deterministic_v0",
  "strict": true
}
```

Rules:

- `businessUnderstanding` is required.
- `templateHint` is optional. If present, it is passed through to the generator and must not fall back to inference when unsupported.
- `targetChannel` is optional metadata only. It must not change core workflow semantics.
- `generationMode` defaults to `deterministic_v0`.
- `strict` defaults to `true` at the API boundary.

## Planned Response Contract

```json
{
  "workflow": null,
  "generationPlan": {},
  "generationReport": {},
  "tests": [],
  "runtimePreviewHint": {
    "canStartRuntimeTest": false,
    "reason": "Generation was blocked."
  }
}
```

Rules:

- Normalize absent workflow output to `workflow: null` for a stable API contract.
- Return generator blockers as a safe generation response when the request shape is valid.
- `runtimePreviewHint.canStartRuntimeTest` is `true` only when a workflow exists and the generation report validation is valid.
- The endpoint must not automatically create a runtime test session or Telegram preview session.

## Planned Implementation Files

Implementation should be limited to API package wiring and tests:

- `apps/api/src/routes/workflow-draft.controller.ts`
- `apps/api/src/services/workflow-draft.service.ts`
- `apps/api/src/module.ts`
- `apps/api/test/workflow-draft.service.test.ts`
- `apps/api/test/workflow-draft.controller.test.ts` if controller-level tests are needed
- `docs/tasks/TASK-005C_API_WORKFLOW_DRAFT_ENDPOINT.md`
- `docs/api/WORKFLOW_DRAFT_ENDPOINT_PLAN.md`
- `project-state/PROJECT_STATE.md`
- `docs/10_DECISION_LOG.md` if the accepted implementation changes a decision

## Acceptance Criteria

1. `POST /workflow-drafts/from-business-understanding` returns a generated workflow for supported safe inputs.
2. Request bodies that are not objects or omit `businessUnderstanding` return safe `INVALID_REQUEST` errors.
3. Invalid `BusinessUnderstanding` content with a valid request shape returns no workflow and a blocking generation report.
4. Unsupported explicit template hints return no workflow and do not fall back to inference.
5. `ecommerce_assistant` response mentions ProductCatalog evidence or ecommerce unsupported.
6. `restaurant_inquiry` response mentions the template is not implemented.
7. Unknown template hints report unsupported `templateHint`.
8. No endpoint call starts a runtime session, Telegram preview session, persistence write, crawler, provider call, or RAG flow.
9. `targetChannel` does not change generated workflow semantics.
10. `strict` defaults to `true`.
11. Generated workflows pass Workflow DSL validation before `runtimePreviewHint.canStartRuntimeTest` can be true.
12. Tests cover supported clinic/service generation, unsupported hints, malformed requests, invalid `BusinessUnderstanding`, strict defaults, runtime preview hints, and no side effects.

## Verification Commands For Implementation

When TASK-005C implementation starts, run:

```bash
CI=true pnpm --filter @flowai/api test
CI=true pnpm --filter @flowai/api typecheck
CI=true pnpm test
CI=true pnpm build
git diff --check
```

## Skill/MCP Readiness Check

- Required external MCPs/connectors: none.
- Useful available capabilities: local repository inspection, package tests, API tests, GitHub CLI only for PR lifecycle work.
- Missing recommended capabilities: none for this planning task.
- Proceed without installing dependencies or using external services.

## Handoff

TASK-005C is ready for implementation review.

Do not start TASK-006 until the TASK-005C endpoint implementation is accepted and reviewed.
