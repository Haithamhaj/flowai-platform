# TASK-001 Workflow DSL

Status: ready
Owner/Agent: unassigned
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

## Test Plan

Unit tests for valid example and invalid workflows.

## Review Checklist

DSL safety, strict JSON, no secrets, no executable behavior.

## Risks

DSL growing too generic or too close to existing builder clones.

## Handoff Notes

Pending.
