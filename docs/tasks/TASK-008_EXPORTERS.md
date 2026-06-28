# TASK-008 Exporters

Status: proposed
Owner/Agent: unassigned
Context shard: `exporters.md`

## Goal

Export validated workflows to Native JSON, Mermaid, React Flow, and Leap Draft.

## Why Now

Exportability is part of FlowAI’s product value.

## Non-Goals

No runtime changes, no channel deployment, no platform-specific secrets.

## Inputs

Validated Workflow JSON DSL and target export format definitions.

## Skill/MCP Readiness

- Task type: exporters.
- Skills/tools expected: local tests; Mermaid docs only if renderer behavior is needed.
- Skills/tools available: local tooling.
- Missing skills/tools worth recommending: none initially.
- Decision: proceed with deterministic local exporters after DSL is accepted.

## Expected Outputs

Exporter interfaces, deterministic outputs, unsupported-feature warnings.

## Files Likely Touched

`packages/exporters/`, docs, tests.

## Acceptance Criteria

- Exports are deterministic.
- Unsupported features are reported.
- Secrets are excluded.
- Tests cover sample workflow.

## Test Plan

Snapshot or structural tests for each export format.

## Review Checklist

Semantic preservation, no secret leakage, platform boundaries.

## Risks

Exports drifting from runtime semantics.

## Handoff Notes

Pending.
