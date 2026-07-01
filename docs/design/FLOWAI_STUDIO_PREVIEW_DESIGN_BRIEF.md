# FlowAI Studio Preview Design Brief

## Goal

Create a local, owner-reviewable FlowAI product experience that shows the product path in a browser, not only terminal output or Markdown.

The preview demonstrates:

- source text or markdown input
- SourceDocument and sourceRefs
- deterministic BusinessUnderstanding draft
- optional backend-only AI extraction when `OPENAI_API_KEY` is configured
- WorkflowGenerationPlan
- validated Workflow JSON DSL
- editable review surfaces
- runtime test conversation
- Telegram preview mock

## Design Directions

### Executive Studio

Default. A polished SaaS dashboard with left navigation, clean cards, status chips, and business summary focus. This is the recommended owner/client review mode.

### AI Command Center

A darker product-review mode with stronger contrast, pipeline/status emphasis, trace-oriented panels, and validation visibility. This supports technical review of the “brain”.

### Workflow Canvas

A flow-first layout that gives the workflow visual more space and keeps the JSON/editor as an inspector. This is closest to the visual builder expectation without turning channels into runtime owners.

## Layout

- Left rail: product identity, design-mode selector, use-case selector.
- Top bar: product promise, deterministic/AI mode switch, analyze button.
- Source row: editable source text plus AI Brain panel.
- Review row: extracted facts, BusinessUnderstanding, WorkflowGenerationPlan.
- Workflow row: visual graph plus strict JSON inspector.
- Test row: runtime transcript plus Telegram mock.
- Owner decision panel: review questions and next-direction choices.

## Visual Approach

- Professional product UI, not default browser form styling.
- 8px-radius panels and controls.
- Clear status chips for AI, validation, workflow, and mock/production boundaries.
- RTL handling for the Arabic clinic source.
- No heavy UI framework or external design dependency in this iteration.

## Components

- Use Case Selector
- Source/Input Panel
- AI Brain Panel
- Extracted Facts Editor
- BusinessUnderstanding Inspector
- Workflow Plan Inspector
- Workflow Graph
- Workflow JSON Inspector
- Runtime Test Conversation
- Telegram Preview Mock
- Owner Decision Panel

## Old Prototype Parity Checklist

- Visible generated outputs: yes.
- Editable details: yes, through source and facts review fields.
- Multiple generated elements: yes, facts, BusinessUnderstanding, plan, workflow, runtime, Telegram mock.
- Product feel instead of logs: yes.
- AI brain visibility: yes, status, confidence, sourceRefs, assumptions, missing questions, warnings.
- Custom input: yes.

## Boundaries

This preview is local/demo only. It does not implement persistence, auth, tenants, production routing, live Telegram, WhatsApp, crawling, RAG, PDF/DOCX/OCR parsing, exporters, or production Studio.

AI extraction is optional and backend-only. It may enrich BusinessUnderstanding but cannot bypass workflow validation.
