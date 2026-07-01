# TASK-012: AI Builder Prompt Pack And Mocked Orchestrator

Status: implemented
Owner/Agent: Codex
Context shards: `business-understanding.md`, `security.md`, `testing.md`

## Goal

Add a backend-only AI builder orchestration boundary with prompt pack files, provider interface, mocked provider tests, structured output validation, and deterministic fallback.

This task prepares FlowAI for high-quality AI-assisted business understanding without making live provider calls.

## Scope

- Create `packages/ai-builder-orchestrator`.
- Add prompt pack markdown files.
- Add typed provider interface.
- Add mocked provider execution path.
- Add AI-disabled deterministic fallback.
- Add manual schema validation for provider output.
- Add product catalog blocker logic for price/availability/recommendation claims without sourceRefs.
- Add tests for success and safety failure paths.
- Wire `apps/studio` to show orchestrator mode metadata without using live AI.

## Non-Goals

- No live OpenAI call.
- No OpenAI SDK.
- No dependency addition beyond workspace package wiring.
- No `.flowai.local.json` application read.
- No provider credentials.
- No upload endpoint.
- No PDF/DOCX parser.
- No crawling.
- No RAG/embeddings/vector DB.
- No persistence/database.
- No auth/tenants/billing.
- No live Telegram or WhatsApp.
- No Workflow DSL or runtime semantic change.
- No AI-generated Workflow JSON. Workflow drafts must still come from deterministic generator boundaries.

## Acceptance Criteria

- AI-disabled mode returns deterministic fallback output.
- Mock provider can return structured BusinessUnderstanding draft in tests.
- Malformed provider output falls back safely.
- Product/pricing/availability/recommendation claims require source evidence.
- Prompt files require strict structured output and sourceRefs.
- No secrets appear in logs/traces/orchestrator output.
- Studio can display orchestrator mode without live AI.

## Skill/MCP Readiness

- Task type: AI provider boundary, security, testing.
- Skills/tools used: Superpowers `using-superpowers`, `executing-plans`, `test-driven-development`, `verification-before-completion`.
- Can proceed without extra tools: yes, because provider calls are mocked and no live OpenAI integration is implemented.
- Missing tools worth recommending: official OpenAI docs should be used in the later live provider task.
- Tool risk: secrets and provider calls are explicitly out of scope.

## Verification Commands

Run:

```bash
CI=true pnpm --filter @flowai/ai-builder-orchestrator test
CI=true pnpm --filter @flowai/ai-builder-orchestrator build
CI=true pnpm --filter @flowai/studio test
CI=true pnpm test
CI=true pnpm build
git diff --check
```

## Risks

- Mocked orchestration may be mistaken for live AI if labels are unclear.
- Prompt pack quality will need real evaluation after a provider task.
- Product catalog safety must stay sourceRef-gated before recommendation workflows.

## Handoff Notes

Recommended next task after acceptance: TASK-013_PRODUCT_CATALOG_WORKSPACE.

Implementation summary:

- Added `packages/ai-builder-orchestrator`.
- Added prompt pack markdown files and typed prompt constants.
- Added mocked provider interface and `createMockAiBuilderProvider`.
- Added `orchestrateAiBuilderTurn` with disabled fallback and mocked provider path.
- Added manual provider output validation.
- Added `ProductCatalogDraft` and sourceRef-gated catalog validation.
- Added tests for disabled fallback, mocked success, malformed provider fallback, product price blockers, prompt safety, and secret-like redaction.
- Wired `apps/studio` to display AI builder orchestrator prompt-pack metadata while keeping live provider calls disabled.
