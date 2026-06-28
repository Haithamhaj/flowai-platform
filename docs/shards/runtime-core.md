# Runtime Core Shard

## Purpose

Run workflows safely from JSON without channel-specific assumptions.

## Scope

Interpreter, state, trace, condition evaluation, node executors, test simulation.

## Current Decisions

- Interpret JSON, never execute code.
- Channel-neutral output.
- Deterministic where possible.

## Do Not Do

- Do not add Telegram/WhatsApp logic here.
- Do not call AI providers directly from core runtime without an interface.
- Do not bypass validation.

## Relevant Future Tasks

TASK-002, TASK-003, TASK-004.

## Acceptance Principles

Runtime behavior must be traceable and testable without external services.

