# TASK-001 Workflow DSL

Status: done
Owner/Agent: Codex
Context shard: `workflow-dsl.md`

## Goal

Implement `packages/workflow-dsl` with types, validator, safe condition AST, and a clinic example.

## Why Now

The DSL is the source of truth for runtime, generator, Studio, and exports.

## Non-Goals

No runtime, API, channels, crawling, RAG, or AI generation.

## Inputs

DSL principles, product brief, security rules.

## Skill/MCP Readiness

- Task type: DSL/schema/validation.
- Skills/tools expected: local tests; Context7 only if adding a validation library.
- Skills/tools available: local shell and TypeScript tooling.
- Missing skills/tools worth recommending: none before reviewing the current prototype.
- Decision: proceed with local review first; ask before adding dependencies.

## Expected Outputs

Types, validator, example workflow, DSL tests.

## Files Likely Touched

`packages/workflow-dsl/`, docs if DSL decisions change.

## Acceptance Criteria

- Exactly one start node validation.
- Edge source/target validation.
- Terminal node validation.
- Safe condition AST validation.
- Reject executable condition strings.
- Reject secrets/raw webhook URLs.
- Tests pass.
- Runtime JSON boundary validation returns `ValidationResult` instead of throwing for malformed workflow input.
- Required node-specific fields are validated.
- Duplicate variable, tool, knowledge source, field, quick reply, test, node, and edge ids are rejected.
- Condition variable references must point to declared variables.

## Test Plan

Unit tests for valid example and invalid workflows.

Executed:

- `pnpm --filter @flowai/workflow-dsl test`
- `pnpm --filter @flowai/workflow-dsl typecheck`
- `pnpm test`
- `pnpm build`

## Review Checklist

DSL safety, strict JSON, no secrets, no executable behavior.

## Risks

DSL growing too generic or too close to existing builder clones. This task kept the DSL focused on strict JSON validation and did not add new node types or dependencies.

## Handoff Notes

## Handoff

Current task: TASK-001 Workflow DSL.

What changed:

- Revised the existing workflow-dsl prototype instead of rebuilding.
- Strengthened `validateWorkflow` as a boundary validator for unknown JSON.
- Added validation for required top-level fields, source summary, publish status, dates, arrays, node-specific fields, duplicate ids, condition operand shape, declared condition variables, duplicate fallbacks, and channel raw URLs/secrets.
- Expanded validator tests from 7 to 13 cases.

Files changed:

- `packages/workflow-dsl/src/validator.ts`
- `packages/workflow-dsl/test/validator.test.ts`
- `docs/tasks/TASK-001_WORKFLOW_DSL.md`

Commands run:

- `pnpm --filter @flowai/workflow-dsl test`
- `pnpm --filter @flowai/workflow-dsl typecheck`
- `pnpm test`
- `pnpm build`

Test/build status:

- All passed.

Skill/MCP check:

- Performed.
- Tools used: local shell, TypeScript, Vitest.
- Tools recommended but not installed: none.
- Reasoning: No new validation library or external docs were needed; no dependency was added.

Decisions made:

- Accept the workflow-dsl prototype after revision.
- Keep validation dependency-free for now.

Risks remaining:

- The validator is stronger but still manual. If the DSL expands significantly, a schema library such as Zod or JSON Schema may become worth reviewing.
- Runtime/API prototypes remain provisional until TASK-002 and TASK-003.

Suggested next task:

- TASK-002_RUNTIME_CORE review/revision only.

Open questions:

- Whether future DSL versions should publish JSON Schema for external import/export validation.

Do not forget:

- Do not start TASK-002 without its own Skill/MCP Readiness Check and review pass.
