# 01 Product Brief

## Target Users

- Business owners who want a chatbot without designing every branch manually.
- Operations and support teams that need booking, lead capture, FAQs, escalation, and policy guidance.
- Leap/internal teams that need exportable workflow definitions.

## Jobs To Be Done

- Convert messy business input into a structured workflow.
- Test the workflow before publishing.
- Preview the workflow in a real channel.
- Export the workflow to another platform without losing logic.

## Main User Journey

Provide website/docs/interview -> review extracted business understanding -> approve workflow draft -> test chat -> preview through Telegram -> export or publish.

## MVP Journey

Manual/business interview input -> Workflow JSON DSL -> validation -> runtime test loop.

## Later Journey

Website crawling, document ingestion, RAG, Telegram preview, WhatsApp, web widget, Studio editing, exports, analytics, tenants, auth, and persistence.

## Inputs

Website URL, PDFs/docs, interview answers, service lists, policies, FAQs, scenarios, forms, and escalation rules.

## Outputs

Business Understanding JSON, Workflow JSON DSL, validation report, runtime trace, channel-neutral responses, and export packages.

## Success Criteria

- Generated workflows are understandable, editable, safe, testable, and exportable.
- Runtime behavior can be traced.
- Channels do not change core workflow logic.

## Non-Goals

No memory system, prompt-only generator, clone of existing tools, manual-only builder, or old backend migration.

