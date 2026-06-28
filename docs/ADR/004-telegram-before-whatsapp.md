# ADR 004: Telegram Before WhatsApp

## Status

Accepted

## Decision

Use Telegram as the first external preview channel. WhatsApp comes later.

## Rationale

Telegram has a lower setup burden for early runtime preview. WhatsApp requires more production setup around templates, business onboarding, webhook verification, and token handling.

## Consequences

- No Telegram adapter in this first slice.
- Runtime output remains channel-neutral so Telegram can be added as an adapter.
- WhatsApp is not blocked, but it is not the first proof point.

