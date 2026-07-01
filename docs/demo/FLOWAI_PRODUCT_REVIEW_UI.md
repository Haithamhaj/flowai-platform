# FlowAI Product Review UI

## Run

```bash
pnpm dev:flowai-studio
```

Open:

```text
http://127.0.0.1:4177
```

Optional local AI mode:

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-4.1-mini
pnpm dev:flowai-studio
```

The API key is read only by the local Node demo server. It is not sent to browser code, workflow JSON, BusinessUnderstanding, source documents, traces, or logs.

## What The Owner Can See

- Select Clinic Appointment, Service Lead, FAQ Support, Arabic Clinic, Unsupported Ecommerce, or Custom Input.
- Edit source markdown/text.
- Run deterministic analysis.
- Run AI-assisted analysis when `OPENAI_API_KEY` is configured.
- Review SourceDocument/sourceRefs and extracted facts.
- Edit visible facts for review and regenerate from source.
- Inspect BusinessUnderstanding and WorkflowGenerationPlan.
- See a visual workflow graph, not only JSON.
- Inspect/copy strict Workflow JSON DSL.
- View runtime-core test conversation.
- View Telegram-style mock output.
- Answer owner decision questions.

## What Is Real

- Text/markdown SourceDocument ingestion.
- Source refs and safe document warnings.
- Deterministic source review facts.
- BusinessUnderstanding draft.
- Optional backend-only AI extraction layer.
- WorkflowGenerationPlan and deterministic workflow generator.
- Workflow DSL validation.
- runtime-core local conversation simulation.
- Telegram mock formatting.

## What Is Simulated

- Demo fixtures.
- Browser/session-only state.
- Telegram preview mock.
- Owner decision checkboxes.

## Not Implemented

- PDF, DOCX, OCR, rich parsers.
- Upload endpoint or file storage.
- Crawling.
- RAG/vector DB/embeddings.
- Persistence.
- Auth/tenants/billing.
- Production Telegram.
- WhatsApp.
- Exporters.
- Production Studio.

## Skill/MCP Readiness

- Task type: UI, local demo API, AI provider integration, docs.
- Skills used: Superpowers process guidance and TDD for the demo pipeline.
- Extra MCP/plugin installed: none.
- Browser verification expected before PR acceptance.
- Dependency decision: no new external UI or AI SDK dependency; backend OpenAI access uses `fetch`.
