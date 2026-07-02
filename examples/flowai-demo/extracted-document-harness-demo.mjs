import { ingestExtractedDocument } from "../../packages/source-ingestion/dist/index.js";
import {
  buildBusinessUnderstandingFromFacts,
  extractBusinessFactsDraft,
  reviewSourceDocument
} from "../../packages/source-review/dist/index.js";
import { generateWorkflowDraft } from "../../packages/workflow-generator/dist/index.js";
import { validateWorkflow } from "../../packages/workflow-dsl/dist/index.js";
import { RuntimeTestService } from "../../apps/api/dist/services/runtime-test.service.js";
import { TelegramPreviewService } from "../../apps/api/dist/services/telegram-preview.service.js";

const extractedFixture = {
  sourceId: "fixture_ocr_clinic_001",
  sourceKind: "manual_fixture",
  filename: "clinic-ocr-output.pdf",
  mimeType: "application/pdf",
  language: "ar",
  pages: [
    {
      pageNumber: 1,
      confidence: 0.94,
      text: [
        "# عيادة النور",
        "Category: clinic",
        "Goal: book appointments and answer common questions.",
        "",
        "## Services",
        "- فحص الأسنان: فحص وتنظيف دوري.",
        "- تبييض الأسنان: استشارة تجميلية."
      ].join("\n"),
      blocks: [
        { blockId: "title", kind: "heading", text: "عيادة النور", confidence: 0.96 },
        { blockId: "services", kind: "list", text: "فحص الأسنان\nتبييض الأسنان", confidence: 0.93 }
      ]
    },
    {
      pageNumber: 2,
      confidence: 0.88,
      text: [
        "## Required fields",
        "- name",
        "- phone",
        "- preferred date",
        "",
        "## FAQs",
        "Q: هل تقبلون الحالات الطارئة؟",
        "A: يتم تحويل طلبات الطوارئ إلى الفريق للمتابعة."
      ].join("\n"),
      tables: [
        {
          tableId: "intake-fields",
          confidence: 0.84,
          rows: [
            ["field", "required"],
            ["name", "yes"],
            ["phone", "yes"],
            ["preferred date", "yes"]
          ]
        }
      ]
    }
  ]
};

console.log("FlowAI Extracted Document Harness Demo");
console.log("=====================================");
console.log("Path: OCR-like output fixture -> ExtractedDocument contract -> SourceDocument/sourceRefs -> BusinessUnderstanding -> Workflow JSON -> runtime -> Telegram mock\n");

const ingested = ingestExtractedDocument(extractedFixture, { lowConfidenceThreshold: 0.8 });

if (!ingested.ok) {
  console.log("Extracted document rejected:");
  console.log(formatJson({ error: ingested.error, document: summarizeSourceDocument(ingested.document) }));
  process.exitCode = 1;
} else {
  const document = ingested.document;
  const review = reviewSourceDocument(document, { maxExcerptChars: 240 });
  const facts = extractBusinessFactsDraft(document);
  const understanding = buildBusinessUnderstandingFromFacts(facts);
  const workflowResult = generateWorkflowDraft({
    businessUnderstanding: understanding,
    templateHint: "clinic_booking",
    targetChannel: "telegram_preview",
    strict: true
  });
  const workflow = workflowResult.workflow;

  console.log("1. ExtractedDocument -> SourceDocument");
  console.log(formatJson({
    sourceKind: extractedFixture.sourceKind,
    document: summarizeSourceDocument(document),
    metadata: document.metadata,
    sourceRefs: document.sourceRefs.map(summarizeSourceRef),
    chunks: document.chunks.map((chunk) => ({
      id: chunk.id,
      sourceRefId: chunk.sourceRefId,
      locator: chunk.locator,
      extractionMethod: chunk.extractionMethod,
      metadata: chunk.metadata
    })),
    reviewExcerpt: review.boundedExcerpts[0]?.text ?? null
  }));

  console.log("2. Extracted business facts / BusinessUnderstanding draft");
  console.log(formatJson({
    businessUnderstandingId: understanding.id,
    businessName: understanding.businessName,
    category: understanding.category,
    services: understanding.services.map((service) => ({
      name: service.name,
      requiredFields: service.requiredFields,
      sourceRefs: service.sourceRefs
    })),
    faqs: understanding.faqs.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
      sourceRefs: faq.sourceRefs
    })),
    missingQuestions: understanding.missingQuestions.map((question) => question.question),
    confidence: understanding.confidence
  }));

  console.log("3. WorkflowGenerationPlan summary");
  console.log(formatJson({
    selectedTemplate: workflowResult.generationPlan.selectedTemplate,
    capabilities: workflowResult.generationPlan.selectedCapabilities,
    requiredFields: workflowResult.generationPlan.requiredFields.map((field) => field.key),
    blockers: workflowResult.generationPlan.missingBlockers,
    warnings: workflowResult.generationPlan.warnings.map((warning) => warning.id)
  }));

  console.log("4. Generated WorkflowDefinition summary");
  if (!workflow) {
    console.log(formatJson({ workflow: null, validation: workflowResult.generationReport.validation }));
    process.exitCode = 1;
  } else {
    console.log(formatJson({
      workflowId: workflow.workflowId,
      name: workflow.name,
      valid: validateWorkflow(workflow).valid,
      nodes: workflow.nodes.map((node) => `${node.id}:${node.type}`),
      tests: workflow.tests.map((test) => test.id)
    }));

    console.log("5. Runtime test conversation");
    console.log(formatConversation(runRuntimeConversation(workflow, ["book appointment", "سارة", "+966522222222", "2026-07-09"])));

    console.log("6. Telegram preview mock output");
    console.log(formatJson(runTelegramPreview(workflow)));
  }
}

