# Workflow Draft Endpoint Plan

This document defines the planned API boundary for exposing the deterministic TASK-005B workflow draft generator. It is a plan, not an implementation record.

## Boundary

The endpoint should be an API wrapper around `@flowai/workflow-generator`.

It should:

- validate the HTTP request shape,
- normalize safe defaults,
- call `generateWorkflowDraft`,
- normalize the response for clients,
- avoid persistence and side effects.

It should not:

- select templates independently of the generator,
- repair unsupported template hints,
- create runtime sessions,
- connect Telegram preview sessions,
- crawl websites,
- read documents,
- call AI providers,
- generate product/catalog claims,
- change Workflow DSL or Runtime Core behavior.

## Endpoint

`POST /workflow-drafts/from-business-understanding`

This path keeps draft generation separate from:

- `POST /workflows/validate`, which validates a workflow already supplied by a caller,
- `POST /runtime/test/start`, which starts an in-memory runtime test session,
- `POST /channels/telegram/preview/connect`, which connects a workflow to the Telegram preview mock surface.

## Request Shape

```ts
interface WorkflowDraftRequest {
  businessUnderstanding: BusinessUnderstanding;
  templateHint?: WorkflowTemplateHint;
  targetChannel?: TargetChannelHint;
  generationMode?: "deterministic_v0";
  strict?: boolean;
}
```

Defaulting rules:

- `generationMode` defaults to `deterministic_v0`.
- `strict` defaults to `true`.
- `targetChannel` defaults to `channel_agnostic` if the implementation needs an explicit value, but it remains a hint only.

Boundary validation rules:

- Reject non-object request bodies with `400 INVALID_REQUEST`.
- Reject request bodies missing `businessUnderstanding` with `400 INVALID_REQUEST`.
- Reject non-string `templateHint`, `targetChannel`, or `generationMode` values with `400 INVALID_REQUEST`.
- Reject non-boolean `strict` values with `400 INVALID_REQUEST`.
- Do not log the full request body.
- Do not accept top-level provider credentials, API keys, webhook secrets, or tokens.

Generator validation rules:

- Pass structurally valid request objects to `generateWorkflowDraft`.
- Let the generator return blocking reports for invalid `BusinessUnderstanding`, unsupported template hints, unresolved conflicts, missing blockers, or unsupported generation modes.
- Do not convert generator blockers into exceptions when generation was safely blocked.

## Response Shape

```ts
interface WorkflowDraftResponse {
  workflow: WorkflowDefinition | null;
  generationPlan: WorkflowGenerationPlan;
  generationReport: WorkflowGenerationReport;
  tests: WorkflowTestCase[];
  runtimePreviewHint: RuntimePreviewHint;
}

interface RuntimePreviewHint {
  canStartRuntimeTest: boolean;
  reason: string;
}
```

Response normalization rules:

- Return `workflow: null` when `generateWorkflowDraft` returns no workflow.
- Return `tests: []` when generation is blocked.
- Preserve `generationPlan` and `generationReport` from the package generator.
- Preserve generator blocker messages, especially unsupported template reports.
- Do not add channel-specific behavior to the workflow or report.

`runtimePreviewHint` rules:

- `canStartRuntimeTest: true` only when `workflow` exists and `generationReport.validation.valid === true`.
- `canStartRuntimeTest: false` when there is no workflow.
- `canStartRuntimeTest: false` when Workflow DSL validation fails.
- `reason` should summarize the first blocking issue or validation issue without echoing secrets.
- The hint is informational only. The endpoint must not start a runtime session.

## Template Hint Behavior

Explicit template hints must be respected.

Supported in TASK-005B:

- `clinic_booking`
- `service_lead`

Known but unsupported/planning-only:

- `faq_support`
- `ecommerce_assistant`
- `restaurant_inquiry`

Required API behavior:

- `clinic_booking` may generate a workflow only when the generator deems the input safe.
- `service_lead` may generate a workflow only when the generator deems the input safe.
- `ecommerce_assistant` returns `workflow: null`, `tests: []`, and a blocking report mentioning ProductCatalog evidence or ecommerce unsupported.
- `restaurant_inquiry` returns `workflow: null`, `tests: []`, and a blocking report mentioning that the template is not implemented.
- unknown strings return `workflow: null`, `tests: []`, and a blocking report for unsupported `templateHint`.
- if `templateHint` is absent, safe inference may still choose `clinic_booking` or `service_lead`.

## Runtime Test Loop Boundary

The endpoint may return a hint that a valid workflow is ready for runtime testing. It must not call `RuntimeTestService.start`.

