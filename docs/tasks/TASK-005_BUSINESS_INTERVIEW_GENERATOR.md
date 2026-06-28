# TASK-005 Business Interview Generator

Status: proposed
Owner/Agent: unassigned
Context shard: `business-understanding.md`

## Goal

Generate BusinessUnderstanding JSON from a guided interview.

## Why Now

Interview input is the safest first generation path before crawling and PDFs.

## Non-Goals

No website crawling, PDF ingestion, RAG, or final workflow generation unless separately scoped.

## Inputs

Interview answers, product brief, business understanding schema.

## Skill/MCP Readiness

- Task type: AI/provider interface and structured extraction.
- Skills/tools expected: OpenAI Platform tooling only if real provider/API keys are needed.
- Skills/tools available: local tests and mock providers.
- Missing skills/tools worth recommending: none for mock-first implementation.
- Decision: proceed mock-first; ask before real provider integration.

## Expected Outputs

BusinessUnderstanding structure, missing questions, assumptions, tests.

## Files Likely Touched

`packages/business-understanding/`, docs.

## Acceptance Criteria

- Structured output.
- Missing fields are explicit.
- No real provider required for baseline tests.
- Mock provider path exists if needed.

## Test Plan

Unit tests using deterministic interview fixtures.

## Review Checklist

Source confidence, assumptions, no hidden provider coupling.

## Risks

Overpromising AI quality before generator/runtime feedback exists.

## Handoff Notes

Pending.
