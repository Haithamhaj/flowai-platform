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
- TASK-018 Studio live AI review toggle.
- TASK-019 owner review demo with live AI.
- TASK-020 document intelligence evaluation.
- TASK-020A extracted document contract and fixture harness.
- TASK-020B OpenAI RAG catalog knowledge base.
- TASK-021 visible full system trial.
- TASK-022 website crawling with Crawlee.
- TASK-023 crawl to AI/RAG review.
- TASK-024 browser crawl review fixtures.

## Current Phase

- Customer-facing visible product experience.
- Active task: TASK-025 customer chat screen.
- Boundary: separate `/customer` route only; keep `/` Studio unchanged; no server upload endpoint, file storage, parser dependency, OCR implementation, PDF parsing, Google integration, persistence, auth/tenants, private-network crawling by default, live Telegram, live WhatsApp, live CRM/ticketing credentials, production webhook, workflow DSL change, runtime semantic change, or AI-generated final Workflow JSON.

## Next

- Complete TASK-025_CUSTOMER_CHAT_SCREEN.
- Then run owner review of `/customer` before choosing the next product task.

## Later

- OCR/parser review/spike.
- Google Document AI extraction spike.
- Real upload API after auth, limits, storage, and operational controls are planned.
- BusinessUnderstanding / BusinessGraph extraction from reviewed source documents.
- Browser-rendered crawling.
- Crawl quality fixtures and owner review examples.
- Customer chat polish after owner review.
- Production RAG lifecycle: persistence, expiry, deletion, tenant isolation, citations, and review policy.
- Studio UI.
- WhatsApp.
- Exporters.

## Blocked

- PDF ingestion until parser/security evaluation is accepted.
- Crawling until source pipeline and robots/safety plan are accepted.
- Production RAG until persistence, retention, tenant isolation, source citation, and retrieval review boundaries are approved.
- Durable storage until persistence, retention, and tenant/security plans are approved.

## Requires Approval

- External dependencies.
- File upload endpoints.
- PDF, DOCX, OCR, or rich parser support.
- Production RAG, embeddings beyond OpenAI Vector Stores, or self-hosted vector DB.
- AI/provider calls beyond backend-only BusinessUnderstanding refinement.
- Persistence/database.
- Auth, tenants, or billing.
- Studio UI or visual workflow editor.
- WhatsApp.
- Live Telegram polling/webhooks.
- Exporters.
- Workflow DSL contract or runtime-core semantic changes.