Caller flow after a successful draft:

1. Call `POST /workflow-drafts/from-business-understanding`.
2. Review `generationReport` and generated tests.
3. If `runtimePreviewHint.canStartRuntimeTest` is true, call `POST /runtime/test/start` with the returned workflow.
4. Send test messages through `POST /runtime/test/:sessionId/message`.

This keeps draft generation reviewable before execution.

## Telegram Preview Boundary

The endpoint must not call Telegram preview APIs.

Caller flow after a successful draft and review:

1. Generate the draft workflow.
2. Optionally test it through the runtime test loop.
3. Call `POST /channels/telegram/preview/connect` explicitly if Telegram preview is desired.

`targetChannel: "telegram_preview"` may be accepted as a non-binding hint, but TASK-005C must not add Telegram-specific workflow semantics.

## Planned API Classes

`WorkflowDraftController`

- Owns the `POST /workflow-drafts/from-business-understanding` route.
- Receives the request body.
- Delegates to `WorkflowDraftService`.

`WorkflowDraftService`

- Validates the request shape.
- Applies API defaults.
- Calls `generateWorkflowDraft`.
- Converts absent workflow to `null`.
- Builds `runtimePreviewHint`.
- Throws safe API errors only for malformed request shapes or unexpected failures.

`AppModule`

- Registers the controller and service in `apps/api/src/module.ts`.

## Error Model

Use the existing API pattern of structured, safe errors.

Planned request errors:

- `400 INVALID_REQUEST` for non-object body, missing `businessUnderstanding`, invalid primitive field types, or top-level credential-like fields.
- `400 INVALID_BUSINESS_UNDERSTANDING` only when the submitted `businessUnderstanding` value cannot be safely passed to the generator at all. Otherwise, invalid BusinessUnderstanding content should be returned as a generator blocking report with `workflow: null`.
- `500 WORKFLOW_DRAFT_GENERATION_FAILED` for unexpected internal failures, with no raw input body or stack trace in the response.

Safe generation blockers should be response data, not thrown errors:

- invalid `BusinessUnderstanding` content,
- unsupported template hints,
- unresolved conflicts,
- missing workflow-critical facts,
- strict-mode publish blockers.

## Test Plan

Controller or service tests should cover:

- supported `clinic_booking` input returns a valid workflow and `runtimePreviewHint.canStartRuntimeTest: true`,
- supported `service_lead` input returns a valid workflow and `runtimePreviewHint.canStartRuntimeTest: true`,
- request without `strict` defaults to strict generation,
- absent `templateHint` still allows generator inference,
- `ecommerce_assistant` returns `workflow: null`, `tests: []`, and mentions ProductCatalog evidence or ecommerce unsupported,
- `restaurant_inquiry` returns `workflow: null`, `tests: []`, and mentions not implemented,
- unknown `templateHint` returns `workflow: null`, `tests: []`, and reports unsupported `templateHint`,
- unsupported hints do not produce `service_lead` or `clinic_booking` workflows by fallback,
- unsupported hints do not produce product recommendation, comparison, price, or availability nodes,
- invalid `BusinessUnderstanding` shape returns a blocking report with no workflow,
- non-object body returns `400 INVALID_REQUEST`,
- missing `businessUnderstanding` returns `400 INVALID_REQUEST`,
- `targetChannel` does not change generated workflow semantics,
- no runtime session is created by draft generation,
- no Telegram preview session is created by draft generation.

Workspace verification after implementation:

```bash
CI=true pnpm --filter @flowai/api test
CI=true pnpm --filter @flowai/api typecheck
CI=true pnpm test
CI=true pnpm build
git diff --check
```

## Security Checks

TASK-005C implementation must confirm:

- no `eval`,
- no `new Function`,
- no executable workflow strings,
- no arbitrary JavaScript expressions,
- no provider credentials in request examples, workflow JSON, logs, or traces,
- no crawler or network fetch,
- no AI/provider calls,
- no durable persistence,
- no channel-specific workflow ownership.

## Open Risks

- Clients may treat a draft workflow as publish-ready when `generationReport` still contains blockers. The API should keep strict mode as the default and make runtime readiness explicit.
- `targetChannel` may be mistaken for channel-specific generation. The endpoint should preserve it as metadata only until a future accepted task defines channel-aware previews.
- Unsupported ecommerce and restaurant hints may be mistaken for implemented templates. Tests must prove they remain blocked.
- Request validation could grow into duplicate BusinessUnderstanding validation. The API should validate only boundary shape and delegate domain validation to the packages.

## Next Task

TASK-005C implementation: API workflow draft endpoint.
