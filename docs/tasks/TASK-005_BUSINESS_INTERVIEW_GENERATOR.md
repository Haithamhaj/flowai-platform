# TASK-005 Business Interview Generator

Status: review
Owner/Agent: unassigned
Context shard: `business-understanding.md`

## Goal

Define and validate the first BusinessUnderstanding path from direct business interview input.

This task should produce a schema-first, deterministic baseline that can turn interview text and structured hints into BusinessUnderstanding JSON, missing questions, assumptions, unknowns, conflicts, and confidence signals.

## Why Now

The accepted core path is now:

Workflow DSL -> Runtime Core -> API Test Loop -> Telegram Preview Mock Adapter

The next useful product step is business understanding from direct interview input. It is safer than crawling, PDFs, RAG, or provider-backed generation because it can be tested locally and does not require secrets or network access.

## Non-Goals

- No website crawling.
- No PDF/document ingestion.
- No RAG.
- No real OpenAI/Gemini/provider call.
- No provider SDK dependency.
- No Studio UI.
- No Telegram/WhatsApp changes.
- No persistence/database.
- No auth, tenants, billing, or exporters.
- No runtime-core changes.
- No workflow-dsl changes unless only referenced as a future output contract.
- No full Workflow JSON generation in this task.

If workflow draft generation is desired, split it into a follow-up task:

- TASK-005A: BusinessUnderstanding schema + direct interview extraction.
- TASK-005B: Workflow draft generator from accepted BusinessUnderstanding.

## Inputs

Direct interview input v0:

```json
{
  "businessDescription": "Clinic that offers dental checkups and emergency appointments.",
  "targetBotGoal": "Answer common questions and collect appointment requests.",
  "knownServices": [],
  "knownFaqs": [],
  "constraints": [],
  "preferredLanguage": "en",
  "businessCategoryHint": "clinic"
}
```

Required fields should be minimal at v0. The analyzer should return missing questions instead of rejecting incomplete business information.

## Skill/MCP Readiness

- Task type: business-understanding schema, deterministic extraction, tests, and docs.
- Skills/tools expected: local TypeScript tests and package build.
- Skills/tools available: local repo files, `pnpm`, GitHub tooling for PR work.
- Missing skills/tools worth recommending: none for mock-first implementation.
- Decision: proceed without extra MCP/plugin installation. Ask for explicit approval before any real AI provider integration, API key handling, crawler, document parser, RAG tool, or dependency addition.

## Existing Prototype Review

Found files:

- `packages/business-understanding/src/index.ts`
- `packages/business-understanding/package.json`
- `packages/business-understanding/tsconfig.json`
- `packages/workflow-generator/src/index.ts`
- `packages/workflow-generator/package.json`
- `packages/workflow-generator/tsconfig.json`

Prototype verdict:

- `packages/business-understanding` is only a minimal interface placeholder and should be revised, not accepted as the final TASK-005 implementation.
- `packages/workflow-generator` is intentionally placeholder-only and should remain out of scope for TASK-005A.
- No API business-interview endpoint exists yet.

## Expected Outputs

BusinessUnderstanding JSON v0 must include:

- `businessName`
- `category`
- `summary`
- `sources`
- `services`
- `faqs`
- `policies`
- `forms`
- `scenarios`
- `missingQuestions`
- `assumptions`
- `unknowns`
- `conflicts`
- `confidence`

Each extracted fact should support:

- `sourceRefs`
- `confidence`
- `notes`

`notes` must be concise observable rationale, not private chain-of-thought.

Recommended model families:

- `BusinessInterviewInput`
- `BusinessUnderstanding`
- `SourceRef`
- `ExtractedService`
- `ExtractedFAQ`
- `ExtractedPolicy`
- `ExtractedForm`
- `Scenario`
- `MissingQuestion`
- `Assumption`
- `Unknown`
- `Conflict`
- `ExtractionReport`

## Missing Question Strategy

The analyzer should produce missing questions that block workflow generation, especially:

- What actions should the bot support?
- Which services can be booked, requested, or only explained?
- What fields are required from the customer?
- When should the bot hand off to a human?
- Which answers must come only from approved sources?
- What should the bot refuse or avoid?
- What channel is being tested first?
- What policies affect booking, cancellation, pricing, refunds, privacy, or emergencies?
- What languages should the bot support?

Missing questions should include:

- stable `id`
- `question`
- `reason`
- `blocks`
- `priority`
- optional `suggestedAnswerType`

## Future Generator Boundary

BusinessUnderstanding is the future input to WorkflowGenerator.

Do not couple BusinessUnderstanding to:

- Telegram
- WhatsApp
- runtime sessions
- API test-loop session state
- RAG provider internals
- crawler internals
- provider SDK response shapes

WorkflowGenerator should later consume accepted BusinessUnderstanding and produce Workflow JSON DSL drafts through its own task and tests.

## Future API Surface To Evaluate

Do not implement API endpoints unless a later implementation prompt explicitly approves them.

Potential future endpoints:

- `POST /business-interviews/analyze`
- `GET /business-understandings/:id`
- `POST /business-understandings/:id/missing-questions/answer`
- `POST /workflow-drafts/from-business-understanding`

