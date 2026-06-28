# Testing Shard

## Purpose

Keep product behavior verifiable task by task.

## Scope

Unit tests, validator tests, runtime simulation, API tests, fixtures, regression scenarios.

## Current Decisions

- Tests must accompany implementation tasks.
- Failing or skipped tests must be disclosed.

## Do Not Do

- Do not hide failed commands.
- Do not rely only on manual checks when automated tests are practical.
- Do not claim external services work without live or mocked proof.

## Relevant Future Tasks

All implementation tasks.

## Acceptance Principles

Tests should verify safety, edge cases, and user-visible workflow behavior.

