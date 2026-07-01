# Task Graph

## Completed

- TASK-000 Project Setup.
- TASK-001 Workflow DSL.
- TASK-002 Runtime Core.
- TASK-003 API Test Loop.
- TASK-004 Telegram Preview Mock.
- TASK-005A BusinessUnderstanding direct interview analyzer.
- TASK-005B deterministic workflow draft generator.
- TASK-005C workflow draft API endpoint.
- TASK-005D internal vertical slice smoke.
- TASK-006 document ingestion planning.
- TASK-006A source document text ingestion.
- Owner-first AI builder product plan.
- TASK-010 owner-first AI builder orchestration planning.
- TASK-011 owner-first builder UI.
- TASK-012 AI builder prompt pack and mocked orchestrator.
- TASK-013 product catalog workspace.

## Current Phase

- Owner-first visible product rebuild.
- Current implementation target: TASK-014 visual workflow editor.
- Boundary: local visual workflow editing and preview only; no live provider call, upload endpoint, parser dependency, persistence, crawling, RAG, WhatsApp, live channel, exporter, external visual editor dependency, workflow DSL, or runtime semantic change.

## Next

- Review TASK-014 visual workflow editor.
- After acceptance, the next recommended task is TASK-015_CHANNEL_PREVIEW_WORKSPACE.

## Later

- TASK-015 channel preview workspace.
- TASK-016 export and integration hub.
- PDF parser review/spike.
- Real upload API after auth, limits, storage, and operational controls are planned.
- BusinessUnderstanding / BusinessGraph extraction from reviewed source documents.
- Crawling.
- RAG.
- Studio UI.
- WhatsApp.
- Exporters.

## Blocked

- PDF ingestion until parser/security evaluation is accepted.
- Crawling until source pipeline and robots/safety plan are accepted.
- RAG until sourceRefs, chunking, citation, and retrieval boundaries are approved.
- Durable storage until persistence, retention, and tenant/security plans are approved.

## Requires Approval

- External dependencies.
- File upload endpoints.
- PDF, DOCX, OCR, or rich parser support.
- RAG, embeddings, or vector DB.
- AI/provider calls.
- Persistence/database.
- Auth, tenants, or billing.
- Studio UI or visual workflow editor.
- WhatsApp.
- Live Telegram polling/webhooks.
- Exporters.
- Workflow DSL contract or runtime-core semantic changes.
