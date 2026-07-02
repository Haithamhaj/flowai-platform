# TASK-020: Document Intelligence Evaluation

Status: in progress
Owner/Agent: Codex
Parent: Owner-first visible MVP review

## Goal

Choose the safe document intelligence path for FlowAI before adding parser dependencies, OCR engines, cloud extraction, RAG/vector search, or crawling.

This task covers how future source inputs should move through:

```text
PDF / image / document / website
-> safe extraction or crawling boundary
-> SourceDocument / ExtractedDocument
-> sourceRefs and chunks
-> candidate business facts / catalog facts
-> later BusinessUnderstanding / BusinessGraph
-> later workflow generation
```

## Scope

- Evaluate PDF/OCR options for Arabic and mixed-language business documents.
- Evaluate extraction options for forms, tables, FAQs, services, policies, and product/catalog data.
- Evaluate RAG/vector options, including hosted OpenAI Vector Stores/File Search with the existing OpenAI key path.
- Evaluate crawling options for future website ingestion.
- Define the ordering of future implementation tasks.
- Keep sourceRefs, evidence, and reviewability as the core requirement.

## Non-Goals

- No upload endpoint.
- No file storage.
- No PDF parser implementation.
- No OCR implementation.
- No Google Document AI integration.
- No OpenAI vector store integration.
- No RAG runtime or embeddings pipeline.
- No crawling implementation.
- No new dependency.
- No AI-generated final Workflow JSON.
- No persistence/database.
- No auth, tenants, or billing.
- No Studio UI changes.
- No live Telegram or WhatsApp.
- No production deployment.

## Recommended Direction

Start with source-backed extraction, not RAG.

RAG becomes useful only after FlowAI can create trustworthy chunks with stable `sourceRefs`. The first implementation should therefore prove an extraction contract and fixture-based evaluation harness before choosing a heavy parser, OCR model, cloud extractor, or vector database.

Recommended order:

1. `TASK-020A_EXTRACTED_DOCUMENT_CONTRACT_AND_FIXTURE_HARNESS`
2. `TASK-020B_PDF_OCR_LOCAL_SPIKE`
3. `TASK-020C_GOOGLE_DOCUMENT_AI_EXTRACTION_SPIKE`
4. `TASK-020D_OPENAI_VECTOR_STORE_RAG_SPIKE`
5. `TASK-020E_WEBSITE_CRAWLING_SPIKE`

Only `TASK-020A` should be next. Later tasks require separate approval because they add dependencies, cloud credentials, or network behavior.

## Candidate Stack Summary

Detailed comparison is in `docs/document-intelligence/DOCUMENT_INTELLIGENCE_OPTIONS.md`.

Initial recommendation:

- Local PDF/OCR evaluation: MinerU, Docling, and PaddleOCR.
- Cloud extraction evaluation: Google Document AI OCR/Form Parser/Custom Extractor.
- RAG/vector evaluation: OpenAI Vector Stores/File Search after chunk/sourceRefs exist.
- Crawling evaluation: Crawl4AI and Crawlee after document extraction is proven.
- Firecrawl remains learn-only until license, deployment, API-key, and security posture are reviewed.

## Acceptance Criteria

- A task file documents scope, non-goals, recommended ordering, risks, and future tasks.
- An options document compares PDF/OCR, extraction, RAG/vector, and crawling candidates.
- The decision says FlowAI should not go RAG-first.
- The decision says every extracted fact and catalog claim must keep sourceRefs.
- No source/package/runtime/UI files change.
- No dependencies are added.
- No secrets or provider credentials are added.
- `git diff --check` passes.

## Test Plan

- `git diff --check`
- Manual review that changed files are docs/project-state only.

Full test/build is optional because this task changes docs only.

## Skill/MCP Readiness

- Task type: docs, architecture, security, AI provider, document ingestion, crawling, RAG.
- Skills used: Superpowers `using-superpowers`, `brainstorming`, and `writing-plans`.
- Web research used for current external options.
- No connector or plugin installation required.
- Missing capabilities: no Google Document AI connector, no document parser sandbox, no crawler sandbox. These are not needed for the docs-only evaluation task.
- Tool risks: external parser dependencies, cloud credentials, website crawling, and vector stores all require later explicit approval before implementation.

## Risks

- Heavy OCR/parser packages can add native binaries, GPU/runtime requirements, model downloads, and supply-chain risk.
- Cloud extraction may send customer documents to a third party and needs privacy, region, billing, and credential review.
- RAG can produce unsupported answers if chunking and sourceRefs are weak.
- Crawling can create robots, SSRF, rate-limit, privacy, and stale-data risks.
- Arabic support must be validated on real fixtures, not assumed from generic multilingual claims.
- Catalog extraction can overclaim prices, stock, availability, or recommendations without source-backed evidence.

## Next Recommended Task

`TASK-020A_EXTRACTED_DOCUMENT_CONTRACT_AND_FIXTURE_HARNESS`

Goal: implement only a local contract and fixture evaluation harness for extracted text/chunks/sourceRefs using existing text/markdown examples first, with no parser dependency, no upload endpoint, no RAG, no crawling, and no cloud provider.
