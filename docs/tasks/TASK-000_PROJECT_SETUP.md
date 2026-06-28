# TASK-000 Project Setup

Status: done
Owner/Agent: Codex
Context shard: `architecture.md`

## Goal

Create the project skeleton only after this operating pack is accepted.

## Why Now

Future work needs a stable workspace, package boundaries, and task discipline.

## Non-Goals

No product runtime, API, Studio UI, Telegram, crawling, RAG, or generation.

## Inputs

Operating pack, target architecture, package boundary decisions.

## Skill/MCP Readiness

- Task type: project setup/docs.
- Skills/tools expected: local file inspection only.
- Skills/tools available: local shell and file editing.
- Missing skills/tools worth recommending: none.
- Decision: proceed without extra tools.

## Expected Outputs

Minimal workspace structure, README, env example, local dev placeholders if approved.

## Files Likely Touched

Root config, `apps/`, `packages/`, docs.

## Acceptance Criteria

- Workspace exists.
- Package boundaries match target architecture.
- No new product behavior was implemented during this task.
- Existing prototype product code is documented as provisional until TASK-001 through TASK-003 are reviewed.
- Install/build plan is documented.

## Test Plan

No package config was changed in this task. Existing workspace verification can be run with `pnpm build` and `pnpm test`.

## Review Checklist

Scope, simplicity, dependency justification.

## Risks

Existing prototype files may be mistaken for accepted product code. This is mitigated by `docs/16_PROJECT_SETUP.md` and `project-state/PROJECT_STATE.md`.

## Handoff Notes

## Handoff

Current task: TASK-000 Project Setup.

What changed: Accepted/documented the project skeleton after operating pack approval. Added setup documentation and clarified that existing prototype code is provisional.

Files changed:

- `docs/16_PROJECT_SETUP.md`
- `docs/tasks/TASK-000_PROJECT_SETUP.md`

Commands run:

- `sed -n '1,220p' AGENTS.md`
- `sed -n '1,200p' docs/00_PROJECT_CONTEXT.md`
- `sed -n '1,220p' docs/tasks/TASK-000_PROJECT_SETUP.md`
- `sed -n '1,200p' docs/shards/architecture.md`
- `find ...`

Test/build status: Not run yet in this task because no package config or product code changed.

Decisions made: TASK-000 accepts skeleton only. Existing prototype code must be reconciled through TASK-001, TASK-002, and TASK-003.

Risks remaining: Prototype code exists and can confuse task status if future agents skip the task files.

Suggested next task: TASK-001_WORKFLOW_DSL.

Open questions: Whether to accept the existing workflow-dsl prototype as the base for TASK-001 or rebuild it under task review.

Do not forget: Read `docs/shards/workflow-dsl.md` before starting TASK-001.
