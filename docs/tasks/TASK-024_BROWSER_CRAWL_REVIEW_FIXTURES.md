# TASK-024: Browser Crawl Review Fixtures

Status: accepted/merged
Owner/Agent: Codex
Parent: Website crawling quality review

## Goal

Create owner-review fixtures that show where FlowAI's current Crawlee `CheerioCrawler` website ingestion works and where browser-rendered crawling may be required later.

This validates:

```text
local fixture site
-> current Cheerio crawl
-> expected content signal check
-> supported / needs_browser_rendering status
-> reviewable Markdown report
```

## Scope

- Add a crawl quality review helper in `packages/website-crawler`.
- Add fixtures for:
  - static multi-page HTML that should be supported by the current crawler
  - client-rendered catalog content that should be flagged as requiring browser rendering
- Add `pnpm demo:crawl-review`.
- Generate `docs/demo/FLOWAI_CRAWL_REVIEW_FIXTURES.md`.
- Keep output stable by masking the local fixture port.

## Non-Goals

- No browser-rendered crawler implementation.
- No Crawl4AI integration.
- No new dependency.
- No OCR/PDF/upload implementation.
- No login/session crawling.
- No private-network crawling by default outside local fixture/demo mode.
- No production crawling policy, persistence, scheduling, or robots/terms enforcement.
- No RAG source-of-truth behavior.

## Acceptance Criteria

- Static fixture is marked `supported`.
- JavaScript-rendered fixture is marked `needs_browser_rendering`.
- Report explains that Cheerio does not execute JavaScript.
- Demo command writes `docs/demo/FLOWAI_CRAWL_REVIEW_FIXTURES.md`.
- Full test/build gates pass.

## Tests

- `CI=true pnpm --filter @flowai/website-crawler test`
- `CI=true pnpm --filter @flowai/website-crawler typecheck`
- `pnpm demo:crawl-review`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`

## Skill/MCP Readiness

- Task type: crawling, security, docs/demo.
- Skills used: Superpowers `using-superpowers` and `test-driven-development`.
- Existing tools are enough: local fixture server, existing Crawlee package, local tests.
- No new MCP, connector, provider, dependency, or secret handling is needed.

## Risks

- Fixture results prove capability shape, not real-site quality.
- Real customer websites may need JavaScript rendering, anti-bot handling, cookies, auth, or crawl policy work.
- Browser-rendered crawling would expand operational/security scope and should be approved separately.

## Next Recommended Task

`TASK-025_BROWSER_RENDERED_CRAWLER_SPIKE_PLAN`

Goal: plan the safest browser-rendered crawling spike only after reviewing TASK-024 fixture output and real target website examples.
