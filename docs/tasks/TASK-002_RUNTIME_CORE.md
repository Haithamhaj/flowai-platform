# TASK-002 Runtime Core

Status: ready
Owner/Agent: unassigned
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

Pending.
