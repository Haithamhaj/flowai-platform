# TASK-017A: Backend-Only OpenAI Extraction Spike

Status: in progress
Owner/Agent: Codex
Parent: `TASK-017_LIVE_AI_PROVIDER_PLANNING_OR_EXTRACTION_SPIKE`
Context shards: `security.md`, `business-understanding.md`, `testing.md`

## Goal

Add the first narrow live AI provider spike for FlowAI BusinessUnderstanding refinement while keeping the deterministic pipeline, sourceRefs, validation, and Workflow JSON safety boundaries intact.

## Scope

- Add a backend-only OpenAI Responses API provider adapter under `packages/ai-builder-orchestrator`.
- Use no new dependency; rely on platform `fetch`.
- Keep provider disabled unless explicitly configured.
- Allow local development config from ignored `.flowai.local.json` only when explicitly allowed by caller.
- Keep CI and automated tests mocked; no live provider call in CI.
- Return provider output as unknown data to the existing orchestrator parser.
- Sanitize provider errors and diagnostics.
- Add an optional local smoke script for one source-backed extraction run.

## Non-Goals

- No OpenAI SDK dependency.
- No browser-side key access.
- No Studio UI live provider wiring.
- No upload endpoint.
- No PDF/DOCX parsing.
- No crawling.
- No RAG, embeddings, or vector DB.
- No persistence/database.
- No auth, tenants, or billing.
- No live Telegram or WhatsApp.
- No production deployment.
- No AI-generated final Workflow JSON.
- No Workflow DSL or runtime-core semantic change.

## Acceptance Criteria

- Provider config reports `configured: true/false` without exposing keys.
- Provider can read environment config and allowed ignored local config.
- Provider sends a strict JSON schema request to OpenAI Responses API.
- Orchestrator catches provider failures and falls back deterministically with sanitized diagnostics.
- Automated tests cover disabled config, local config, mocked provider request shape, and sanitized fallback.
- Optional local smoke confirms live provider can return structured output without printing secrets.
- Full repo test/build passes.
- `git diff --check` passes.

## Test Plan

- `CI=true pnpm --filter @flowai/ai-builder-orchestrator test`
- `CI=true pnpm --filter @flowai/ai-builder-orchestrator typecheck`
- Optional local: `pnpm smoke:flowai-ai`
- Gate: `CI=true pnpm test`
- Gate: `CI=true pnpm build`
- Gate: `git diff --check`

## Skill/MCP Readiness

- Task type: AI provider, security, testing.
- Skills used: Superpowers TDD, OpenAI API key gate, official OpenAI docs.
- Extra tools required: none.
- Tool risk: live provider call uses local secret and network only in optional non-CI smoke.

## Next Recommended Task

TASK-018_STUDIO_LIVE_AI_REVIEW_TOGGLE

Scope for TASK-018:

- Add explicit Studio UI toggle/status for live AI review.
- Keep disabled by default.
- Backend-only provider access.
- No upload endpoints, persistence, RAG, crawling, live channels, auth, or production deployment.
