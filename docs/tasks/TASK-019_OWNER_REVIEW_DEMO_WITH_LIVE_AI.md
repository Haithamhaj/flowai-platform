# TASK-019: Owner Review Demo With Live AI

Status: in progress
Owner/Agent: Codex
Parent: `TASK-018_STUDIO_LIVE_AI_REVIEW_TOGGLE`

## Goal

Create a reviewable owner-facing demo artifact that shows what FlowAI does today with deterministic fallback and live AI review side by side.

## Scope

- Add a local demo command for owner review.
- Generate a Markdown output file with deterministic and live AI summaries.
- Use ignored local provider config only when available.
- Keep secrets out of output.
- Keep Workflow JSON generation deterministic.

## Non-Goals

- No new product feature beyond demo output.
- No upload endpoint.
- No PDF/DOCX parsing.
- No crawling.
- No RAG, embeddings, or vector DB.
- No persistence/database.
- No auth, tenants, or billing.
- No live Telegram or WhatsApp.
- No production deployment.
- No AI-generated final Workflow JSON.

## Acceptance Criteria

- `pnpm demo:flowai:live` writes `docs/demo/FLOWAI_LIVE_AI_OWNER_REVIEW.md`.
- Output shows deterministic mode and live AI review mode.
- Output explains what is deterministic and what AI improves.
- Output does not contain provider secrets.
- Tests/build/diff checks pass.

## Test Plan

- `pnpm demo:flowai:live`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`

## Next Recommended Task

TASK-020_OWNER_UI_POLISH_FOR_REVIEW

Scope for TASK-020:

- Improve visual hierarchy and owner clarity in Studio now that live AI can be toggled.
- No persistence, uploads, crawling, RAG, auth, live channels, or production deployment.
