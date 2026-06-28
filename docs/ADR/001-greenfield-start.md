# ADR 001: Greenfield Start

## Status

Accepted

## Decision

Start a new `flowai-platform` project. The legacy backend is reference-only.

## Rationale

The legacy backend contains useful product intent and risks to avoid, but its architecture should not be preserved. The new platform needs strict boundaries between workflow definitions, runtime, generation, channels, and persistence.

## Consequences

- No legacy code migration in the first pass.
- Old docs may inform decisions.
- Product code starts with a safe DSL and runtime.

