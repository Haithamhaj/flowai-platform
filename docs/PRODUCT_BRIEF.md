# Product Brief

## Definition

FlowAI is a Business-to-Workflow Chatbot Generator. It helps a business owner or operator provide a website, documents, or interview answers, then produces a safe workflow chatbot definition that can be tested and later deployed.

## Target User

- Business owners who want a chatbot without manually drawing every branch.
- Operations teams that need support, lead capture, booking, FAQ, and escalation flows.
- Internal Leap teams that need exportable workflow definitions.

## Core Use Cases

- Understand services, FAQs, policies, customer scenarios, required fields, and escalation rules.
- Generate a workflow draft as strict JSON.
- Validate the workflow before runtime.
- Test the chatbot immediately in a channel-neutral test chat.
- Preview externally through Telegram later.
- Export to Leap, CRM, and chatbot platforms later.

## MVP Flow

Business input -> Business Understanding JSON -> Workflow JSON DSL -> Validator -> Runtime test chat -> Trace -> Later Telegram preview -> Later exports.

## Non-Goals

- No legacy backend migration in this phase.
- No generic chatbot builder clone.
- No executable JavaScript workflow logic.
- No production WhatsApp integration yet.
- No RAG or AI generation in the first vertical slice.

