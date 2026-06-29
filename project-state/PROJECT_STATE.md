# Project State

## Current Goal

Prepare for `TASK-003_API_TEST_LOOP` review after completing the Workflow DSL and Runtime Core foundations.

## Current Reality

`flowai-platform` exists. TASK-000 is done for skeleton/setup. TASK-001 is done for workflow-dsl after review and revision. TASK-002 is done for runtime-core after implementation revision and verification. The current accepted operating mode is task-first.

API prototype files still exist from prior setup. Treat them as provisional until TASK-003 is reviewed and accepted.

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

## Active Risks

- API prototype code can create confusion if future agents skip task files.
- Agents may overbuild without following task files.
- Future AI/RAG/channel work may be claimed before it is tested.
- Manual DSL validation may become harder to maintain if DSL scope expands.
- Runtime is in-memory only and not yet connected through an accepted API test loop.

## Protected Areas

- Do not copy code from legacy backend, Dify, Typebot, Firecrawl, or unsafe-license projects.
- Do not add `eval`, `new Function`, arbitrary workflow expressions, or secrets in workflow JSON.
- Do not implement crawling, Telegram, WhatsApp, Studio UI, RAG, or AI generation without explicit task approval.

## Next Recommended Action

Start `TASK-003_API_TEST_LOOP` with a review-only pass first. Do not assume the API prototype is accepted until reviewed.

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