console.log("\nDeferred: real OCR, PDF parsing, upload API, Google Document AI, RAG/vector stores, crawling, persistence, auth/tenants, live Telegram, WhatsApp.");

function runRuntimeConversation(workflow, inputs) {
  const runtime = new RuntimeTestService();
  const transcript = [];
  const started = runtime.start(workflow, `extracted_demo_${workflow.workflowId}`);
  transcript.push({ from: "bot", messages: started.output.messages.map(formatRuntimeMessage) });

  let current = started;
  for (const input of inputs) {
    if (current.stateSummary.ended) break;
    transcript.push({ from: "user", messages: [input] });
    current = runtime.message(started.sessionId, { message: input });
    transcript.push({ from: "bot", messages: current.output.messages.map(formatRuntimeMessage) });
  }

  transcript.push({
    from: "state",
    messages: [`ended=${current.stateSummary.ended}`, `currentNode=${current.stateSummary.currentNodeId}`]
  });

  return transcript;
}

function runTelegramPreview(workflow) {
  const runtime = new RuntimeTestService();
  const telegram = new TelegramPreviewService(runtime);
  const connected = telegram.connect({ workflow, mode: "mock" });
  const update = telegram.update(connected.adapterId, {
    message: {
      chat: { id: "chat_extracted_document_demo" },
      from: { id: "user_owner_review" },
      text: "book appointment"
    }
  });

  return {
    adapterId: connected.adapterId,
    status: connected.status,
    workflowId: connected.workflowId,
    telegramMessages: update.telegramMessages,
    stateSummary: {
      currentNodeId: update.stateSummary.currentNodeId,
      awaitingInput: update.stateSummary.awaitingInput,
      ended: update.stateSummary.ended
    }
  };
}

function formatRuntimeMessage(message) {
  if (!message || typeof message !== "object") return String(message);
  if (message.type === "choices" && Array.isArray(message.choices)) {
    return `[choices: ${message.choices.map((choice) => choice.label ?? choice.value ?? choice.id).join(", ")}]`;
  }
  const text = typeof message.text === "string" ? message.text : JSON.stringify(message);
  if (Array.isArray(message.quickReplies) && message.quickReplies.length > 0) {
    return `${text} [choices: ${message.quickReplies.map((reply) => reply.label ?? reply.value ?? reply.id).join(", ")}]`;
  }
  return text;
}

function summarizeSourceDocument(document) {
  return {
    id: document.id,
    filename: document.filename,
    status: document.status,
    mimeType: document.mimeType,
    contentHash: document.contentHash,
    lineCount: document.metadata.lineCount,
    pageCount: document.metadata.pageCount,
    warnings: document.warnings.map((warning) => warning.code),
    errors: document.errors.map((error) => error.code)
  };
}

function summarizeSourceRef(sourceRef) {
  return {
    id: sourceRef.id,
    label: sourceRef.label,
    locator: sourceRef.locator,
    metadata: sourceRef.metadata
  };
}

function formatConversation(transcript) {
  return transcript
    .map((turn) => `${turn.from}: ${turn.messages.join(" | ")}`)
    .join("\n");
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}
