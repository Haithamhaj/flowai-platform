# TASK-023: Crawl To AI/RAG Review

Status: accepted/merged
Owner/Agent: Codex
Parent: Owner-visible website source trial

## Goal

Make the Studio website URL path visibly complete for owner review:

```text
website URL
-> bounded Crawlee crawl
-> website SourceDocument/sourceRefs
-> optional live AI review
-> optional OpenAI RAG search
-> WorkflowGenerationPlan / WorkflowDefinition
-> runtime test
-> channel previews
-> export blocks
```

## Scope

- Add a Studio `POST /api/crawl-build` endpoint.
- Keep `/api/crawl-preview` available for raw crawl inspection.
- Mark crawled website sources distinctly from pasted website text.
- Show website crawling as done in the owner checklist only when the source came from the crawler.
- Make the Crawl button run crawl plus build in one action, using the current live AI/RAG toggles.
- Add focused tests for the crawler-origin checklist behavior.

## Non-Goals

- No OCR.
- No PDF parsing.
- No file upload endpoint.
- No new dependency.
- No crawling private networks by default.
- No login/session crawling.
- No browser-rendered crawling.
- No durable crawl storage.
- No production RAG lifecycle, retention, tenant isolation, or catalog truth policy.
- No AI-generated final Workflow JSON.
- No live Telegram/WhatsApp.

## Acceptance Criteria

- A crawled website source sets `sourceKind: "website_text"` and `sourceOrigin: "crawler"`.
- Owner checklist marks website crawling `done` for crawler-origin sources.
- Pasted website text still does not claim crawler execution.
- `POST /api/crawl-build` returns crawl summary plus the built Studio preview.
- Studio Crawl button renders the built preview directly after crawling.
- Existing build, live AI review toggle, RAG toggle, workflow validation, runtime preview, channel preview, and export blocks remain intact.

## Tests

- `CI=true pnpm --filter @flowai/studio test -- owner-builder.test.ts`
- `CI=true pnpm --filter @flowai/studio test`
- `CI=true pnpm --filter @flowai/studio typecheck`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`
- Local Studio/browser smoke with a public test URL.

## Skill/MCP Readiness

- Task type: Studio UI, API, crawling, AI/RAG review boundary.
- Skills used: Superpowers `using-superpowers`, `test-driven-development`, and verification skills.
- Existing tools are enough: local tests, browser verification, and the already-approved Crawlee package.
- No new MCP, connector, external dependency, provider, or secret handling is needed.

## Risks

- Crawled text quality depends on basic HTML extraction and may miss JavaScript-rendered content.
- RAG remains temporary per request and should not be treated as catalog truth.
- Live AI review remains review assistance only; deterministic generation still owns final Workflow JSON.
- The route is a local Studio review path, not a production ingestion API.

## Next Recommended Task

`TASK-024_BROWSER_CRAWL_REVIEW_FIXTURES`

Goal: add owner-review fixtures and comparison output for real website crawl examples, including where Cheerio crawling succeeds and where browser-rendered/Crawl4AI-style crawling is needed.
