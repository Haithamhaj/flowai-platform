# Workflow DSL Shard

## Purpose

Define safe workflow structure that can be validated, tested, exported, and interpreted.

## Scope

Types, schema, validator, migrations, examples, DSL tests.

## Current Decisions

- Strict JSON only.
- Safe condition AST.
- No executable strings.
- No secrets.

## Do Not Do

- Do not support JavaScript conditions.
- Do not embed raw webhook URLs or tokens.
- Do not add node types without validation rules.

## Relevant Future Tasks

TASK-001, TASK-008, TASK-009.

## Acceptance Principles

Every DSL feature must be readable, safe, testable, and exportable.

