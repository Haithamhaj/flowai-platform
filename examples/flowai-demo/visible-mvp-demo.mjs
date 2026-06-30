import { ingestSourceDocument } from "../../packages/source-ingestion/dist/index.js";
import {
  buildBusinessUnderstandingFromFacts,
  extractBusinessFactsDraft,
  reviewSourceDocument
} from "../../packages/source-review/dist/index.js";
import { generateWorkflowDraft } from "../../packages/workflow-generator/dist/index.js";
import { validateWorkflow } from "../../packages/workflow-dsl/dist/index.js";
import { RuntimeTestService } from "../../apps/api/dist/services/runtime-test.service.js";
import { TelegramPreviewService } from "../../apps/api/dist/services/telegram-preview.service.js";

const cases = [
  {
    id: "clinic_appointment",
    title: "Clinic appointment",
    filename: "bright-dental-clinic.md",
    mimeType: "text/markdown",
    templateHint: "clinic_booking",
    firstMessage: "book appointment",
    runtimeInputs: ["book appointment", "Huda Ali", "+966500000000", "2026-07-01"],
    telegramText: "book appointment",
    content: [
      "# Bright Dental Clinic",
      "Category: clinic",
      "Goal: book appointments and answer common questions.",
      "",
      "## Services",
      "- Dental checkup: Routine dental examination.",
      "- Teeth whitening: Cosmetic whitening consultation.",
      "",
      "## Required fields",
      "- name",
      "- phone",
      "- preferred date",
      "",
      "## FAQs",
      "Q: Do you accept emergency appointments?",
      "A: Emergency appointment requests are collected for staff follow-up.",
      "",
      "## Policies",
      "- Do not provide medical diagnosis.",
      "- Cancellation requests should be made 24 hours before the appointment."
    ].join("\n")
  },
  {
    id: "service_lead",
    title: "Service lead",
    filename: "clearspace-cleaning.txt",
    mimeType: "text/plain",
    templateHint: "service_lead",
    firstMessage: "lead",
    runtimeInputs: ["lead", "service_office_cleaning", "Noura", "+966511111111", "Riyadh office"],
    telegramText: "lead",
    content: [
      "Business name: ClearSpace Cleaning",
      "Category: service company",
      "Goal: collect leads for cleaning requests.",
      "Services:",
      "- Office cleaning: Recurring office cleaning.",
      "- Move-out cleaning: Deep cleaning for tenants.",
      "Required fields:",
      "- name",
      "- phone",
      "- location"
    ].join("\n")
  },
  {
    id: "faq_support",
    title: "FAQ support through service workflow",
    filename: "support-faq.md",
    mimeType: "text/markdown",
    templateHint: "service_lead",
    firstMessage: "faq",
    runtimeInputs: ["faq"],
    telegramText: "faq",
    content: [
      "# FlowCare Support",
      "Category: service company",
      "Goal: answer FAQs and collect support follow-up requests.",
      "",
      "## Services",
      "- Support follow-up: Collect customer details when the FAQ does not answer the request.",
      "",
      "## Required fields",
      "- name",
      "- phone",
      "",
      "## FAQs",
      "Q: What are your support hours?",
      "A: Support requests are reviewed from 9 AM to 5 PM, Sunday to Thursday.",
      "Q: Can the bot reset my account?",
      "A: No. The bot routes account reset requests to a human."
    ].join("\n")
  },
  {
    id: "arabic_clinic",
    title: "Arabic clinic document",
    filename: "arabic-clinic.md",
    mimeType: "text/markdown",
    templateHint: "clinic_booking",
    firstMessage: "book appointment",
    runtimeInputs: ["book appointment", "سارة", "+966522222222"],
    telegramText: "book appointment",
    content: [
      "# عيادة النور",
      "Category: clinic",
      "Goal: book appointments.",
      "",
      "## Services",
      "- فحص الأسنان: فحص وتنظيف دوري.",
      "",
      "## Required fields",
      "- name",
      "- phone",
      "",
      "## FAQs",
      "Q: هل تقبلون الحالات الطارئة؟",
      "A: يتم تحويل طلبات الطوارئ إلى الفريق للمتابعة."
    ].join("\n")
  }
];

