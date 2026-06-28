# Security Shard

## Purpose

Prevent unsafe workflow execution, secret leakage, and risky integrations.

## Scope

Secrets, workflow validation, webhooks, uploads, OSS licensing, runtime audit traces, provider boundaries.

## Current Decisions

- No executable workflow code.
- No secrets in workflow JSON.
- Security-sensitive work requires approval.

## Do Not Do

- Do not add `eval`, `new Function`, or arbitrary expressions.
- Do not commit secrets.
- Do not add upload/channel/provider behavior without validation and review.

## Relevant Future Tasks

TASK-001 through TASK-009.

## Acceptance Principles

Security must be explicit at boundaries, not assumed inside implementation details.

