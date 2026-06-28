# Telegram Preview Shard

## Purpose

Provide the first external preview channel after runtime/API proof.

## Scope

Telegram bot adapter, local long polling, production webhook later, message mapping, preview sessions.

## Current Decisions

- Telegram comes before WhatsApp.
- grammY or Telegraf are candidates; dependency choice needs review.

## Do Not Do

- Do not implement before runtime/API proof.
- Do not hardcode bot tokens.
- Do not let Telegram-specific features change core workflow semantics.

## Relevant Future Tasks

TASK-004.

## Acceptance Principles

Preview must prove the same runtime behavior users see in the API test loop.

