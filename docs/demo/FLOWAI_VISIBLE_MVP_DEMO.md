# FlowAI Visible MVP Demo

This guide shows the current local MVP path a reviewer can see today.

Run:

```bash
pnpm demo:flowai
```

In non-interactive CI-style shells, run:

```bash
CI=true pnpm demo:flowai
```

The command builds the workspace, then runs four synthetic examples through:

```text
text/markdown source
-> SourceDocument + sourceRefs
-> deterministic facts / BusinessUnderstanding draft
-> WorkflowGenerationPlan
-> WorkflowDefinition
-> runtime test conversation
-> Telegram preview mock output
```

## What The Owner Can See

The demo prints visible sections for:

- Clinic appointment document.
- Service lead document.
- FAQ document through the service workflow.
- Arabic clinic document.

Each case prints:

1. `SourceDocument` id, filename, status, content hash, line count, warnings/errors, and sourceRefs.
2. Extracted business facts and the generated `BusinessUnderstanding` draft id.
3. `WorkflowGenerationPlan` summary: selected template, capabilities, required fields, blockers, warnings.
4. `WorkflowDefinition` summary: workflow id, name, validation status, node list, generated tests.
5. Runtime transcript.
6. Telegram preview mock output.

## Example Output Shape

The clinic case shows output like:

```text
## Clinic appointment
Input: bright-dental-clinic.md

1. SourceDocument / sourceRefs
document.id: src_doc_3b53c067bcc744e7
sourceRefs include document, line_range, and markdown heading refs.

2. Extracted business facts / BusinessUnderstanding draft
businessName: Bright Dental Clinic
category: clinic
services: Dental checkup, Teeth whitening
requiredFields: name, phone, preferred date
faq: Do you accept emergency appointments?

3. WorkflowGenerationPlan summary
selectedTemplate: clinic_booking
capabilities: book_appointments, handoff_to_human, answer_faq
blockers: []

4. Generated WorkflowDefinition summary
workflowId: wf_bu_src_doc_3b53c067bcc744e7
valid: true
nodes: start, welcome, route_intent, collect_appointment, answer_faq, unsupported, handoff_staff, done

5. Runtime test conversation
bot: Welcome to Bright Dental Clinic. How can I help you today?
user: book appointment
bot: What is your name?
user: Huda Ali
bot: What phone number should the team use?
user: +966500000000
bot: What date do you prefer?
user: 2026-07-01
bot: Thanks. I will pass this appointment request to the team.

6. Telegram preview mock output
telegramMessages: What is your name?
awaitingInput.fieldKey: name
```

The Arabic case preserves Arabic source text and business name:

```text
businessName: عيادة النور
service: فحص الأسنان
faq answer: يتم تحويل طلبات الطوارئ إلى الفريق للمتابعة.
```

## What The Brain Is Doing

Today the "brain" is deterministic and source-constrained:

- It accepts text/markdown input objects only.
- It normalizes text and produces stable `SourceDocument` ids and sourceRefs.
- It extracts simple facts from explicit document structure:
  - top heading or `Business name:`
  - `Category:`
  - `Goal:`
  - `Services`
  - `Required fields`
  - `FAQs` using `Q:` / `A:`
  - `Policies`
- It converts those facts into a `BusinessUnderstanding` draft.
- It uses existing deterministic workflow templates:
  - `clinic_booking`
  - `service_lead`
- It validates generated Workflow JSON before runtime.
- It runs the workflow through the local runtime and Telegram mock adapter.

## Where AI Is Missing

There is no AI/prompting in this demo.

AI provider integration would be needed later for:

- extracting messy, unstructured business descriptions;
- resolving ambiguous services and policies;
- mapping varied document layouts into facts;
- generating better copy in Arabic and English;
- classifying complex business types;
- asking smarter missing questions;
- producing higher quality BusinessGraph candidates from real websites and documents.

The current deterministic layer is still useful because it shows the safe shape of the product path before AI is added.

## What Is Deterministic Today

- SourceDocument creation.
- SourceRef creation.
- Basic markdown/text fact extraction.
- BusinessUnderstanding draft assembly.
- WorkflowGenerationPlan selection.
- Workflow JSON generation for supported templates.
- Workflow validation.
- Runtime test loop.
- Telegram preview mock formatting.

## Current Limits

Not implemented:

- PDF parsing.
- DOCX/OCR.
- Website crawling.
- RAG, embeddings, or vector DB.
- AI extraction.
- Persistence/database.
- Auth/tenants.
- Studio UI.
- Production Telegram polling/webhooks.
- WhatsApp.
- Exporters.

FAQ support is currently demonstrated through existing service/clinic workflow templates. A standalone FAQ-only workflow remains deferred.

## Architecture Read

The architecture is still suitable for the product direction if the visible demo feels right:

- source evidence stays separate from workflows;
- BusinessUnderstanding remains channel-neutral;
- Workflow JSON stays strict and validated;
- runtime executes safe DSL, not generated code;
- Telegram is an adapter, not the workflow owner.

If the demo feels wrong, simplify or rebuild around the visible flow before adding more infrastructure:

- reduce fact extraction to fewer, clearer sections;
- simplify BusinessUnderstanding fields exposed to reviewers;
- make sourceRefs easier to read;
- add a small review surface before adding persistence;
- avoid adding AI until the deterministic review loop feels understandable.
