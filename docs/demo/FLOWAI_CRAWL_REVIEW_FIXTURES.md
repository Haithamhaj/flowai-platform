# FlowAI Crawl Review Fixtures

This report compares the current Crawlee CheerioCrawler path against review fixtures.

It does not prove production crawling, browser rendering, login/session crawling, persistence, OCR, RAG, or source-of-truth catalog extraction.

## Summary

- Total fixtures: 2
- Supported by current crawler: 1
- Browser rendering needed: 1
- Failed or inconclusive: 0

## Fixture Results

### Static multi-page clinic

- ID: `static_clinic_multi_page`
- URL: http://127.0.0.1:<fixture-port>/static-clinic
- Status: `supported`
- Pages crawled: 2
- SourceRefs: 4
- Note: Current Cheerio crawler extracted the expected review signals.
- Found signals: Book dental cleaning appointments; Emergency appointment requests; Patients should bring insurance details
- Missing signals: none

### Client-rendered catalog gap

- ID: `client_rendered_catalog_gap`
- URL: http://127.0.0.1:<fixture-port>/client-rendered-catalog
- Status: `needs_browser_rendering`
- Pages crawled: 1
- SourceRefs: 3
- Note: Browser rendering needed: Current Cheerio crawler did not execute JavaScript, so client-rendered content was missing.
- Found signals: none
- Missing signals: Premium ceramic package starts at 320 SAR

## Recommendation

Keep CheerioCrawler as the first fast path, but evaluate browser-rendered crawling for sites where important catalog, service, FAQ, or pricing text is produced by client-side JavaScript.

## Owner Review Notes

1. What works now: static public HTML pages can become SourceDocument/sourceRefs and continue into the FlowAI Studio build path.
2. What is missing: content rendered only after JavaScript execution is not extracted by the current Cheerio crawler.
3. Product decision: keep the fast Cheerio path, then evaluate a browser-rendered crawler only when real customer fixtures prove it is required.
4. Still not included: OCR, PDF parsing, upload endpoints, private-network crawling by default, login/session crawling, persistence, live Telegram, live WhatsApp, or production RAG lifecycle.
