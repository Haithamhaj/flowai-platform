# Exporters Shard

## Purpose

Make workflow output portable.

## Scope

Native JSON, Mermaid, React Flow, Leap Draft, CRM/chatbot platform formats.

## Current Decisions

- Exportability is core product value.
- Exporters consume validated DSL.

## Do Not Do

- Do not make exporters mutate workflow semantics.
- Do not leak secrets into exported workflow files.
- Do not add platform-specific logic into runtime core.

## Relevant Future Tasks

TASK-008.

## Acceptance Principles

Exports must be deterministic and include warnings for unsupported features.

