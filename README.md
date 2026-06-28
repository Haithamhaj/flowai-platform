# FlowAI

FlowAI is a Business-to-Workflow Chatbot Generator.

It helps a user provide a business website, documents/PDFs, or a direct business interview, then turns that input into a safe Workflow JSON DSL that can be validated, tested, previewed first through Telegram, and later exported to Leap, CRM systems, and chatbot platforms.

## What FlowAI Is Not

- Not a memory system
- Not a generic prompt generator
- Not a Dify clone
- Not a Flowise clone
- Not a Typebot clone
- Not a manual-only visual builder
- Not a refactor of the old backend

## Current Status

Greenfield planning/bootstrap. The required operating pack, task system, context shards, review protocol, decision log, and handoff templates live in `docs/`.

Product code should only be implemented when a task explicitly permits it and the plan is accepted.

## How Agents Start

1. Read `AGENTS.md`.
2. Read `docs/00_PROJECT_CONTEXT.md`.
3. Read the active task in `docs/tasks/`.
4. Read the relevant shard in `docs/shards/`.
5. Produce a short plan before changing files.

## Where Work Lives

- Tasks: `docs/tasks/`
- Context shards: `docs/shards/`
- Review checklist: `docs/08_REVIEW_CHECKLIST.md`
- Definition of done: `docs/09_DEFINITION_OF_DONE.md`
- Decision log: `docs/10_DECISION_LOG.md`
- Handoff template: `docs/11_HANDOFF_TEMPLATE.md`

## First Technical Milestone

Workflow DSL + Validator + Runtime Interpreter + API Test Loop.

That milestone proves the safe core before crawler, generator, Studio UI, Telegram, WhatsApp, RAG, exports, auth, or persistence.

