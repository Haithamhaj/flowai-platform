# TASK-025: Customer Chat Screen

Status: ready for review
Owner/Agent: Codex
Parent: Owner-first visible product experience

## Goal

Add a separate customer-facing chat screen so the owner can see FlowAI as a normal chatbot builder, while keeping the existing technical Studio review screen unchanged.

This validates:

```text
customer chat / text file / website URL
-> existing Studio build pipeline
-> SourceDocument/sourceRefs
-> BusinessUnderstanding draft
-> WorkflowGenerationPlan summary
-> WorkflowDefinition summary
-> runtime test conversation
-> Telegram preview mock
-> lightweight workflow edit review
```

## Scope

- Add a new `/customer` local Studio route.
- Keep existing `/` Studio review route unchanged.
- Render a customer chat experience with:
  - full-screen message thread
  - text composer
  - browser-only `.md` / `.txt` file attach
  - website URL field
  - assistant result messages inside the conversation
  - workflow link/action inside the assistant message
  - lightweight workflow node text editing in an in-chat modal
- Reuse existing endpoints:
  - `POST /api/build`
  - `POST /api/crawl-build`
  - `POST /api/workflow-editor/command`
- Add focused tests proving the separate screen uses existing APIs and does not introduce upload behavior or executable workflow code.

## Non-Goals

- No changes to the existing `/` Studio screen.
- No server upload endpoint.
- No file storage.
- No PDF parsing.
- No OCR.
- No browser-rendered crawler.
- No persistence/database.
- No auth/tenants.
- No live Telegram or WhatsApp.
- No exporter or CRM/ticketing integration.
- No workflow DSL or runtime semantic changes.
- No dependency addition.

## Acceptance Criteria

- `/customer` opens as a separate customer-facing chat screen.
- `/` continues serving the existing Studio review screen.
- Text input builds a chatbot preview through the existing build pipeline.
- Browser-only `.md` / `.txt` attach reads file text and builds through the existing pipeline.
- Website URL builds through the existing crawl-build path.
- Arabic website catalog/service headings from crawled source text are surfaced as source-backed services/products when they are explicit in the source.
- When Live AI review is enabled, `/customer` renders AI-returned `ProductCatalogDraft.items` and AI missing questions inside the same chat response.
- Studio resolves the repository root before reading ignored local OpenAI config, so starting the server from the repo root still enables backend-only Live AI when `.flowai.local.json` exists.
- The result appears inside the chat, not under it or beside it.
- Customer-facing result messages summarize what FlowAI understood, found services/FAQs, sourceRefs, required fields, missing information, and whether a workflow can be opened.
- Internal labels such as SourceDocument, WorkflowGenerationPlan, and Generated WorkflowDefinition must not render as customer-facing panels.
- Workflow node text edits happen in a modal opened from a chat message action.
- Workflow node text edits call the existing workflow editor command endpoint and refresh preview panels.
- Tests verify no `/api/upload`, `eval`, or `new Function` path is introduced.
- A real `https://alboshrastore.com/` crawl-build check returns explicit source-backed items such as `حفر آبار`, `ذبح وتوزيع المواشي`, and `وقف مصاحف`, while still blocking workflow generation until required customer fields are supplied.
- A real `https://alboshrastore.com/` crawl-build check with Live AI enabled reports `aiMode.status=live_provider`, shows AI catalog items, and returns useful owner questions about required customer fields, handoff, and order completion.

## Tests

- `CI=true pnpm --filter @flowai/studio test -- customer-chat-view.test.ts`
- `CI=true pnpm --filter @flowai/studio test -- workspace-root.test.ts`
- `CI=true pnpm --filter @flowai/source-review test -- source-review.test.ts`
- `CI=true pnpm --filter @flowai/studio test`
- `CI=true pnpm --filter @flowai/studio typecheck`
- `CI=true pnpm test`
- `CI=true pnpm build`
- `git diff --check`
- Local API check:
  - `POST http://127.0.0.1:4178/api/crawl-build` with `https://alboshrastore.com/` returns Arabic service/product candidates from source text.
  - Same endpoint with `useLiveAi: true` reports backend-only `live_provider` mode when local OpenAI config is present.
- Manual/browser check:
  - `http://127.0.0.1:4178/` remains current Studio.
  - `http://127.0.0.1:4178/customer` shows the customer chat screen.

## Skill/MCP Readiness

- Skills used: Superpowers `using-superpowers`, `brainstorming`, and `test-driven-development`.
- Existing local tools are enough.
- No new MCP, connector, provider, dependency, or secret handling is needed.

## Risks

- This improves the visible customer entry point but remains a local demo surface.
- Browser-only file attach can prove the owner UX, but production upload still requires storage, auth, limits, malware scanning, parser safety, privacy, and retention decisions.
- The workflow editor remains a lightweight review/edit surface, not a full production graph editor.
- The customer chat now hides most internal terminology, so internal review still belongs on `/`.
- Website URL quality remains limited by the current bounded Cheerio crawler; JavaScript-heavy websites may still need a later browser-rendered crawler task.
- Arabic catalog extraction is intentionally conservative and pattern-based; it proves simple source-backed service discovery, not full product catalog extraction, pricing, availability, or recommendation quality.
- Live AI review improves catalog and missing-question quality, but Workflow JSON is still generated and validated deterministically; it is not yet a fully conversational multi-turn builder agent.

## Next Recommended Task

`TASK-026_CUSTOMER_CHAT_OWNER_REVIEW`

Goal: review the `/customer` experience with real owner examples and decide whether the next product task should improve chat intelligence, workflow editing UX, upload/OCR, or browser-rendered crawling.
