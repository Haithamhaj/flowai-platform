# TASK-004 Telegram Preview

Status: done
Owner/Agent: Codex
Context shard: `telegram-preview.md`

## Goal

Implement the first Telegram preview adapter after Workflow DSL, Runtime Core, and API Test Loop acceptance.

## Why Now

Telegram is the first low-friction external channel for real preview. The accepted API test loop now proves workflow start/message/reset/trace behavior through channel-neutral runtime output, so the next implementation can stay adapter-focused.

## Non-Goals

No WhatsApp, no production channel platform, no runtime logic changes, no workflow-dsl changes, no AI/RAG provider calls, no crawling, no durable persistence, no auth/tenant/billing work, no Studio UI, and no exporter work.

## Inputs

Channel-neutral runtime output, process-local API test sessions, Telegram bot token via secret/env reference for future polling, and mocked Telegram updates for tests.

## Skill/MCP Readiness

- Task type: channel adapter and API preview surface.
- Skills/tools expected: Context7/official docs for grammY or Telegraf; secret-safe token handling; local unit tests with mocked Telegram updates.
- Skills/tools available: local tooling; Context7 docs for grammY and Telegraf; external Telegram live test only with explicit approval and a user-provided bot token.
- Missing skills/tools worth recommending: none before implementation. A live Telegram smoke capability/token can be requested only after mock coverage passes.
- Decision: proceed with mock/update endpoint implementation first; defer grammY and live polling until a follow-up because no SDK is needed for token-free tests.

## Expected Outputs

Telegram adapter package/module, mock local preview mode, message mapping, update mapping, preview session mapping, reset, trace lookup, and tests/mocks.

## Files Likely Touched

Future implementation should likely touch `packages/channel-adapters/`, `apps/api/`, and this task doc only. It should not touch `packages/runtime-core/` or `packages/workflow-dsl/` unless a blocker is found and explicitly approved.

## Acceptance Criteria

- No hardcoded token and no token in workflow JSON.
- Adapter maps runtime output without owning workflow logic.
- Telegram update mapper converts text and callback/button updates into runtime input only.
- Channel-neutral runtime messages are formatted into Telegram text messages and inline/reply buttons.
- Preview session mapping connects Telegram chat/user identity to one runtime test session.
- Reset preview session works without deleting unrelated sessions.
- Trace lookup returns the runtime trace for the mapped preview session.
- Local preview can be tested with mocks; optional live Telegram smoke requires explicit token approval.
- Mock update endpoint is used for local development in TASK-004.
- Long polling and production webhook are documented as later work; production webhook must include verification.

## Test Plan

Mock adapter tests; API route tests; optional live Telegram smoke only with approved token.

## Review Checklist

Secrets, adapter boundary, no workflow duplication, no runtime/API behavior expansion beyond preview routing.

## Risks

Telegram behavior drifting from core runtime; token leakage in logs/traces; callback payloads becoming workflow logic; process-local preview sessions being mistaken for production persistence.

## Handoff Notes

## Planning Review

Current task: TASK-004 Telegram Preview planning only.

Prototype check:

- `packages/channel-adapters` currently contains only planned adapter descriptors for Telegram, WhatsApp, and web widget.
- No Telegram implementation, grammY dependency, Telegraf dependency, bot token handling, polling, webhook, or channel API routes exist yet.

Runtime/API readiness:

- Runtime Core is sufficient for a first preview because it accepts text/choice-style runtime input and returns channel-neutral `text` and `choices` messages.
- API Test Loop is sufficient as the initial backing surface because it exposes `POST /runtime/test/start`, `POST /runtime/test/:sessionId/message`, `POST /runtime/test/:sessionId/reset`, and `GET /runtime/test/:sessionId/trace`.
- The future Telegram adapter should call or share this test-loop behavior through a narrow service boundary. It should not duplicate runtime branching or inspect workflow edges directly.

Dependency recommendation:

- Recommend grammY for TASK-004 implementation.
- Reason: grammY is TypeScript-first, has strong official docs, supports long polling and webhooks, has a middleware/plugin model, and maps well to a small adapter boundary.
- Telegraf is also viable and mature, with long polling, webhook, middleware, typed context, and inline keyboard support. It is a reasonable fallback if implementation experience or existing team familiarity favors it.
- OSS policy status: dependency not added yet. Before implementation, document license, maintenance risk, security risk, and package boundary in the implementation handoff.

Minimal implementation scope:

- Add Telegram adapter module under `packages/channel-adapters`.
- Format runtime output:
  - `text` -> Telegram text message.
  - `choices` -> Telegram buttons using stable callback data derived from runtime choice ids/values.
- Map Telegram input:
  - text messages -> runtime `{ message: text }`.
  - callback/button selections -> runtime message using the callback choice id/value.
- Maintain a preview session map from Telegram chat/user to runtime test session id.
- Support preview start/connect, reset, and trace lookup.
- Keep storage temporary/in-memory for this task unless a separate persistence task is approved.

Security/token plan:

- Token must come from environment or a secret reference such as `tokenSecretRef`; never from Workflow JSON.
- Do not log token values, webhook secret values, raw update payloads with secrets, or authorization headers.
- Do not include secrets in runtime trace details.
- Reject missing/invalid token configuration with a safe startup/connect error.
- For production webhook later, require webhook secret verification before accepting updates.

Local development approach:

- Use long polling for local preview because it avoids public webhook tunneling and webhook verification setup.
- Keep production webhook as later work unless explicitly included in an approved implementation prompt.

Endpoint recommendation:

- Prefer fewer endpoints for TASK-004:
  - `POST /channels/telegram/start-preview` to create/start an adapter preview from a workflow and token reference/env selection.
  - `POST /channels/telegram/:adapterId/reset-session` to reset the mapped preview session.
  - `GET /channels/telegram/:adapterId/sessions/:sessionId/trace` to inspect trace for debugging.
- Defer `POST /channels/telegram/webhook/:adapterId` until production webhook work.
- Avoid a separate `connect-preview` endpoint unless implementation shows token validation and preview start need different lifecycles.

Required tests before accepting implementation:

- Formatter maps runtime text and choices into Telegram send payloads without workflow logic.
- Update mapper handles text messages and callback selections.
- Session mapper reuses the same runtime session for a Telegram chat/user and isolates different chats/users.
- Reset clears the correct preview session only.
- Trace lookup returns the runtime trace for the mapped session.
- Token config rejects raw workflow JSON tokens and redacts secrets from errors/log-like outputs.
- API route tests cover start-preview, reset-session, and trace behavior using mocked Telegram/runtime boundaries.
- No live Telegram smoke is required for acceptance unless a token is explicitly approved.

Skill/MCP check:

- Performed.
- Tools used: local shell, GitHub CLI, Context7 docs for grammY and Telegraf.
- Tools recommended but not installed: none.

Suggested next task:

- Implement TASK-004 using grammY, mocked Telegram tests first, and long polling for local preview only.

## Implementation Handoff

Current task: TASK-004 Telegram Preview.

What changed:

- Added pure Telegram adapter functions in `packages/channel-adapters`:
  - runtime text/choices formatter to Telegram-sendable descriptors
  - Telegram text/callback update mapper
  - preview config validation with raw-token rejection and `env:VARIABLE` secret references
- Added API preview endpoints under `/channels/telegram/preview`.
- Added in-memory adapter/session mapping keyed by adapter id, chat id, and Telegram user id.
- Reused `RuntimeTestService` for workflow validation, runtime session creation, message delivery, reset, and trace lookup.
- Added tests for formatter, update mapper, connect, update, session reuse/isolation, reset, trace, safe errors, no external keys, and polling-disabled behavior.

Endpoints added:

- `POST /channels/telegram/preview/connect`
- `POST /channels/telegram/preview/:adapterId/update`
- `POST /channels/telegram/preview/:adapterId/reset-session`
- `GET /channels/telegram/preview/:adapterId/sessions/:sessionId/trace`

Dependency status:

- No external Telegram SDK was added.
- `grammy@1.44.0` was verified from npm as MIT licensed and remains the recommended dependency for a later live polling follow-up.
- Added only workspace dependencies:
  - `@flowai/api` -> `@flowai/channel-adapters`
  - `@flowai/channel-adapters` -> `@flowai/runtime-core` for runtime message/output types

Polling status:

- Live polling is explicitly deferred.
- `mode: "polling"` requires `tokenSecretRef`, then returns `TELEGRAM_POLLING_DISABLED`.
- Tests do not start polling and do not require a Telegram token.

Commands run:

- `npm view grammy version license repository.url`
- `CI=true pnpm install --no-frozen-lockfile`
- `CI=true pnpm --filter @flowai/channel-adapters build`
- `CI=true pnpm --filter @flowai/channel-adapters test`
- `CI=true pnpm --filter @flowai/channel-adapters typecheck`
- `CI=true pnpm --filter @flowai/api test`
- `CI=true pnpm --filter @flowai/api typecheck`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `CI=true pnpm install --frozen-lockfile`

Test/build status:

- All required tests and builds passed.

Skill/MCP check:

- Performed.
- Tools used: local shell, npm metadata, Context7 grammY docs.
- Tools recommended but not installed: none for this slice.

Decisions made:

- Implement TASK-004 as a mock/local Telegram update endpoint first.
- Defer grammY dependency and live polling until TASK-004 follow-up because pure mapping/orchestration does not require a Telegram SDK or token.
- Keep session storage in memory and preview-only.

Risks remaining:

- Preview sessions are process-local, temporary, lost on restart, not tenant-safe, and not horizontally scalable.
- This is not production Telegram deployment.
- Live polling and webhooks remain unimplemented.
- Callback payloads are intentionally small adapter-owned values; richer Telegram interactions may need a callback registry later.

Suggested next task:

- Review TASK-004 implementation PR. After acceptance, plan a separate live Telegram polling/dev-smoke task using grammY and an approved token.
