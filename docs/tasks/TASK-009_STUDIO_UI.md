# TASK-009 Studio UI

Status: proposed
Owner/Agent: unassigned
Context shard: `studio-ui.md`

## Goal

Create visual review/edit UI after runtime/API proof.

## Why Now

Users need to inspect and adjust generated workflows, but UI should follow proven semantics.

## Non-Goals

No landing page, no decorative mock-only UI, no UI-owned workflow logic.

## Inputs

Validated DSL, API test loop, exporter needs, design principles.

## Skill/MCP Readiness

- Task type: UI.
- Skills/tools expected: Context7 for React Flow/Xyflow docs; Browser/Playwright verification.
- Skills/tools available: local tooling; browser verification when UI exists.
- Missing skills/tools worth recommending: Browser/Playwright must be available before UI acceptance.
- Decision: pause for UI stack confirmation and verification plan before implementation.

## Expected Outputs

Canvas, inspector, validation panel, test chat, export panel.

## Files Likely Touched

`apps/studio/`, `packages/workflow-dsl/`, `packages/exporters/`.

## Acceptance Criteria

- UI edits DSL, not a separate model.
- Validation errors are visible.
- Test chat uses API/runtime path.
- Responsive operational layout.

## Test Plan

Component tests, basic browser verification, screenshots for UI changes.

## Review Checklist

Product fit, simplicity, accessibility, no hidden behavior changes.

## Risks

Building a generic visual builder instead of a workflow review tool.

## Handoff Notes

Pending.
