# TASK-004 Telegram Preview

Status: proposed
Owner/Agent: unassigned
Context shard: `telegram-preview.md`

## Goal

Add Telegram preview after runtime/API works.

## Why Now

Telegram is the first low-friction external channel for real preview.

## Non-Goals

No WhatsApp, no production channel platform, no runtime logic changes.

## Inputs

Channel-neutral runtime output, session APIs, Telegram bot token via secret/env.

## Skill/MCP Readiness

- Task type: channel adapter.
- Skills/tools expected: Context7/official docs for grammY or Telegraf; secret-safe token handling.
- Skills/tools available: local tooling; external Telegram live test only with explicit approval.
- Missing skills/tools worth recommending: Telegram-specific capability only when starting this task.
- Decision: pause for dependency/tool choice and token handling approval before implementation.

## Expected Outputs

Telegram adapter, local preview mode, message mapping, tests/mocks.

## Files Likely Touched

`packages/channel-adapters/`, `apps/api/`, docs.

## Acceptance Criteria

- No hardcoded token.
- Adapter maps runtime output without owning workflow logic.
- Local preview can be tested.
- Webhook/long-polling choice is documented.

## Test Plan

Mock adapter tests; optional live Telegram smoke only with approved token.

## Review Checklist

Secrets, adapter boundary, no workflow duplication.

## Risks

Telegram behavior drifting from core runtime.

## Handoff Notes

Pending.
