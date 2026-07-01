# TASK-016: Export And Integration Hub

Status: implemented
Owner/Agent: Codex
Context shards: `exporters.md`, `studio-ui.md`

## Goal

Let the owner copy reviewable FlowAI Workflow JSON plus CRM and ticketing mapping plans from the local Studio.

## Scope

- Implement deterministic local export helpers in `@flowai/exporters`.
- Build a FlowAI JSON export package from validated Workflow JSON.
- Build CRM and ticketing mapping plans from workflow variables and handoff routing.
- Report unsupported nodes explicitly.
- Remove channel secrets from exported workflow channel settings.
- Show copy-ready export blocks in Studio.

## Non-Goals

- No live CRM credentials.
- No live ticketing credentials.
- No production webhooks.
- No external platform API calls.
- No file persistence or download storage.
- No Leap/exporter-specific deployment adapter.
- No runtime-core or Workflow DSL semantic changes.
- No executable workflow strings, `eval`, `new Function`, or arbitrary JavaScript conditions.

## Dependency Justification

- Added internal workspace dependency `@flowai/workflow-dsl` to `@flowai/exporters` so exporters can validate the workflow before packaging.
- Added internal workspace dependency `@flowai/exporters` to `@flowai/studio` so Studio can render the export hub.
- No external package dependency was added.

## Acceptance Criteria

- User can view/copy FlowAI Workflow JSON.
- User can view/copy CRM mapping plan.
- User can view/copy ticketing mapping plan.
- Unsupported nodes are explicit.
- Export output does not include secret-like channel settings.
- Studio shows `Export & Integration Hub`.
- Tests and build pass.

## Verification Commands

Run:

```bash
CI=true pnpm --filter @flowai/exporters test
CI=true pnpm --filter @flowai/exporters build
CI=true pnpm --filter @flowai/studio test
CI=true pnpm --filter @flowai/studio build
CI=true pnpm test
CI=true pnpm build
git diff --check
```

Browser/local verification:

```bash
PORT=4178 node apps/studio/dist/server.js
```

Confirm the local Studio page shows `Export & Integration Hub`, `FlowAI Workflow JSON`, `CRM mapping plan`, and `Ticketing mapping plan`.

## Risks

- Mapping plans are suggestions, not production integrations.
- Unsupported webhook/action/AI/RAG nodes must remain visible so users do not assume external systems are connected.
- Future platform-specific exporters may need stricter schemas per target system.

## Handoff Notes

Recommended next task after acceptance: TASK-017_LIVE_AI_PROVIDER_PLANNING_OR_EXTRACTION_SPIKE.

Implementation summary:

- Replaced placeholder exporter status with deterministic export APIs.
- Added CRM and ticketing mapping plan builders.
- Added Studio export hub panel.
- Kept all exports copy-ready local JSON with no external credentials or API calls.
