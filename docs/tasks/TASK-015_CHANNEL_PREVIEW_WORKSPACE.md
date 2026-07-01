# TASK-015: Channel Preview Workspace

Status: implemented
Owner/Agent: Codex
Context shards: `channel-adapters.md`, `telegram-preview.md`

## Goal

Let the owner compare the same generated workflow across local web chat, Telegram mock, and WhatsApp mock previews.

## Scope

- Add channel preview descriptors in `@flowai/channel-adapters`.
- Render web chat, Telegram mock, and WhatsApp mock from the same runtime output.
- Show explicit mock labels and channel constraints.
- Include a runtime trace summary for preview/debug review.
- Wire the preview into Studio build output.
- Re-render channel previews after visual workflow edits.
- Add tests for channel preview formatting and Studio preview output.

## Non-Goals

- No live Telegram polling, webhook, bot token, or production delivery.
- No live WhatsApp Business API, phone number, webhook, token, or template approval.
- No channel-owned workflow logic.
- No persistence, auth, tenants, upload endpoints, crawling, RAG, AI provider calls, or exporters.
- No Workflow DSL or runtime semantic changes.
- No executable workflow strings, `eval`, `new Function`, or arbitrary JavaScript conditions.

## Acceptance Criteria

- Studio shows a `Channel Preview Workspace`.
- Web chat, Telegram mock, and WhatsApp mock are visibly separated.
- Telegram and WhatsApp previews clearly state mock-only status.
- WhatsApp mock uses display labels only and does not expose callback payloads.
- Channel previews use the same runtime output as the web/runtime preview.
- Visual workflow edits refresh runtime, Telegram, and channel preview panels.
- Relevant package tests, full test/build, and diff check pass.

## Skill/MCP Readiness

- Task type: channel adapter formatting, Studio UI, runtime preview, testing.
- Skills/tools used: Superpowers `using-superpowers`, `test-driven-development`, `systematic-debugging`, browser verification.
- Can proceed without extra tools: yes.
- Missing tools worth recommending: none for this mock-only task.
- Tool risk: live channel tools and provider integrations remain out of scope.

## Verification Commands

Run:

```bash
CI=true pnpm --filter @flowai/channel-adapters test
CI=true pnpm --filter @flowai/channel-adapters build
CI=true pnpm --filter @flowai/studio test
CI=true pnpm --filter @flowai/studio build
CI=true pnpm test
CI=true pnpm build
git diff --check
```

Browser/local verification:

```bash
PORT=4178 pnpm dev:flowai-studio
```

Confirm the local Studio page shows `Channel Preview Workspace`, `Web chat test`, `Telegram mock preview, not production bot.`, and `WhatsApp mock preview, not production WhatsApp.`

## Risks

- WhatsApp is a mock rendering only; it does not prove production WhatsApp delivery.
- Channel constraints are intentionally simplified for local review.
- Complex channel-specific capabilities may require separate adapter design later.

## Handoff Notes

Recommended next task after acceptance: TASK-016_EXPORT_AND_INTEGRATION_HUB.

Implementation summary:

- Added `packages/channel-adapters/src/preview.ts`.
- Added `formatRuntimeOutputForChannelPreviews`.
- Added Studio `channelPreview` output.
- Added `Channel Preview Workspace` panel in the local Studio page.
- Updated edited workflow command responses to refresh channel previews after visual edits.