TASK-005A should prefer package-first implementation. API wiring can wait unless specifically approved.

## Files Likely Touched

TASK-005A likely touches:

- `packages/business-understanding/src/types.ts`
- `packages/business-understanding/src/interview-analyzer.ts`
- `packages/business-understanding/src/validator.ts`
- `packages/business-understanding/src/examples/`
- `packages/business-understanding/src/index.ts`
- `packages/business-understanding/test/`
- `docs/tasks/TASK-005_BUSINESS_INTERVIEW_GENERATOR.md`
- `docs/shards/business-understanding.md` only if the shard needs clarification
- `project-state/PROJECT_STATE.md`
- `docs/10_DECISION_LOG.md` only for accepted decisions

Avoid touching:

- `packages/runtime-core/`
- `packages/workflow-dsl/`
- `packages/channel-adapters/`
- `apps/api/` unless API scope is separately approved

## Acceptance Criteria

- BusinessUnderstanding v0 types are explicit and exported.
- Direct interview input type/schema is explicit and exported.
- Deterministic analyzer or mock extraction service exists for tests.
- Output shape is validated.
- Missing fields become missing questions, unknowns, assumptions, or conflicts.
- Services, FAQs, policies, forms, and scenarios are structured.
- Confidence exists at overall and fact levels.
- Source references are safe and non-secret.
- No Workflow JSON is generated accidentally.
- No AI keys, provider SDKs, crawler, parser, database, or network call is required.
- Examples avoid real personal data and secrets.

## Test Plan

Required tests:

- valid interview input produces BusinessUnderstanding.
- missing business goal returns missingQuestions.
- services are extracted into structured services.
- FAQs are extracted into structured FAQs.
- scenarios are extracted.
- assumptions are explicit.
- unknowns are explicit.
- conflicts are explicit when interview facts disagree.
- confidence fields exist.
- no Workflow JSON is generated when out of scope.
- no AI keys or provider configuration are required.
- English input example is covered.
- Arabic input example is covered if feasible without adding dependencies.
- output rejects or strips obvious secrets from sourceRefs/notes.

Recommended commands:

```bash
CI=true pnpm --filter @flowai/business-understanding test
CI=true pnpm --filter @flowai/business-understanding typecheck
CI=true pnpm test
CI=true pnpm build
```

## Review Checklist

- Scope stayed direct-interview only.
- No provider call, SDK, crawler, document ingestion, RAG, UI, persistence, or API behavior was added without approval.
- BusinessUnderstanding remains channel-agnostic.
- Workflow DSL remains only a future output contract reference.
- Missing questions, assumptions, unknowns, conflicts, and confidence are visible.
- No private chain-of-thought is stored.
- No secrets are stored in BusinessUnderstanding JSON.
- Tests prove deterministic behavior without network access.

## Security and Privacy Rules

- No secrets in BusinessUnderstanding JSON.
- No provider credentials, API keys, bot tokens, webhook secrets, or private URLs in examples/tests.
- No private chain-of-thought; store concise observable rationale only.
- User-provided interview text may contain sensitive data, so fixtures should use synthetic data.
- `sourceRefs` must be non-secret and should identify synthetic input sections or fields.
- Provider calls require explicit approval in a later task.
- Crawling/PDF ingestion requires separate security review in a later task.

## Risks

- Overpromising AI quality before provider-backed extraction exists.
- Treating deterministic v0 extraction as production-grade understanding.
- Letting BusinessUnderstanding leak into channel/runtime/API session concerns.
- Generating Workflow JSON too early without a reviewed mapping contract.

## Handoff Notes

TASK-005A implementation completed on branch `task-005a-business-understanding`.

What changed:

- Added BusinessUnderstanding v0 types.
- Added direct interview input types.
- Added deterministic `analyzeBusinessInterview` implementation.
- Added explicit validator functions for interview input and BusinessUnderstanding output.
- Added simple secret redaction for obvious secret-like text.
- Added synthetic clinic input/output examples.
- Added unit tests for services, FAQs, policies, scenarios, missing questions, assumptions, unknowns, conflicts, confidence, validation, Arabic input, secret redaction, and no accidental Workflow JSON output.

Files changed:

- `packages/business-understanding/src/types.ts`
- `packages/business-understanding/src/analyzer.ts`
- `packages/business-understanding/src/validator.ts`
- `packages/business-understanding/src/redaction.ts`
- `packages/business-understanding/src/index.ts`
- `packages/business-understanding/src/examples/clinic-interview.input.json`
- `packages/business-understanding/src/examples/clinic-business-understanding.json`
- `packages/business-understanding/test/business-understanding.test.ts`
- `docs/tasks/TASK-005_BUSINESS_INTERVIEW_GENERATOR.md`
- `project-state/PROJECT_STATE.md`

Commands run:

- `CI=true pnpm --filter @flowai/business-understanding test`
- `CI=true pnpm --filter @flowai/business-understanding typecheck`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`

Remaining before acceptance:

- Review deterministic extraction quality as a v0 baseline, not AI-grade understanding.
- Keep Workflow JSON draft generation deferred to TASK-005B or later.
