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

## Current Phase

- PHASE-006 Source Brain Foundation.
- Current implementation target: TASK-006A_SOURCE_DOCUMENT_TEXT_INGESTION.
- Boundary: `packages/source-ingestion` only, with docs and tests.

## Next

- Review TASK-006A implementation PR.
- After acceptance, the next recommended task is TASK-006B_SOURCE_DOCUMENT_REVIEW_INTEGRATION.

## Later

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
- Studio UI.
- WhatsApp.
- Live Telegram polling/webhooks.
- Exporters.
- Workflow DSL contract or runtime-core semantic changes.
