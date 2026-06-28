# ADR 002: Workflow JSON DSL

## Status

Accepted

## Decision

Use strict JSON workflow definitions as the source of truth.

## Rationale

Customer-authored workflows must be safe to validate, store, inspect, export, and execute. Executable strings, `eval`, `new Function`, and arbitrary JavaScript conditions are forbidden.

## Consequences

- Conditions use a constrained AST.
- Secrets are stored outside workflow JSON.
- Channels adapt runtime outputs instead of owning workflow logic.

