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
- TASK-014 visual workflow editor.
- TASK-015 channel preview workspace.
- TASK-016 export and integration hub.
- TASK-017 live AI provider planning.
- TASK-017A backend-only OpenAI extraction spike.

## Current Phase

- Owner-first visible product rebuild.
- Current implementation target: TASK-018 Studio live AI review toggle.
- Boundary: explicit owner toggle and backend-only provider access only; no browser key access, upload endpoint, parser dependency, persistence, crawling, RAG, live Telegram, live WhatsApp, live CRM/ticketing credentials, production webhook, workflow DSL, runtime semantic change, or AI-generated final Workflow JSON.

## Next

- Review TASK-018 Studio live AI review toggle PR.
- After acceptance, the next recommended task is TASK-019_OWNER_REVIEW_DEMO_WITH_LIVE_AI.

## Later

- TASK-019 owner review demo with live AI.
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
- AI/provider calls beyond backend-only BusinessUnderstanding refinement.
- Persistence/database.
- Auth, tenants, or billing.
- Studio UI or visual workflow editor.
- WhatsApp.
- Live Telegram polling/webhooks.
- Exporters.
- Workflow DSL contract or runtime-core semantic changes.
