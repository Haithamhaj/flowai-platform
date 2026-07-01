# TASK-013: Product Catalog Workspace

Status: implemented
Owner/Agent: Codex
Context shards: `business-understanding.md`, `security.md`, `testing.md`, `studio-ui.md`

## Goal

Add a reviewable Product Catalog workspace for owner-first Studio so businesses with multiple products, packages, or services can inspect source-backed catalog facts without FlowAI inventing prices, availability, or recommendations.

## Scope

- Build `ProductCatalogDraft` deterministically from source-backed `BusinessUnderstanding.services`.
- Preserve sourceRefs, confidence, and unknown price/availability questions.
- Add product inquiry workflow planning guardrails.
- Show catalog items, sourceRefs, price confidence, availability confidence, unknowns, and blockers in Studio.
- Add tests for multi-item catalog extraction, missing source-backed item blockers, and Studio visibility.

## Non-Goals

- No live AI provider call.
- No OpenAI SDK.
- No `.flowai.local.json` read.
- No inventory integration.
- No product recommendation ranking.
- No price or availability claim without sourceRefs.
- No upload endpoint, parser, PDF/DOCX handling, crawling, RAG, persistence, auth, WhatsApp, exporters, or live Telegram.
- No Workflow DSL or runtime semantic change.
- No visual workflow editor implementation.

## Acceptance Criteria

- Product catalog is visible in Studio for multi-service/product-like input.
- Catalog items preserve sourceRefs.
- Price and availability show conservative confidence labels.
- Missing catalog items block product inquiry workflow planning.
- Missing prices/availability create warnings and owner questions, not invented claims.
- Existing workflow draft and Telegram mock preview still work.
- Tests and build pass.

## Skill/MCP Readiness

- Task type: UI, business understanding, security, testing.
- Skills/tools used: Superpowers `using-superpowers`, `executing-plans`, `test-driven-development`.
- Can proceed without extra tools: yes, because no new library or external provider is needed.
- Missing tools worth recommending: none for this task.
- Tool risk: live provider secrets and external dependencies are explicitly out of scope.

## Verification Commands

Run:

```bash
CI=true pnpm --filter @flowai/ai-builder-orchestrator test
CI=true pnpm --filter @flowai/ai-builder-orchestrator build
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

Confirm the local Studio page shows `Product Catalog Review`.

## Risks

- Deterministic extraction remains shallow and should not be mistaken for real AI product understanding.
- Catalog items currently derive from services/product-like source lines, not from a full ecommerce parser.
- Source-backed price/availability labels are conservative review markers, not publish-ready commerce evidence.
- Product recommendation workflows remain blocked or review-required until stronger source, freshness, conflict, and capability policies are implemented.

## Handoff Notes

Recommended next task after acceptance: TASK-014_VISUAL_WORKFLOW_EDITOR.

Implementation summary:

- Added deterministic catalog draft generation from `BusinessUnderstanding`.
- Added product inquiry planning guardrails.
- Wired the owner-first Studio preview to expose Product Catalog Review.
- Added tests for catalog extraction, blockers, warnings, and Studio output.
