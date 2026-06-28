# TASK-003 API Test Loop

Status: ready
Owner/Agent: unassigned
Context shard: `architecture.md`, `runtime-core.md`

## Goal

Create a minimal API to validate workflows and test runtime sessions.

## Why Now

The product needs a simple way to exercise workflow behavior before UI and channels.

## Non-Goals

No auth, tenants, production persistence, Telegram, WhatsApp, crawling, RAG, or generation.

## Inputs

Workflow DSL and runtime core.

## Skill/MCP Readiness

- Task type: API.
- Skills/tools expected: Context7 if NestJS docs are needed; local curl/tests for verification.
- Skills/tools available: local shell, TypeScript tooling, curl.
- Missing skills/tools worth recommending: none before reviewing the current prototype.
- Decision: proceed with local review first; use Context7 only if API framework behavior is unclear.

## Expected Outputs

Health endpoint, validate endpoint, test session start/message/trace endpoints.

## Files Likely Touched

`apps/api/`.

## Acceptance Criteria

- API accepts workflow JSON.
- API validates workflow.
- API starts an in-memory test session.
- API accepts user messages.
- API returns channel-neutral output and trace.
- Tests or curl proof pass.

## Test Plan

API service tests and manual curl flow.

## Review Checklist

Boundary validation, no auth claims, no persistence claims.

## Risks

In-memory behavior mistaken for production persistence.

## Handoff Notes

Pending.