console.log("FlowAI Visible MVP Demo");
console.log("=======================");
console.log("Path: text/markdown source -> SourceDocument -> facts/BusinessUnderstanding -> Workflow JSON -> runtime -> Telegram mock\n");

for (const demoCase of cases) {
  runCase(demoCase);
}

console.log("Deferred capabilities: PDF, DOCX, crawling, RAG, AI extraction, persistence, auth/tenants, Studio UI, production Telegram, WhatsApp, exporters.");

function runCase(demoCase) {
  console.log(`\n## ${demoCase.title}`);
  console.log(`Input: ${demoCase.filename}`);

  const ingested = ingestSourceDocument({
    filename: demoCase.filename,
    mimeType: demoCase.mimeType,
    content: demoCase.content
  });

  if (!ingested.ok) {
    console.log("SourceDocument rejected:");
    console.log(formatJson({
      error: ingested.error,
      document: summarizeSourceDocument(ingested.document)
    }));
    return;
  }

  const document = ingested.document;
  const review = reviewSourceDocument(document, { maxExcerptChars: 180 });
  const facts = extractBusinessFactsDraft(document);
  const understanding = buildBusinessUnderstandingFromFacts(facts);
  const workflowResult = generateWorkflowDraft({
    businessUnderstanding: understanding,
    templateHint: demoCase.templateHint,
    targetChannel: "telegram_preview",
    strict: true
  });
  const workflow = workflowResult.workflow;

  console.log("1. SourceDocument / sourceRefs");
  console.log(formatJson({
    document: summarizeSourceDocument(document),
    sourceRefs: document.sourceRefs.map(summarizeSourceRef),
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
    policies: understanding.policies.map((policy) => policy.title),
    unknowns: understanding.unknowns
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
    console.log(formatJson({
      workflow: null,
      validation: workflowResult.generationReport.validation
    }));
    return;
  }

  console.log(formatJson({
    workflowId: workflow.workflowId,
    name: workflow.name,
    valid: validateWorkflow(workflow).valid,
    nodes: workflow.nodes.map((node) => `${node.id}:${node.type}`),
    tests: workflow.tests.map((test) => test.id)
  }));

  console.log("5. Runtime test conversation");
  console.log(formatConversation(runRuntimeConversation(workflow, demoCase.runtimeInputs)));

  console.log("6. Telegram preview mock output");
  console.log(formatJson(runTelegramPreview(workflow, demoCase)));
}

function runRuntimeConversation(workflow, inputs) {
  const runtime = new RuntimeTestService();
  const transcript = [];
  const started = runtime.start(workflow, `demo_${workflow.workflowId}`);
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

function runTelegramPreview(workflow, demoCase) {
  const runtime = new RuntimeTestService();
  const telegram = new TelegramPreviewService(runtime);
  const connected = telegram.connect({ workflow, mode: "mock" });
  const update = telegram.update(connected.adapterId, {
    message: {
      chat: { id: `chat_${demoCase.id}` },
      from: { id: `user_${demoCase.id}` },
      text: demoCase.telegramText
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

function summarizeSourceDocument(document) {
  return {
    id: document.id,
    filename: document.filename,
    status: document.status,
    mimeType: document.mimeType,
    contentHash: document.contentHash,
    lineCount: document.metadata.lineCount,
    warnings: document.warnings.map((warning) => warning.code),
    errors: document.errors.map((error) => error.code)
  };
}

function summarizeSourceRef(sourceRef) {
  return {
    id: sourceRef.id,
    label: sourceRef.label,
    locator: sourceRef.locator
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
