# Architecture Shard

## Purpose

Protect clean module boundaries as the project grows.

## Scope

Apps, packages, data flow, dependency direction, persistence boundaries, channel boundaries.

## Current Decisions

- Runtime proof before generator/crawler/UI.
- Channels are adapters.
- PostgreSQL later as primary store; JSONB can hold workflow versions.

## Do Not Do

- Do not mix channel logic into runtime core.
- Do not add broad abstractions without a task need.
- Do not preserve legacy architecture.

## Relevant Future Tasks

TASK-000 through TASK-009.

## Acceptance Principles

Architecture changes must reduce ambiguity, improve safety, or enable a planned task.

