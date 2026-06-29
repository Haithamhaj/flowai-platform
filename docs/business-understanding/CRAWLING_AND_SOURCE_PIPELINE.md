# Crawling And Source Pipeline

## Purpose

This document plans how real business sources can become source-backed BusinessGraph facts. It does not implement a crawler, parser, RAG system, API endpoint, provider call, or storage layer.

## Source Types

Planned source types:

- `manual_interview`: user-provided direct interview answers.
- `website_page`: fetched web page content.
- `website_structured_data`: JSON-LD, microdata, OpenGraph, or other structured metadata.
- `sitemap`: sitemap index or URL list.
- `document`: PDF, document, spreadsheet, or uploaded file after upload safety exists.
- `manual_review`: human-edited or approved fact.
- `integration_api`: future source from commerce, booking, CRM, menu, listings, or inventory APIs.

Every source record should include:

- `sourceId`
- `sourceType`
- `origin`
- `locator`
- `retrievedAt`
- `contentHash`
- `freshness`
- `trustLevel`
- `accessMethod`
- `robotsStatus`
- `excerptPolicy`
- `metadata`

No source record may store secrets, session cookies, private tokens, or raw provider credentials.

## Pipeline Stages

1. Source registration:
   - Capture source origin, source type, ownership/permission status, and expected business type.
   - Reject or defer sources that require credentials unless a separate security-approved integration task exists.

2. Discovery:
   - Website: sitemap, robots, navigation, internal links, canonical links.
   - Documents: metadata, page count, file type, upload safety results.
   - Manual: interview field names and timestamps.
   - Future APIs: endpoint identity and data contract, not raw credentials.

3. Fetch or import:
   - Respect robots, rate limits, and explicit user constraints.
   - Store content hash and retrieval timestamp.
   - Keep raw fetch details out of BusinessGraph unless they are safe source metadata.

4. Page or document classification:
   - Product/category page.
   - Service page.
   - FAQ page.
   - Policy page.
   - Contact/location page.
   - Menu page.
   - Listing page.
   - Booking/reservation page.
   - Generic/about page.

5. Extraction:
   - Prefer structured data first.
   - Fall back to visible page content.
   - Extract candidate facts with sourceRefs, confidence, freshness, and extraction method.
   - Do not infer products, prices, or availability unless the source explicitly supports them.

6. Normalization:
   - Merge duplicate entities.
   - Normalize categories, currencies, availability, hours, locations, and contact methods.
   - Keep original source values in source-backed fact evidence.

7. Conflict detection:
   - Compare facts across source priority, freshness, and confidence.
   - Mark conflicts before creating capabilities or workflow drafts.

8. Review:
   - Produce missing questions, assumptions, conflicts, and blocked capabilities.
   - Do not publish or generate high-risk flows from unresolved facts.

## Website Crawling Model

### Discovery

Website discovery should proceed in this order:

1. User-provided URL.
2. `robots.txt` and sitemap discovery.
3. Sitemap URLs.
4. Navigation and footer links.
5. Internal links from high-value pages.
6. Canonical URLs to reduce duplicates.

The crawler should prioritize:

- Home page.
- Product/category/menu/service/listing pages.
- FAQ pages.
- Policy pages.
- Contact/location pages.
- Booking/reservation pages.
- About page.

### Classification

Each page should receive one or more page classes:

- `home`
- `product_detail`
- `product_listing`
- `category`
- `service_detail`
- `menu`
- `faq`
- `policy`
- `contact`
- `location`
- `booking`
- `real_estate_listing`
- `case_study`
- `unknown`

Classification must remain explainable with source evidence, for example title, URL pattern, structured data type, or visible headings.

### Extraction Rules

Structured data first:

- Use schema.org/Product, Offer, AggregateOffer, LocalBusiness, Restaurant, Menu, FAQPage, Service, Organization, Place, RealEstateListing where available.
- Preserve structured data sourceRefs separately from visible-page fallback.
- Do not trust malformed structured data without visible confirmation when the claim affects price, availability, medical/safety policy, or legal/compliance text.

Visible page fallback:

- Extract only text visibly present in the source.
- Use conservative selectors and page classification.
- Keep excerpts short and safe.
- Do not infer missing prices, product variants, availability, contact methods, or policy exceptions.

No hallucination rules:

- No product source, no product claim.
- No current price source, no confident price.
- No availability source, no stock claim.
- No policy source, no policy answer.
- No location source, no location-specific flow.

### Freshness And Recrawl Strategy

Freshness should be attached to both source and fact:

- `retrievedAt`
- `validAt`
- `expiresAt`
- `freshnessStatus`: `fresh`, `aging`, `stale`, `unknown`
- `recrawlPriority`

Suggested default freshness:

- Prices and availability: short-lived, recrawl frequently or require integration/API.
- Product descriptions and attributes: medium-lived.
- Policies and FAQs: medium-lived, recrawl when source hash changes.
- Locations and opening hours: medium-lived but high impact.
- Legal, medical, or safety rules: require review if changed.

Recrawl should compare content hashes:

- If hash unchanged, preserve fact IDs and update freshness.
- If hash changed, re-extract affected pages and recompute conflicts.
- If a source disappears, mark dependent facts as stale or unavailable, not deleted silently.

### Robots, Rate Limits, And Safety

Crawler implementation, when approved later, must:

- Respect robots.txt unless the user provides explicit authorized source access through a future approved mechanism.
- Use conservative concurrency and retry limits.
- Identify user-agent clearly.
- Avoid login, checkout, account, admin, and private areas.
- Avoid forms that submit data.
- Avoid storing cookies, tokens, or personal data from dynamic pages.
- Stop on access-denied, paywall, or anti-bot responses.

## SourceRefs

Every extracted fact must include sourceRefs that can answer:

- Which source produced this fact?
- Where in that source was it found?
- When was it retrieved?
- Was it structured data, visible text, manual input, or integration data?
- What confidence and freshness does that evidence carry?

SourceRefs should be stable enough for review and regeneration.

## Source Priority

Default priority from strongest to weakest:

1. Human-approved manual review.
2. Direct integration/API with freshness metadata.
3. Structured website data with matching visible content.
4. Visible website content.
5. Documents with upload safety and extraction confidence.
6. Manual interview statements.
7. Generated candidates requiring approval.

Priority can change by domain:

- For official policies, a policy page may outrank interview memory.
- For current prices, integration/API should outrank static pages.
- For business intent, a fresh manual interview may outrank website copy.

## Output Contract

The source pipeline should output candidate BusinessGraph facts, not Workflow JSON. Later generator tasks should consume only reviewed BusinessGraph plus CapabilityMap.
