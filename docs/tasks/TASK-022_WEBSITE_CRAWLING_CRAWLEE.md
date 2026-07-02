# TASK-022: Website Crawling With Crawlee

Status: in progress
Owner/Agent: Codex
Parent: Website source ingestion for visible FlowAI trial

## Goal

Add a first real website crawling path so the owner can provide a website URL and FlowAI can crawl same-origin pages into a sourceRef-backed `SourceDocument`.

This validates:

```text
website URL
-> bounded same-origin crawl
-> page text + URLs
-> website SourceDocument
-> Studio build pipeline
-> BusinessUnderstanding / catalog review / workflow / previews
```

## Selected Open Source Dependency

Selected: `crawlee`.

Reason:

- TypeScript/Node.js library that fits the current monorepo.
- Apache-2.0 license.
- Supports HTTP crawlers and browser crawlers under one library.
- `CheerioCrawler` gives a lower-risk first step without Playwright browser automation.
- Can later expand to browser rendering if a specific site requires JavaScript.

Alternatives:

- Crawl4AI: powerful LLM-friendly crawler with Markdown generation, Docker API, browser pool, screenshots, PDFs, and advanced extraction. Deferred because it is Python/Docker/API-server oriented and increases operational/security surface for the first crawl integration.
- Firecrawl: learn-only per existing project rules until license/provider/security review.

## Scope

- Add `packages/website-crawler`.
- Use Crawlee `CheerioCrawler` only.
- Limit crawl to http/https same-origin pages.
- Limit page count and text size.
- Block localhost/private-network targets by default.
- Convert crawled pages into one website `SourceDocument` with page sourceRefs.
- Add Studio `/api/crawl-preview`.
- Add a Studio Crawl button that fills source text and runs the existing build flow.

## Non-Goals

- No JavaScript-rendered browser crawling yet.
- No login/session crawling.
- No crawling private networks by default.
- No file download crawling.
- No robots.txt production policy enforcement yet.
- No durable crawl storage.
- No scheduled crawling.
- No RAG source-of-truth claims from crawled content.
- No OCR/PDF parsing.
- No broad internet scraping.

## Acceptance Criteria

- Local fixture test crawls two same-origin pages.
- External links are not followed.
- Private network targets are rejected unless explicitly allowed by code/test.
- Crawled output becomes `SourceDocument` with `sourceType: "website"` and `website_crawl` extraction method.
- Studio exposes `/api/crawl-preview`.
- Studio UI has a website Crawl action that fills the builder input.
- Full test/build gates pass.

## Test Plan

- `CI=true pnpm --filter @flowai/website-crawler test`
- `CI=true pnpm --filter @flowai/website-crawler typecheck`
- `CI=true pnpm --filter @flowai/studio test`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`
- Local Studio/browser smoke with a public test URL.

## Skill/MCP Readiness

- Task type: crawling, security, Studio UI, dependency addition.
- Skills used: Superpowers `using-superpowers`, `test-driven-development`, `systematic-debugging`, and `verification-before-completion`.
- Context7 used for current Crawlee `CheerioCrawler` and storage configuration docs.
- Web research used to compare Crawlee and Crawl4AI.
- Dependency added: `crawlee`.
- Dependency risk: web crawling can introduce SSRF, rate limits, robots/terms issues, privacy concerns, and local storage behavior. This task mitigates by blocking private networks by default, limiting pages, using in-memory Crawlee storage, and keeping crawling explicit from Studio.

## Risks

- Some websites need JavaScript rendering; `CheerioCrawler` will not handle those fully.
- Robots.txt and terms policy are not production-grade yet.
- Crawled content may include stale or unsupported facts; catalog/workflow claims still need source review.
- Crawlee has many transitive dependencies compared with the previous dependency-light core.

## Next Recommended Task

`TASK-023_CRAWL_TO_AI_RAG_REVIEW`

Goal: run crawled website content through live AI review and optional RAG in Studio, then generate a review artifact for owner testing with a real website URL.
