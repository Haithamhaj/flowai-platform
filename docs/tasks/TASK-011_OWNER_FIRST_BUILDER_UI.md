# TASK-011: Owner-First Builder UI

Status: implemented
Owner/Agent: Codex
Context shards: `product.md`, `studio-ui.md`, `business-understanding.md`, `security.md`, `testing.md`

## Goal

Replace the technical placeholder Studio surface with a local owner-first builder UI shell that shows the real FlowAI product path:

```text
owner business description / pasted text
-> live business brief
-> sourceRefs and extracted facts
-> workflow proposal
-> generated WorkflowDefinition summary
-> runtime test conversation
-> Telegram mock preview
```

## Scope

- Use `apps/studio` as the local visible product surface.
- Add a deterministic owner-first builder pipeline that reuses existing packages.
- Add a local HTTP server and static browser UI.
- Add a root script for local review.
- Keep AI provider integration disabled and clearly labeled as pending.
- Add tests for the owner-facing pipeline.

## Non-Goals

- No live OpenAI/provider call.
- No `.flowai.local.json` application read.
- No new external dependencies.
- No upload endpoint.
- No PDF/DOCX parser.
- No crawling.
- No RAG/embeddings/vector DB.
- No persistence/database.
- No auth/tenants/billing.
- No live Telegram polling/webhooks.
- No WhatsApp.
- No visual tree editor/canvas dependency.
- No exporters.
- No Workflow DSL or runtime semantic changes.

## Implementation Boundary

Allowed source files:

- `apps/studio/`
- root `package.json` script updates

Allowed docs/state files:

- `docs/tasks/TASK-011_OWNER_FIRST_BUILDER_UI.md`
- `project-state/PROJECT_STATE.md`
- `project-state/TASK_GRAPH.md`
- `docs/10_DECISION_LOG.md` only if a meaningful decision changes

## Acceptance Criteria

- First screen is owner conversation, not a JSON dashboard.
- User can paste or edit a business description.
- UI shows a live business brief.
- UI shows sourceRefs/facts without raw secret leakage.
- UI shows a workflow proposal summary.
- UI shows generated workflow summary and validation status.
- UI shows a runtime test conversation.
- UI shows Telegram mock preview output.
- UI clearly says live AI is not connected yet.
- Arabic input remains reviewable and does not break the UI.
- No source file outside the scoped files is changed.

## Skill/MCP Readiness

- Task type: UI, deterministic local product demo, testing.
- Skills/tools used: Superpowers `using-superpowers`, `executing-plans`, `test-driven-development`, `verification-before-completion`; browser skill for local UI verification.
- Extra tools required: none.
- Missing tools worth recommending: none for this deterministic local UI shell.
- Decision: proceed without dependencies or provider tools.

## Verification Commands

Run:

```bash
CI=true pnpm --filter @flowai/studio test
CI=true pnpm --filter @flowai/studio build
CI=true pnpm test
CI=true pnpm build
git diff --check
```

Also start the local UI and verify the page renders in a browser:

```bash
pnpm dev:flowai-studio
```

## Risks

- The UI may still feel like a demo if it overemphasizes technical artifacts.
- Deterministic extraction remains conservative and is not AI quality.
- Without persistence, the local review session resets on refresh.
- Without live AI, follow-up questions are suggested deterministically.

## Handoff Notes

Recommended next task after acceptance: TASK-012_AI_BUILDER_PROMPT_PACK_AND_MOCKED_ORCHESTRATOR.

Implementation summary:

- `apps/studio` now exposes `buildOwnerFirstPreview`.
- `apps/studio` now has a local Node HTTP server.
- Root script `pnpm dev:flowai-studio` starts the local owner-first UI.
- The UI is deterministic and does not read `.flowai.local.json`.
- Tests cover clinic markdown, Arabic input, and secret-like value redaction.
