# TASK-007 Website Crawling

Status: proposed
Owner/Agent: unassigned
Context shard: `business-understanding.md`, `security.md`

## Goal

Analyze business websites after runtime/generator proof.

## Why Now

Websites are a primary user input, but crawling should wait until the safe core exists.

## Non-Goals

No broad internet scraping, no bypassing robots/rate limits, no runtime changes.

## Inputs

Crawler policy, depth limits, allowed domains, extraction schema.

## Skill/MCP Readiness

- Task type: crawling/business understanding/security.
- Skills/tools expected: Context7/official docs for Crawlee if selected.
- Skills/tools available: local fixtures; network/live crawl only with explicit approval.
- Missing skills/tools worth recommending: Crawlee dependency review when task starts.
- Decision: pause for crawler policy and dependency approval before implementation.

## Expected Outputs

Website extraction pipeline with source references and limits.

## Files Likely Touched

`packages/business-understanding/`, `apps/api/`, docs.

## Acceptance Criteria

- Depth and domain limits.
- Robots/rate limit policy documented.
- Extracted facts include source URLs.
- Tests with local/static fixtures.

## Test Plan

Mock/local crawl fixtures; no live crawl required unless approved.

## Review Checklist

Security, crawl ethics, source confidence, dependency license.

## Risks

Unbounded crawling and low-quality extracted facts.

## Handoff Notes

Pending.
