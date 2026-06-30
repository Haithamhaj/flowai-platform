# TASK-005D: End-to-End FlowAI Smoke

Status: done
Owner/Agent: Codex
Context shards: `testing.md`, `business-understanding.md`, `workflow-dsl.md`, `runtime-core.md`, `telegram-preview.md`, `security.md`

## Goal

Prove the accepted internal FlowAI vertical slice works together through deterministic tests:

```text
BusinessUnderstanding
-> Workflow Draft API
-> Workflow JSON DSL validation
-> Runtime test loop
-> Telegram preview mock adapter
```

This task adds proof coverage only. It does not add new product behavior.

## Why Now

TASK-005C exposed the accepted TASK-005B generator through a narrow API wrapper. The next useful step is a test-only smoke that shows the accepted packages and API surfaces can be composed without introducing persistence, AI providers, crawling, RAG, production Telegram, or UI work.

## Non-Goals

- No new endpoints.
- No auto-runtime start from workflow draft generation.
- No auto-Telegram preview from workflow draft generation.
- No crawling.
- No document ingestion.
- No RAG.
- No AI/provider calls.
- No persistence/database.
- No auth, tenants, or billing.
- No Studio UI.
- No exporters.
- No WhatsApp.
- No live Telegram polling or webhooks.
- No changes to workflow-dsl, runtime-core, business-understanding, workflow-generator, or channel-adapters.

## Inputs

- Synthetic clinic `BusinessUnderstanding` fixture inside the smoke test.
- Accepted `WorkflowDraftController` / `WorkflowDraftService`.
- Accepted `RuntimeController` / `RuntimeTestService`.
- Accepted `TelegramPreviewController` / `TelegramPreviewService` in mock mode.

## Expected Outputs

- A generated clinic workflow draft that passes `validateWorkflow()`.
- A valid generation report and generated workflow tests.
- A runtime test session that progresses through booking field collection and reaches handoff.
- A Telegram preview mock adapter that starts/reuses isolated runtime sessions only after explicit connect/update calls.
- Safe blocked-generation behavior for unsupported ecommerce hints.

## Files Touched

- `apps/api/test/flowai-vertical-slice.test.ts`
- `docs/tasks/TASK-005D_END_TO_END_SMOKE.md`
- `project-state/PROJECT_STATE.md`
- `docs/10_DECISION_LOG.md`

## Acceptance Criteria

- PR #10 is merged before this task starts.
- End-to-end smoke tests exist.
- Smoke tests prove workflow draft output can feed the runtime test loop.
- Smoke tests prove workflow draft output can feed Telegram preview mock.
- Smoke tests prove blocked generation does not start runtime or Telegram.
- Smoke tests require no OpenAI, Gemini, Qdrant, Telegram token, or database keys.
- Smoke tests prove the draft endpoint does not auto-chain into runtime or Telegram preview.
- No new product behavior or endpoints are added.
- No unrelated files are changed.
- Required tests/build pass.

## Test Plan

Run:

```bash
CI=true pnpm --filter @flowai/api test
CI=true pnpm --filter @flowai/api typecheck
CI=true pnpm test
CI=true pnpm build
git diff --check
```

The smoke file covers:

- full clinic happy path from BusinessUnderstanding to workflow draft, runtime loop, and Telegram mock preview,
- unsupported ecommerce template blocker with no runtime or Telegram start,
- runtime terminal/handoff trace,
- Telegram session reuse for the same chat/user pair and isolation for different pairs,
- no required provider/channel/database keys,
- no automatic draft-to-runtime or draft-to-Telegram chaining.

## Skill/MCP Readiness

- Task type: API/runtime/Telegram integration testing, docs, GitHub publishing.
- Skills/tools used: GitHub PR lifecycle, local repository inspection, TDD/test-first workflow, verification-before-completion.
- External MCPs/connectors required: none.
- Missing recommended tools: none.
- Decision: proceed with local deterministic tests only.
- Tool risks: GitHub operations require authenticated remote access; no secrets or production services are needed for tests.

## Risks

- The smoke uses controller/service-level integration, not a bound HTTP listener. This keeps the proof deterministic but does not prove framework routing over a real port.
- Runtime and Telegram preview sessions remain process-local and preview-only.
- The test proves clinic booking and unsupported ecommerce blocker paths only; broader business types remain future tasks.

## Handoff Notes

TASK-005D was accepted and merged through PR #11.

Final main HEAD after merge:

```text
f2e44819757a0ef015b2674323feac4391ea0d8e
```

Do not treat this as production orchestration. The proved path is internal and test-only:

```text
BusinessUnderstanding
-> Workflow Draft API
-> Runtime Test Loop
-> Telegram Preview Mock
```

This does not prove production HTTP routing, persistence, auth/tenants, live Telegram, crawling, RAG, AI providers, Studio UI, WhatsApp, or exporters.

Next recommended task: TASK-006_DOCUMENT_INGESTION planning only.
