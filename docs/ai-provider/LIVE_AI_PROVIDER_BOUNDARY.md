# Live AI Provider Boundary

Status: planned
Related task: `docs/tasks/TASK-017_LIVE_AI_PROVIDER_PLANNING_OR_EXTRACTION_SPIKE.md`

## Purpose

FlowAI needs live AI to make the owner-first builder feel smart enough to understand real businesses, services, FAQs, Arabic instructions, and product catalogs. The live provider must improve BusinessUnderstanding extraction without becoming the source of truth for runtime behavior.

The safe boundary is:

```text
SourceDocument / owner conversation
-> deterministic baseline extraction
-> live AI structured refinement
-> schema validation
-> sourceRef validation
-> deterministic WorkflowGenerationPlan
-> deterministic WorkflowDefinition
-> workflow validator / runtime / previews / exports
```

AI may help understand source-backed facts. AI must not directly publish Workflow JSON.

## First Allowed Use Case

The first live provider task should support BusinessUnderstanding refinement only:

- summarize what the business does;
- extract services and service groups;
- extract FAQs and policies;
- draft product catalog items only when source-backed;
- identify missing business questions;
- support Arabic source text and Arabic owner conversation.

The provider output must remain reviewable and source-backed. Unsupported or unsupported-by-source facts must become blockers or review questions, not workflow behavior.

## Backend-Only Boundary

Provider access belongs on the backend or in a backend-only local package path. Browser code must never read provider keys or local secret files.

Implementation requirements:

- provider disabled by default;
- provider availability reported as `configured: true/false`, never by printing a key;
- provider input limited to source text, owner instructions, and prompt-pack context;
- provider output parsed as unknown data before validation;
- raw provider response excluded from UI, traces, logs, generated docs, and workflow JSON;
- deterministic fallback used when provider is absent, invalid, rate-limited, or unsafe.

## Secret Handling

Allowed later, after explicit implementation approval:

- backend-only environment variables;
- ignored local development config for local smoke tests.

Never allowed:

- API keys in git;
- API keys in request bodies;
- API keys in browser bundles;
- API keys in workflow JSON;
- API keys in BusinessUnderstanding, SourceDocument, traces, logs, screenshots, docs, tests, or export packages.

Provider errors must be sanitized before returning diagnostics.

## Model Selection

Do not hardcode a permanent model as a product decision. Model choice should be backend-only configuration with sensible defaults selected during the implementation task after checking current official OpenAI API documentation.

Recommended routing later:

- extraction/refinement: highest-quality configured model;
- critic/safety checks: high-reliability configured model;
- tests and CI: mocked provider only.

## Structured Output Contract

The provider should return strict JSON that maps into existing FlowAI review boundaries:

- `businessUnderstandingPatch`
- `productCatalogDraft`
- `missingQuestions`
- `sourceRefs`
- `safetyFlags`

The parser must reject:

- malformed JSON;
- executable code or workflow expressions;
- final Workflow JSON;
- product price, availability, eligibility, policy, or recommendation claims without sourceRefs;
- unsupported services, channels, integrations, or actions that are not present in source material.

## Prompt Requirements

Prompts must instruct the provider to:

- behave like a business-building assistant for owners;
- ask one useful follow-up question at a time;
- support Arabic when the source or owner uses Arabic;
- avoid invented facts, prices, availability, policies, and recommendations;
- return strict structured JSON only;
- attach sourceRefs to factual claims;
- never generate executable workflow logic;
- never generate final WorkflowDefinition JSON.

## Testing Requirements

Automated tests for the implementation task should cover:

- provider disabled path;
- mock provider success path;
- malformed provider output fallback;
- secret-like output redaction;
- product catalog sourceRef blockers;
- sanitized provider diagnostics;
- CI never requiring a live key.

Local non-CI smoke, after approval, should prove:

- ignored local key/config can be used without entering git;
- provider is called for one small clinic or service example;
- output remains structured;
- no secrets appear in stdout, UI payloads, workflow JSON, traces, docs, or exports;
- disabling config returns to deterministic fallback.

## Non-Goals

- No upload endpoint.
- No PDF/DOCX parser.
- No crawling.
- No RAG or vector database.
- No persistence.
- No auth/tenants/billing.
- No live Telegram or WhatsApp.
- No production deployment.
- No Workflow DSL or runtime semantic change.

## Next Task

`TASK-017A_BACKEND_ONLY_OPENAI_EXTRACTION_SPIKE`

That task should be backend-only, disabled by default, mock-tested first, and optionally smoke-tested locally with ignored credentials.
