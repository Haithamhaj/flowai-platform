# RAG Shard

## Purpose

Support knowledge-backed answers with citations later.

## Scope

Chunking, embeddings, Qdrant, retrieval, citations, fallback behavior.

## Current Decisions

- RAG is deferred.
- Qdrant may exist in local dev as a placeholder only.

## Do Not Do

- Do not implement RAG before runtime proof.
- Do not claim answers are source-backed without citations.
- Do not ingest files without security review.

## Relevant Future Tasks

TASK-006, TASK-007.

## Acceptance Principles

RAG must be observable, cite sources, and degrade safely.

