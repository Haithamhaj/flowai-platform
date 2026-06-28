# AGENTS.md

This is the operating constitution for AI agents and developers working on FlowAI.

## Project Identity

FlowAI is a Business-to-Workflow Chatbot Generator. It turns a business website, documents/PDFs, or a direct business interview into a validated Workflow JSON DSL that can later be tested, previewed through Telegram, deployed to channels, and exported to Leap/CRM/chatbot platforms.

FlowAI is not a memory system, generic prompt generator, Dify clone, Flowise clone, Typebot clone, manual-only visual builder, or refactor of the old backend.

## Current Phase

Operating pack and task system first. Product code may only be added or changed when a task explicitly permits it and the relevant plan is accepted.

## Required Context Loading

Before doing work:

1. Read `AGENTS.md`.
2. Read `docs/00_PROJECT_CONTEXT.md`.
3. Read the active task file in `docs/tasks/`.
4. Read only the relevant shard from `docs/shards/`.
5. Perform the Skill/MCP Readiness Check in `docs/17_SKILL_MCP_READINESS.md`.
6. Produce a short implementation plan.
7. Wait for approval if the task changes architecture, adds dependencies, changes the DSL, touches security, expands scope, or requires a new external connector/plugin.

## Task-First Rule

Work from one task file at a time. Do not combine backlog items unless the user explicitly approves it. Prefer one task per branch/commit.

## Plan-Before-Code Rule

For any non-trivial task, state the goal, files likely touched, acceptance checks, and risks before editing. Do not start coding if the scope is unclear.

## Skill/MCP Readiness Rule

Before implementation, identify whether the task needs an available skill, MCP, plugin, or connector. Use an available capability when it materially improves correctness or verification. Recommend missing capabilities only when they are high-leverage for the active task. Do not install or assume external capabilities without explicit approval.

## Scope Rules

- No broad refactors.
- No unrelated cleanup.
- No hidden dependencies.
- Do not silently change product behavior.
- Do not claim AI, RAG, Telegram, WhatsApp, or UI behavior works unless it is implemented and tested.

## Code and OSS Rules

- Do not copy code from the legacy backend.
- Do not preserve old architecture.
- Do not copy unsafe OSS code.
- Dify, Typebot, and Firecrawl are learn-only unless licensing is explicitly reviewed.
- Dependency additions require documented need, alternatives, license, maintenance risk, and security risk.

## Workflow Safety Rules

- Workflow definitions are strict JSON.
- No executable workflow strings.
- No `new Function`.
- No `eval`.
- No arbitrary JavaScript expressions.
- Conditions use a safe constrained AST.
- Workflow JSON must not contain secrets.
- Channel adapters must not own core workflow logic.

## During Work

1. Keep changes small.
2. Update tests with code.
3. Keep runtime channel-agnostic.
4. Keep docs updated when decisions, architecture, DSL, security, or workflow behavior changes.
5. Stop and ask if the task requires secrets, credentials, production access, new paid services, destructive git operations, or scope expansion.

## Review Before Done

Before final response:

1. Run relevant tests/build, or state clearly why they were not run.
2. Review scope against the active task.
3. Check for dynamic workflow execution.
4. Check for secrets in config and workflow JSON.
5. Update the task file.
6. Update `docs/10_DECISION_LOG.md` if a decision was made.
7. Write handoff notes.

## Handoff After Every Task

Every completed task must leave enough context for the next agent:

- Current task
- What changed
- Files changed
- Commands run
- Test/build status
- Skill/MCP check result
- Decisions made
- Risks remaining
- Suggested next task
- Open questions

Use `docs/11_HANDOFF_TEMPLATE.md`.

## Required Final Response Format

Final response must include:

1. Task handled.
2. Files changed.
3. Tests/build run and status.
4. Decisions made.
5. Risks remaining.
6. Next recommended task.

## Security-Sensitive Changes

Stop and request approval before changing auth, tenant isolation, secrets, provider credentials, webhook verification, upload handling, runtime execution semantics, or production deployment settings.
