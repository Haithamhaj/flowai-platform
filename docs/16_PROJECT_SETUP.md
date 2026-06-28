# 16 Project Setup

This file records the accepted project skeleton after the operating pack was approved.

## Workspace

- Package manager: `pnpm`
- Workspace file: `pnpm-workspace.yaml`
- Root config: `package.json`, `tsconfig.base.json`
- Local environment template: `.env.example`
- Local infrastructure placeholder: `docker-compose.dev.yml`

## Current Directories

- `apps/api`: API boundary placeholder/prototype area.
- `apps/studio`: Studio UI placeholder/prototype area.
- `packages/workflow-dsl`: Workflow DSL boundary.
- `packages/runtime-core`: Runtime interpreter boundary.
- `packages/shared`: Shared primitives boundary.
- `packages/business-understanding`: Future website/document/interview understanding boundary.
- `packages/workflow-generator`: Future generation boundary.
- `packages/channel-adapters`: Future Telegram/WhatsApp/web adapter boundary.
- `packages/exporters`: Future export boundary.
- `docs`: Operating pack, task system, shards, decisions.
- `project-state`: Short operational state and visual system map.

## Important Reconciliation Note

Some prototype implementation files existed before this operating pack was approved. Treat that code as provisional until the matching task is explicitly reviewed:

- `TASK-001_WORKFLOW_DSL`
- `TASK-002_RUNTIME_CORE`
- `TASK-003_API_TEST_LOOP`

Do not expand or rely on that prototype as accepted product code until those tasks are handled one by one.

## Install And Build Plan

```bash
pnpm install
pnpm build
pnpm test
```

Local API development, once approved by the active task:

```bash
pnpm dev:api
```

Local infrastructure, once persistence/RAG work is approved:

```bash
docker compose -f docker-compose.dev.yml up -d
```

## Scope Control

TASK-000 accepts the project skeleton and operating structure only. It does not approve new runtime, API, Studio UI, Telegram, crawling, RAG, AI generation, or WhatsApp work.

