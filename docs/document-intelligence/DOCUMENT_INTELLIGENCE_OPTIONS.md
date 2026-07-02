# Document Intelligence Options

Checked: 2026-07-02

## Position

FlowAI should not start with RAG or a vector database.

The product needs trustworthy business understanding, catalog facts, FAQ answers, and workflow generation. That requires evidence first:

```text
source -> extraction -> chunks/sourceRefs -> candidate facts -> review -> BusinessUnderstanding/BusinessGraph -> workflow
```

RAG should sit on top of reviewed chunks and sourceRefs. It should not become the first place where raw PDFs, crawled pages, or catalog claims are interpreted.

## Evaluation Criteria

Any candidate must be reviewed against:

- Arabic and mixed-language quality.
- PDF text and scanned-page behavior.
- Reading order for multi-column pages.
- Table extraction.
- Form/key-value extraction.
- Output structure: Markdown, JSON, blocks, pages, tables, metadata.
- SourceRef support: page, block, line, character offset, confidence, extraction method.
- Local deployment vs cloud data transfer.
- License and commercial use.
- Maintenance activity.
- Native binaries, GPU needs, model downloads, and postinstall behavior.
- Security history and sandboxing options.
- Cost and latency.
- Failure behavior on malformed files.

## PDF/OCR Candidates

### LeapAI-SA/leap-ocr-platform

Fit: strongest internal reference candidate and possible external service boundary, not a direct code-copy source.

Observed repo state:

- Private GitHub repository: `LeapAI-SA/leap-ocr-platform`.
- Last pushed: 2026-04-17.
- No GitHub license metadata was visible during review.
- Python/FastAPI platform with Docker, Terraform, MongoDB, GCS, OpenRouter, Vertex AI, LangExtract, JWT auth, Jinja UI, and Cloud Run deployment.
- Dependencies include FastAPI, MongoDB clients, OpenAI SDK, pdf2image, Pillow, PyMuPDF, python-docx, Google Cloud Storage, Google Cloud AI Platform, Google Cloud Speech, LangExtract, Sentry, and backoff.

Useful patterns for FlowAI:

- Session/job flow: create session, upload files, run OCR asynchronously, poll progress, fetch results.
- Page-level result model with per-page success/error, token usage, and cost tracking.
- Model registry and model-cost tracking, including calculated vs provider-reported cost comparison.
- PDF/image/DOCX conversion path using Poppler, Pillow, and LibreOffice.
- Schema-driven OCR prompts that require strict JSON output.
- Post-OCR entity extraction using LangExtract + Vertex AI with user examples.
- HTML visualization for extracted entities, including UTF-8 handling for Arabic/multibyte text.
- Cloud Run deployment pattern for an isolated OCR microservice.

Risks and blockers:

- No visible license metadata. Even though this is an internal/team repo, FlowAI should not copy code until ownership and reuse permission are explicitly documented.
- It is a full application, not a small parser adapter. Direct migration would import auth, MongoDB, GCS, UI, admin, Sentry, Terraform, and deployment assumptions into FlowAI.
- It stores and processes customer files in GCS and uses MongoDB sessions, which conflicts with FlowAI's current no-persistence/no-upload boundary.
- It depends on OpenRouter and Google Vertex/GCS service-account credentials, which require provider, privacy, billing, region, and secret handling review.
- Some defaults and deployment settings need security review before reuse, including public Cloud Run invocation and default admin credentials in config/docs.
- Current extraction output is generic entities, not FlowAI-specific `BusinessUnderstanding`, `BusinessGraph`, catalog facts, source priority, or workflow-ready capabilities.
- The PDF/OCR path is LLM-vision over rendered pages, not a deterministic parser with robust sourceRefs. It may be useful, but sourceRef granularity must be added.

Recommended use:

