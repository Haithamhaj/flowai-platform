# TASK-014: Visual Workflow Editor

Status: implemented
Owner/Agent: Codex
Context shards: `studio-ui.md`, `security.md`, `testing.md`

## Goal

Let the owner inspect and edit the generated chatbot decision tree on web while keeping strict Workflow JSON as the source of truth.

## Scope

- Add a visual workflow editor model for Studio.
- Render generated workflow nodes and edges as a simple web tree/canvas.
- Add node inspector for editable node text.
- Add local add/delete/connect controls.
- Revalidate edited Workflow JSON after each edit.
- Re-run runtime test conversation and Telegram mock preview from the edited workflow.
- Add tests for visual model creation, edit text, add node, delete invalidation, and edited preview reuse.

## Non-Goals

- No external visual editor dependency.
- No React Flow/Xyflow dependency yet.
- No persistence/database.
- No auth/tenants.
- No live Telegram or WhatsApp.
- No AI provider call.
- No upload endpoint, crawling, RAG, exporters, or production publish flow.
- No Workflow DSL or runtime semantic change.
- No executable workflow strings, `eval`, `new Function`, or arbitrary JavaScript conditions.

## Acceptance Criteria

- Studio shows a `Visual Workflow Editor` panel.
- Canvas shows generated nodes and edges.
- Inspector can edit supported node text.
- Add/delete/connect controls operate on Workflow JSON.
- Invalid edited workflows show validation errors.
- Runtime test and Telegram mock preview use the edited workflow.
- Tests and build pass.

## Skill/MCP Readiness

- Task type: UI, workflow validation, runtime preview, testing.
- Skills/tools used: Superpowers `using-superpowers`, `executing-plans`, `test-driven-development`, browser verification.
- Can proceed without extra tools: yes, because TASK-014 uses current local Studio and no external dependency.
- Missing tools worth recommending: React Flow/Xyflow may be reviewed in a later richer editor task, but is intentionally not added here.
- Tool risk: dependency addition and persistence are out of scope.

## Verification Commands

Run:

```bash
CI=true pnpm --filter @flowai/studio test
CI=true pnpm --filter @flowai/studio build
CI=true pnpm test
CI=true pnpm build
git diff --check
```

Browser/local verification:

```bash
PORT=4178 pnpm dev:flowai-studio
```

Confirm the local Studio page shows `Visual Workflow Editor`, `Node inspector`, and validation status.

## Risks

- The editor is intentionally simple and not yet a full production graph editor.
- Edits are local preview edits only; there is no persistence or publish flow.
- Layout is deterministic and basic; complex graphs may need a future graph layout/editor dependency review.
- Deleting nodes can intentionally create invalid workflows so the owner can see validation feedback.

## Handoff Notes

Recommended next task after acceptance: TASK-015_CHANNEL_PREVIEW_WORKSPACE.

Implementation summary:

- Added `apps/studio/src/workflow-editor.ts`.
- Added visual workflow model, editor commands, validation, runtime preview, and Telegram preview reuse.
- Added Studio editor panel with SVG canvas, node inspector, add/delete/connect controls, and validation panel.
- Added local `/api/workflow-editor/command` endpoint for edited workflow preview.
