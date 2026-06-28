# TASK-006 Document Ingestion

Status: proposed
Owner/Agent: unassigned
Context shard: `business-understanding.md`, `rag.md`, `security.md`

## Goal

Add document/PDF ingestion after generator path exists.

## Why Now

Documents are important business inputs but require upload safety and extraction discipline.

## Non-Goals

No arbitrary file execution, no RAG claims without citations, no production storage unless scoped.

## Inputs

Approved file safety plan, supported file types, extraction requirements.

## Skill/MCP Readiness

- Task type: document ingestion/security.
- Skills/tools expected: security review; library docs via Context7/official docs before parser choice.
- Skills/tools available: local tests and fixtures.
- Missing skills/tools worth recommending: none until file safety plan is approved.
- Decision: pause for safety plan before implementation.

## Expected Outputs

Safe ingestion pipeline design and implementation, tests with fixtures.

## Files Likely Touched

`packages/business-understanding/`, future `packages/rag/`, `apps/api/`.

## Acceptance Criteria

- File type/size limits.
- Safe parsing.
- Source references preserved.
- Tests for accepted and rejected files.

## Test Plan

Fixture tests and security boundary tests.

## Review Checklist

Upload safety, source citation, no hidden storage assumptions.

## Risks

Unsafe file parsing and hallucinated document understanding.

## Handoff Notes

Pending.