- Treat as an internal reference and potential separate OCR/extraction microservice.
- Do not copy code into FlowAI during TASK-020.
- In `TASK-020A`, design `ExtractedDocument` so a future adapter can accept LeapOCR-like page results.
- In a later approved spike, call the deployed/internal OCR service or run it locally against FlowAI fixtures, then map its output into FlowAI `ExtractedDocument` and sourceRefs.
- Prefer service integration or adapter reimplementation over migrating the whole app into the FlowAI monorepo.

Reference:

- https://github.com/LeapAI-SA/leap-ocr-platform

### MinerU

Fit: strongest first candidate for local PDF/document parsing spike.

Why:

- GitHub project describes conversion of PDF, images, DOCX, PPTX, XLSX, and webpages into structured Markdown/JSON for LLM, RAG, and agent workflows.
- Current README claims VLM + OCR dual engine, table/formula handling, handwriting/scanned document handling, and 109-language OCR recognition.
- Recent release notes mention long-document improvements and high-concurrency parsing infrastructure.
- Large community signal.

Risks:

- Heavy dependency/model footprint.
- Needs license review because current project uses a custom MinerU Open Source License based on Apache 2.0, not plain Apache 2.0.
- May require Docker/GPU/model downloads for best quality.
- Must be isolated behind a parser adapter, never embedded directly into workflow/runtime packages.

Recommended use:

- Evaluate in a separate local spike on fixture documents only.
- Compare output quality against Docling and PaddleOCR.
- Do not commit copied code or model files.

Reference:

- https://github.com/opendatalab/MinerU

### Docling

Fit: stable baseline parser candidate.

Why:

- MIT license.
- Strong project and community signal.
- Supports many document formats including PDF, DOCX, PPTX, XLSX, HTML, EPUB, audio transcript formats, images, LaTeX, plain text, and more.
- Designed for getting documents ready for generative AI.

Risks:

- OCR quality and Arabic behavior must be tested on FlowAI fixtures.
- May still introduce Python/native dependencies.
- Need to verify sourceRef granularity and table fidelity.

Recommended use:

- Use as baseline parser in the same local fixture spike as MinerU.

Reference:

- https://github.com/docling-project/docling

### PaddleOCR

Fit: strongest OCR-specific candidate.

Why:

- Apache-2.0.
- Mature OCR/document AI project.
- Supports 100+ languages and has Arabic documentation entry.
- Provides structured JSON/Markdown-oriented document parsing and table/formula recognition capabilities.

Risks:

- Paddle runtime and model setup can be heavy.
- General OCR output may need a separate layout parser or post-processing layer for stable FlowAI sourceRefs.
- Business extraction still needs a later AI/rules layer.

Recommended use:

- Evaluate as OCR engine for scanned/image-heavy PDFs and Arabic fixtures.
- Pair with extracted-block contract rather than letting OCR output become BusinessUnderstanding directly.

Reference:

- https://github.com/PaddlePaddle/PaddleOCR

### olmOCR

Fit: research/advanced candidate, not first implementation.

Why:

- Designed to linearize PDFs into clean text/Markdown for LLM datasets and training.
- Provides remote inference and local GPU options.

Risks:

- Local GPU path expects NVIDIA-class hardware and large disk footprint.
- Heavier ops profile than FlowAI needs for the first owner demo.
- Need Arabic quality evidence before considering.

Recommended use:

- Track as later benchmark candidate if MinerU/Docling/PaddleOCR are insufficient.

Reference:

- https://github.com/allenai/olmocr

## Cloud Extraction Candidates

### Google Document AI Enterprise Document OCR

Fit: strong cloud OCR candidate.

Why:

- Google docs list OCR and quality analysis for documents in more than 200 languages, including Arabic.
- Useful for scanned PDFs and handwriting quality checks.

Risks:

- Requires Google Cloud setup, processor IDs, credentials, billing, region choice, and privacy review.
- Online/synchronous and batch page limits apply.
- Customer documents leave local environment.

Recommended use:

