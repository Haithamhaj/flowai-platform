# 12 Context Shards

Agents should not read every document every time.

Always read:

- `AGENTS.md`
- `docs/00_PROJECT_CONTEXT.md`
- Current task file
- Relevant shard only
- `docs/17_SKILL_MCP_READINESS.md` before implementation

## Task To Shard Map

- DSL task -> `docs/shards/workflow-dsl.md`
- Runtime task -> `docs/shards/runtime-core.md`
- Telegram task -> `docs/shards/telegram-preview.md`
- Crawler task -> `docs/shards/business-understanding.md` + `docs/shards/security.md`
- Exporter task -> `docs/shards/exporters.md`
- Studio task -> `docs/shards/studio-ui.md`
- Security task -> `docs/shards/security.md`
- Testing task -> `docs/shards/testing.md`

Read additional shards only when the task crosses boundaries.
