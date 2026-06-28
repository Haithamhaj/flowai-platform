# Channel Adapters Shard

## Purpose

Map channel-neutral runtime output to external channels.

## Scope

Telegram, WhatsApp, web widget, GPT-style adapters, webhook verification.

## Current Decisions

- Telegram before WhatsApp.
- Channel adapters do not own workflow logic.

## Do Not Do

- Do not duplicate runtime branching in channels.
- Do not store secrets in workflow JSON.
- Do not implement production webhooks without verification.

## Relevant Future Tasks

TASK-004.

## Acceptance Principles

Adapters should be replaceable and testable with mocked runtime output.

