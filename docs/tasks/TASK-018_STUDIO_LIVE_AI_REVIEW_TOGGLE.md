# TASK-018: Studio Live AI Review Toggle

Status: in progress
Owner/Agent: Codex
Parent: `TASK-017A_BACKEND_ONLY_OPENAI_EXTRACTION_SPIKE`
Context shards: `security.md`, `business-understanding.md`, `testing.md`

## Goal

Expose the backend-only live AI BusinessUnderstanding review inside Studio as an explicit owner-controlled toggle while keeping deterministic fallback, Workflow JSON validation, and secret boundaries intact.

## Scope

- Add a Studio build option for `useLiveAi`.
- Keep live AI disabled by default.
- Use backend-only provider config and adapter from `@flowai/ai-builder-orchestrator`.
- Show clear AI mode status in the owner preview.
- Preserve deterministic fallback when provider is unconfigured or fails.
- Keep Workflow JSON generation deterministic.
- Add Studio tests for live review and unconfigured fallback.

## Non-Goals

- No browser-side key access.
- No provider key in request bodies.
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

- Studio defaults to deterministic fallback.
- Owner can explicitly request live AI review.
- Server reads local provider config only when live AI is requested.
- Preview reports `live_provider`, `deterministic_fallback`, or `unconfigured`.
- Live AI summary/missing questions can appear in the Business Brain panel.
- Safety notes state that Workflow JSON remains deterministic and validated.
- Tests pass.
- Local browser/server smoke shows the toggle renders.

## Test Plan

- `CI=true pnpm --filter @flowai/studio test`
- `CI=true pnpm --filter @flowai/studio typecheck`
- Local server smoke through `pnpm --filter @flowai/studio dev`
- Gate: `CI=true pnpm test`
- Gate: `CI=true pnpm build`
- Gate: `git diff --check`

## Skill/MCP Readiness

- Task type: UI, AI provider boundary, security, testing.
- Skills used: Superpowers TDD, local browser/server verification.
- Extra tools required: none.
- Tool risk: live provider call may use local secret only on explicit owner toggle.

## Next Recommended Task

TASK-019_OWNER_REVIEW_DEMO_WITH_LIVE_AI

Scope for TASK-019:

- Produce a reviewable local owner demo script/output showing deterministic mode and live AI mode side by side.
- No persistence, uploads, crawling, RAG, auth, live channels, or production deployment.
