# FlowAI Extracted Document Harness Demo

Command:

```bash
pnpm demo:flowai:extracted
```

## What This Proves

FlowAI can now accept OCR-like extracted output as a structured fixture and continue through the same safe product path:

```text
ExtractedDocument
-> SourceDocument / sourceRefs / chunks
-> deterministic business facts
-> BusinessUnderstanding
-> WorkflowGenerationPlan
-> WorkflowDefinition
-> runtime test conversation
-> Telegram preview mock
```

## What The Owner Can See

The demo uses an Arabic clinic OCR-like fixture and shows:

- document/page sourceRefs;
- page chunks with confidence metadata;
- extracted business facts and BusinessUnderstanding;
- generated clinic booking workflow summary;
- runtime appointment conversation;
- Telegram preview mock output.

## What Is Still Deferred

- real OCR;
- PDF parsing;
- upload API;
- Google Document AI;
- RAG/vector stores;
- crawling;
- persistence;
- auth/tenants;
- live Telegram;
- WhatsApp.

## Current Decision

Use this contract as the bridge between any future OCR provider and FlowAI.

LeapOCR, MinerU, Docling, PaddleOCR, Google Document AI, or another OCR/parser can later map into this shape without becoming the owner of FlowAI workflow logic.
