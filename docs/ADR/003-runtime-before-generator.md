# ADR 003: Runtime Before Generator

## Status

Accepted

## Decision

Build and test the workflow validator and runtime before adding AI generation, crawling, document ingestion, or RAG.

## Rationale

The runtime defines what a valid generated workflow means. Without that contract, generation quality cannot be verified.

## Consequences

- First slice uses deterministic examples and mock behavior.
- AI providers are represented as future interfaces, not hardcoded dependencies.

