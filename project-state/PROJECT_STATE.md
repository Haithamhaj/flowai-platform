# Project State

## Current Goal

Accept and document the FlowAI project skeleton under TASK-000 after operating pack approval.

## Current Reality

`flowai-platform` exists. TASK-000 is documented as done for skeleton/setup only. The current accepted operating mode is task-first. Product work should not continue unless a task explicitly permits it and the plan is approved.

Some early prototype files exist from prior setup. Treat them as provisional until TASK-001, TASK-002, and TASK-003 are reviewed and accepted.

## Active Decisions

- FlowAI is a Business-to-Workflow Chatbot Generator.
- Old backend is reference-only.
- Skill/MCP Readiness Check is required before every task.
- Workflow JSON DSL is source of truth.
- Runtime proof comes before generator/crawling/UI.
- Telegram preview comes before WhatsApp.
- Channels are adapters, not workflow owners.
- No executable workflow code.
- No unsafe OSS copying.

## Active Risks

- Existing prototype code can create confusion with the current “operating pack first” instruction.
- Agents may overbuild without following task files.
- Future AI/RAG/channel work may be claimed before it is tested.

## Protected Areas

- Do not copy code from legacy backend, Dify, Typebot, Firecrawl, or unsafe-license projects.
- Do not add `eval`, `new Function`, arbitrary workflow expressions, or secrets in workflow JSON.
- Do not implement crawling, Telegram, WhatsApp, Studio UI, RAG, or AI generation without explicit task approval.

## Next Recommended Action

Start `TASK-001_WORKFLOW_DSL`. First decide whether to accept the existing prototype as the base or rebuild it under task review.

## Critical References

- `AGENTS.md`
- `docs/00_PROJECT_CONTEXT.md`
- `docs/06_AGENT_WORKFLOW.md`
- `docs/07_TASK_SYSTEM.md`
- `docs/17_SKILL_MCP_READINESS.md`
- `docs/tasks/`
- `docs/shards/`
- `docs/16_PROJECT_SETUP.md`