- Separate `TASK-020C_GOOGLE_DOCUMENT_AI_EXTRACTION_SPIKE` only after user provides a dedicated key and approves cloud processing.

Reference:

- https://docs.cloud.google.com/document-ai/docs/processors-list

### Google Document AI Form Parser

Fit: strong candidate for tables, key-value forms, and generic entities.

Why:

- Google docs describe key-value, checkbox, table, and generic entity extraction from documents in more than 200 languages, including Arabic.

Risks:

- Same cloud, billing, privacy, page-limit, and credential concerns.
- Generic extraction may not map directly to FlowAI business facts without post-processing.

Recommended use:

- Evaluate for service lists, FAQ sheets, intake forms, pricing tables, and policies.

Reference:

- https://docs.cloud.google.com/document-ai/docs/processors-list

### Google Document AI Custom Extractor

Fit: later specialized extractor candidate.

Why:

- Can extract custom fields using generative AI or custom models.
- Could be useful for catalog, policy, and service-schema extraction.

Risks:

- Google docs note generative AI extraction officially supports English for that mode.
- Training/uptraining and schema design add product complexity.
- Not the right first step for Arabic-heavy FlowAI MVP.

Recommended use:

- Consider after a baseline OCR/form-parser spike, not before.

Reference:

- https://docs.cloud.google.com/document-ai/docs/custom-extractor-overview

## OpenAI Extraction And RAG Candidates

### OpenAI Structured Extraction

Fit: already partially proven for BusinessUnderstanding review.

Why:

- Existing FlowAI backend-only OpenAI provider boundary can call the Responses API with structured output.
- Good fit for source-backed extraction and missing-question generation.

Risks:

- Must not generate final Workflow JSON.
- Must not invent facts without sourceRefs.
- Must not receive raw secrets or expose provider keys to browser/output/logs.

Recommended use:

- Use after `ExtractedDocument` chunks exist.
- Let AI produce candidate facts with required sourceRefs and confidence, then pass through validators/review blockers.

### OpenAI Vector Stores / File Search

Fit: accepted hosted MVP RAG candidate after chunk/sourceRefs exist.

Why:

- OpenAI docs describe File Search as a hosted Responses API tool that retrieves from uploaded files using semantic and keyword search.
- Vector Stores support create/list/search operations, static chunking strategy, file status, and metadata.
- This may avoid running Qdrant or another local vector DB during MVP review.

Risks:

- Files/chunks may be stored by the provider; privacy and retention policies must be reviewed.
- Built-in retrieval does not replace FlowAI's need for explicit sourceRefs and catalog review.
- Needs a deletion/expiry plan and clear separation between owner workspace knowledge and workflow JSON.

Recommended use:

- `TASK-020B_OPENAI_RAG_CATALOG_KB` implements the first narrow adapter and smoke test because the owner approved using the existing OpenAI key path for RAG.
- Keep it behind backend-only config and sourceRef-backed chunks.
- Do not use vector search as the source of truth for catalog prices, availability, medical/legal policy, or workflow decisions.

Reference:

- https://developers.openai.com/api/docs/guides/tools-file-search
- https://developers.openai.com/api/reference/resources/vector_stores

## Crawling Candidates

### Crawl4AI

Fit: strong crawler candidate, but needs security review.

Why:

- High community signal.
- Produces LLM-ready Markdown.
- Supports dynamic pages, browser sessions, scraping strategies, deep crawling, and structured extraction.

Risks:

- The project changelog mentions recent security-hardening fixes for critical Docker API vulnerabilities including RCE, SSRF, auth bypass, file write, XSS, and hardcoded JWT secret.
- Powerful browser/session features increase risk.
- Must respect robots, rate limits, login boundaries, and source permissions.

Recommended use:

- Evaluate later in an isolated crawling spike.
- Prefer a locked-down local CLI/library path over a public Docker API server.

Reference:

