# TASK-003 API Test Loop

Status: done
Owner/Agent: Codex
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

Completed on 2026-06-29.

Implemented the minimal API test loop revision in `apps/api` only.

Endpoints accepted:

- `GET /health`
- `POST /workflows/validate`
- `POST /runtime/test/start`
- `POST /runtime/test/:sessionId/message`
- `GET /runtime/test/:sessionId/trace`
- `POST /runtime/test/:sessionId/reset`

What changed:

- Workflow validation still delegates to `@flowai/workflow-dsl`.
- Runtime execution still delegates to `@flowai/runtime-core`.
- API responses now return `stateSummary` and `traceDelta` instead of exposing full runtime state as an unnamed production shape.
- Runtime messages now accept `{ "message": string }`.
- Missing, non-string, and blank messages return safe `400 INVALID_REQUEST` errors.
- Unknown sessions return safe `404 UNKNOWN_SESSION` errors.
- Ended sessions return safe `409 SESSION_ENDED` errors and do not mutate runtime state.
- Invalid workflows return safe `400 INVALID_WORKFLOW` errors with validation issues.
- Trace responses include `sessionId`, `workflowId`, and ordered runtime trace.
- In-memory test sessions remain process-local and temporary, capped at 100 sessions, with per-session reset support.

Verification:

- `pnpm --filter @flowai/api test` passed.
- `pnpm --filter @flowai/api typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.

Risks remaining:

- In-memory sessions are not production persistence.
- Sessions are process-local, lost on restart, not tenant-safe, and not horizontally scalable.
- API test loop intentionally does not implement auth, tenants, billing, Telegram, WhatsApp, crawling, RAG, AI providers, Studio UI, exporters, or durable storage.
- Controller tests avoid opening a network listener because the local sandbox blocks listening on `127.0.0.1`; they still exercise route/controller behavior and service boundaries.

Next recommended task:

Start `TASK-004_TELEGRAM_PREVIEW` only after reviewing/accepting this API test loop.
