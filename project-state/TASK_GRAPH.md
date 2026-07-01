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

## Current Phase

- Visible MVP demo.
- Current implementation target: browser-based FlowAI Studio Preview plus `pnpm dev:flowai-studio`.
- Boundary: local demo app only; no upload endpoint, parser dependency, persistence, crawling, RAG, WhatsApp, live Telegram, exporters, auth, tenants, or production channel work.
- AI boundary: optional backend-only OpenAI enrichment when `OPENAI_API_KEY` is configured; deterministic fallback remains required.

## Next

- Review and run the visible browser MVP demo.
- After acceptance, the next recommended task is owner review and design choice.

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
- Production AI/provider calls beyond local demo enrichment.
- Persistence/database.
- Auth, tenants, or billing.
- Production Studio UI.
- WhatsApp.
- Live Telegram polling/webhooks.
- Exporters.
- Workflow DSL contract or runtime-core semantic changes.