- https://github.com/unclecode/crawl4ai

### Crawlee

Fit: conservative TypeScript crawler candidate.

Why:

- Mature Node.js/TypeScript crawling/scraping library.
- Works with Puppeteer, Playwright, Cheerio, JSDOM, and raw HTTP.
- Better stack fit for this TypeScript monorepo than Python-first crawler tools.

Risks:

- Does not solve business extraction by itself.
- Browser crawling still introduces SSRF, robots, rate-limit, and privacy concerns.

Recommended use:

- Evaluate beside Crawl4AI when website ingestion becomes active.

Reference:

- https://github.com/apify/crawlee

### Firecrawl

Fit: learn-only for now.

Why:

- Provides search, scrape, interact, crawl, map, and batch scrape APIs.
- Useful product reference for web-to-Markdown flows.

Risks:

- API-key service by default.
- Existing project rules say Firecrawl is learn-only unless license and fit are explicitly reviewed.
- External crawling service increases privacy and data-transfer concerns.

Recommended use:

- Do not integrate until a separate license/security/provider task approves it.

Reference:

- https://github.com/firecrawl/firecrawl

## Catalog And Knowledge Base Strategy

Catalog extraction should not be treated as generic RAG.

FlowAI should produce a reviewed catalog model:

- `catalogItemId`
- name and aliases
- category
- description
- price candidates with currency, sourceRefs, freshness, and conflict status
- availability candidates with sourceRefs and freshness
- eligibility, requirements, contraindications, or policy limitations
- recommendation blockers
- missing questions

AI may help classify and normalize catalog facts, but it must not invent:

- current prices
- stock/availability
- product suitability
- medical/legal claims
- discounts
- guarantees

## Recommended Task Split

### TASK-020A_EXTRACTED_DOCUMENT_CONTRACT_AND_FIXTURE_HARNESS

Implement a local contract and fixture harness only.

Scope:

- `ExtractedDocument` shape.
- chunks, pages, blocks, tables, metadata, warnings, sourceRefs.
- fixture evaluator over existing text/markdown examples.
- no parser dependencies.
- no upload endpoint.
- no RAG.
- no provider calls.
- include adapter fields that can represent LeapOCR-like page results without importing LeapOCR code.

### TASK-020B_OPENAI_RAG_CATALOG_KB

Implement the first hosted RAG/catalog knowledge adapter.

Scope:

- use existing SourceDocument chunks with sourceRefs.
- create/search/delete OpenAI Vector Stores through a backend-only adapter.
- prove a real smoke path when local OpenAI config is present.
- no OCR, no parser dependency, no crawling, no catalog source-of-truth decisions.

### TASK-020C_OCR_PARSER_LOCAL_SPIKE

Evaluate LeapOCR service output, MinerU, Docling, and PaddleOCR on local fixtures.

Scope:

- install only after documented dependency approval.
- for LeapOCR, prefer service/API invocation or local isolated run instead of copying code.
- run local sample conversion.
- compare Arabic, tables, reading order, and sourceRef recoverability.
- output review Markdown, not production integration.

### TASK-020D_GOOGLE_DOCUMENT_AI_EXTRACTION_SPIKE

Evaluate Google Document AI with a dedicated key.

Scope:

- OCR and Form Parser first.
- Custom Extractor only if needed.
- no production storage.
- no browser-exposed credentials.

### TASK-020E_WEBSITE_CRAWLING_SPIKE

Evaluate Crawl4AI and Crawlee.

Scope:

- one owned/test website only.
- robots and rate limits.
- no login/session/private crawling.
- output SourceDocument pages and sourceRefs.

## Current Decision

Proceed next with review of `TASK-020B_OPENAI_RAG_CATALOG_KB`.

Do not add LeapOCR code, MinerU, Docling, PaddleOCR, Google Document AI, Crawl4AI, Crawlee, Firecrawl, upload endpoints, or persistence until their specific task is approved.
