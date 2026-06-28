# Business Understanding Shard

## Purpose

Turn websites, documents, and interviews into structured business understanding.

## Scope

Services, FAQs, policies, forms, scenarios, escalation paths, missing questions, source confidence.

## Current Decisions

- Runtime proof comes first.
- Crawling and document ingestion are later.
- Business understanding output should be structured before workflow generation.

## Do Not Do

- Do not crawl websites before runtime/generator proof.
- Do not ingest untrusted files without upload safety.
- Do not hide assumptions.

## Relevant Future Tasks

TASK-005, TASK-006, TASK-007.

## Acceptance Principles

Outputs must preserve sources, confidence, and missing information.

