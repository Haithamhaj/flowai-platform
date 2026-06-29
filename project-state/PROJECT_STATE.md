# Project State

## Current Goal

Prepare TASK-004 Telegram Preview implementation for review.

## Current Reality

`flowai-platform` exists. TASK-000 is done for skeleton/setup. TASK-001 is done for workflow-dsl after review and revision. TASK-002 is done for runtime-core after implementation revision and verification. TASK-003 is done for the API test loop after implementation revision and verification. TASK-004 implementation is complete locally and ready for review. The current accepted operating mode is task-first.

Telegram mock/update preview is implemented locally for TASK-004. Live Telegram polling, production webhooks, WhatsApp, crawling, RAG, AI providers, durable persistence, auth, tenants, billing, Studio UI, and exporters are not accepted or implemented yet.

## Active Decisions

- FlowAI is a Business-to-Workflow Chatbot Generator.
- Old backend is reference-only.
- Skill/MCP Readiness Check is required before every task.
- Workflow JSON DSL is source of truth.
- Runtime core interprets validated Workflow JSON safely and channel-neutrally.
- Runtime proof comes before generator/crawling/UI.
- Telegram preview comes before WhatsApp.
- Channels are adapters, not workflow owners.
- No executable workflow code.
- No unsafe OSS copying.
- Workflow DSL validator is dependency-free for now.
- `handoff` and `end` are terminal runtime nodes.
- Runtime `ai_response` and `rag_answer` are deterministic placeholders only.
- API test loop exposes only health, workflow validation, in-memory runtime start/message/trace/reset.
- API test loop uses `stateSummary` and safe structured errors for test/debug flows.
- TASK-004 preview uses a mock Telegram update endpoint first.
- grammY remains the recommended future dependency for live polling, but no external Telegram SDK has been added yet.
- Production webhook work is later and must include verification.

## Active Risks

- Agents may overbuild without following task files.
- Future AI/RAG/channel work may be claimed before it is tested.
- Manual DSL validation may become harder to maintain if DSL scope expands.
- API runtime test sessions are process-local, temporary, capped in memory, lost on restart, not tenant-safe, and not horizontally scalable.
- Telegram preview may accidentally grow into production channel infrastructure if endpoints, token handling, and persistence are not kept minimal.
- TASK-004 Telegram preview sessions are also process-local and preview-only.

## Protected Areas

- Do not copy code from legacy backend, Dify, Typebot, Firecrawl, or unsafe-license projects.
- Do not add `eval`, `new Function`, arbitrary workflow expressions, or secrets in workflow JSON.
- Do not implement crawling, WhatsApp, Studio UI, RAG, or AI generation without explicit task approval.
- Do not put Telegram bot tokens or webhook secrets in workflow JSON, logs, or runtime traces.

## Next Recommended Action

Review `TASK-004_TELEGRAM_PREVIEW` implementation. Do not treat it as production Telegram deployment; live polling/webhook work needs a separate task.

## Critical References

- `AGENTS.md`
- `docs/00_PROJECT_CONTEXT.md`
- `docs/06_AGENT_WORKFLOW.md`
- `docs/07_TASK_SYSTEM.md`
- `docs/17_SKILL_MCP_READINESS.md`
- `docs/tasks/`
- `docs/shards/`
- `docs/16_PROJECT_SETUP.md`
- `packages/workflow-dsl/src/validator.ts`
- `packages/runtime-core/src/runtime.ts`
- `packages/runtime-core/src/condition-evaluator.ts`
- `apps/api/src/services/runtime-test.service.ts`
- `apps/api/src/routes/runtime.controller.ts`
- `packages/channel-adapters/src/index.ts`
- `packages/channel-adapters/src/telegram/`
- `apps/api/src/services/telegram-preview.service.ts`
- `apps/api/src/routes/telegram-preview.controller.ts`
- `docs/tasks/TASK-004_TELEGRAM_PREVIEW.md`
