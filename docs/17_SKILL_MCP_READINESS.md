# 17 Skill/MCP Readiness

Before starting any task, the agent must perform a lightweight Skill/MCP Readiness Check.

The goal is not to install many tools. The goal is to avoid starting a task without a clearly useful capability, and to avoid adding tools that create noise.

## Required Check

For the active task, identify:

1. Task type: DSL, runtime, API, UI, Telegram, crawling, docs, security, GitHub/project management, or AI provider.
2. Relevant built-in skill, MCP, plugin, or connector if already available.
3. Whether the task can proceed without extra tools.
4. Whether a missing tool is important enough to recommend before implementation.
5. Any tool risk: secrets, broad permissions, license risk, overlapping capability, or complexity.

## Default Tool Expectations

- Docs-only tasks: usually no extra tool.
- DSL/runtime/API tasks: local files and tests first; use Context7 only for current library docs when needed.
- UI tasks: browser/Playwright verification is expected.
- Modern library tasks: use Context7 or official docs before implementation.
- GitHub tasks: use GitHub tooling when available.
- OpenAI provider/API key tasks: use OpenAI Platform tooling; do not manually handle secrets.
- Telegram tasks: review Telegram adapter skill/tool options before implementation; do not hardcode tokens.
- Crawling/document ingestion tasks: review security shard first; recommend capability only after safety plan.

## When To Stop

Stop and ask before proceeding if:

- The task requires installing a new external connector/plugin.
- The task needs secrets, credentials, or production access.
- The available tool has broad permissions that are not clearly needed.
- The missing tool materially changes implementation quality or safety.

## Handoff Requirement

Every task handoff must state:

- Skill/MCP check performed: yes/no.
- Tools used.
- Tools recommended but not installed.
- Why the task proceeded without additional tools, if applicable.

