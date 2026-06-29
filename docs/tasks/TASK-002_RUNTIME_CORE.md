# TASK-002 Runtime Core

Status: done
Owner/Agent: Codex
Context shard: `runtime-core.md`

## Goal

Implement a safe interpreter for basic node types.

## Why Now

Runtime proves the DSL can be executed safely before generator, UI, and channels.

## Non-Goals

No Telegram, WhatsApp, RAG, real AI providers, persistence, or Studio UI.

## Inputs

Validated Workflow JSON DSL.

## Skill/MCP Readiness

- Task type: runtime/core logic.
- Skills/tools expected: local tests and security review.
- Skills/tools available: local shell and TypeScript tooling.
- Missing skills/tools worth recommending: none before reviewing the current prototype.
- Decision: proceed with local review first; no external tools needed.

## Expected Outputs

Runtime session state, channel-neutral output, trace events, condition evaluator, tests.

## Files Likely Touched

`packages/runtime-core/`, runtime docs.

## Acceptance Criteria

- Runtime validates before execution.
- No dynamic code execution.
- Basic nodes execute safely.
- Trace events are produced.
- Tests cover happy and fallback paths.

## Test Plan

Unit tests with clinic example and invalid runtime cases.

## Review Checklist

Runtime safety, determinism, traceability, channel neutrality.

## Risks

Runtime accidentally absorbing channel or provider logic.

## Handoff Notes

Completed on 2026-06-28.

Implemented `packages/runtime-core` as a safe, channel-neutral interpreter for the accepted Workflow DSL contract.

What changed:

- Runtime validates workflow definitions before execution.
- Runtime session state now supports `awaitingInput` for pending question and field collection turns.
- Question nodes prompt, wait, reject empty answers, store declared variables, and advance deterministically.
- Field collection nodes collect required fields only, reject empty values, store `collectedFields`, mirror values into `variables`, and ignore optional fields by default in v0.1.
- `handoff` and `end` are terminal nodes. Handoff ignores outgoing edges even if a legacy/example workflow still contains one.
- `ai_response` and `rag_answer` remain deterministic placeholders only; no provider, RAG, or channel calls.
- Edge selection is deterministic: priority ascending, edge id tie-break, first passing conditional edge, fallback when conditions fail.
- Loop guard defaults to 50 steps per turn and emits a channel-neutral runtime error instead of hanging.
- Trace events now cover node entry, input, message output, question/field prompts, variable/field values, condition evaluation, edge selection, fallback, session end, and runtime errors.
- Condition evaluator is defensive against malformed direct calls and does not evaluate JavaScript strings.

Verification:

- `pnpm --filter @flowai/runtime-core test` passed.
- `pnpm --filter @flowai/runtime-core typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.

Risks remaining:

- Runtime is in-memory only.
- Runtime does not execute action/webhook nodes yet.
- `intent_is` is a deterministic placeholder heuristic, not AI intent classification.
- No API, Telegram, RAG, AI provider, persistence, or Studio behavior is accepted by this task.

Next recommended task:

Start `TASK-003_API_TEST_LOOP` as a review-only pass before accepting or revising the API prototype.
