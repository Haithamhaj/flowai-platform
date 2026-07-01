import {
  buildProductCatalogDraftFromBusinessUnderstanding,
  loadPromptPack,
  planProductInquiryWorkflow
} from "@flowai/ai-builder-orchestrator";
import { redactSecrets, safeExcerpt } from "@flowai/business-understanding";
import { formatRuntimeOutputForChannelPreviews, formatRuntimeOutputForTelegram, type ChannelPreviewWorkspace } from "@flowai/channel-adapters";
import { WorkflowRuntime, type RuntimeMessage } from "@flowai/runtime-core";
import { ingestSourceDocument } from "@flowai/source-ingestion";
import {
  buildBusinessUnderstandingFromFacts,
  extractBusinessFactsDraft,
  reviewSourceDocument
} from "@flowai/source-review";
import { validateWorkflow } from "@flowai/workflow-dsl";
import { generateWorkflowDraft } from "@flowai/workflow-generator";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";
import { buildWorkflowEditorModel, type WorkflowEditorModel } from "./workflow-editor.js";

export interface OwnerFirstPreviewInput {
  filename?: string;
  mimeType?: string;
  content: string;
}

export interface OwnerFirstPreview {
  status: "ready" | "blocked";
  aiMode: {
    status: "deterministic_fallback";
    label: string;
    note: string;
  };
  assistantMessage: string;
  suggestedQuestions: string[];
  sourcePanel: {
    documentId?: string;
    filename: string;
    sourceRefs: Array<{ id: string; label: string; locator: string }>;
    reviewExcerpt?: string;
    warnings: string[];
    errors: string[];
  };
  businessBrief: {
    businessName: string | null;
    category: string | null;
    language: "ar" | "en" | "auto";
    summary: string;
    services: Array<{ name: string; requiredFields: string[]; sourceRefs: string[] }>;
    faqs: Array<{ question: string; answer: string; sourceRefs: string[] }>;
    missingQuestions: string[];
  };
  workflowProposal: {
    selectedTemplate: string | null;
    capabilities: string[];
    requiredFields: string[];
    blockers: string[];
    warnings: string[];
  };
  productCatalog: {
    reviewStatus: "draft" | "review_required" | "blocked";
    items: Array<{
      name: string;
      type: string;
      description: string | null;
      price: string | null;
      priceConfidence: "source_backed_review_required" | "unknown";
      availability: string | null;
      availabilityConfidence: "source_backed_review_required" | "unknown";
      sourceRefs: string[];
      questionsToAsk: string[];
    }>;
    unknowns: string[];
    conflicts: string[];
    workflowPlan: {
      status: "blocked" | "review_required";
      capabilities: string[];
      blockers: string[];
      warnings: string[];
      suggestedQuestions: string[];
    };
  };
  workflowSummary?: {
    workflowId: string;
    name: string;
    valid: boolean;
    nodeCount: number;
    edgeCount: number;
    nodes: Array<{ id: string; type: string; name: string }>;
  };
  visualWorkflow?: WorkflowEditorModel;
  runtimeConversation: Array<{ from: "owner" | "bot" | "state"; messages: string[] }>;
  telegramPreview: Array<{ text: string; buttons: string[] }>;
  channelPreview: ChannelPreviewWorkspace;
  safetyNotes: string[];
}

const DEFAULT_CLINIC_TEXT = [
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
  "- Do not provide medical diagnosis."
].join("\n");

export function getDefaultOwnerInput(): OwnerFirstPreviewInput {
  return {
    filename: "bright-dental-clinic.md",
    mimeType: "text/markdown",
    content: DEFAULT_CLINIC_TEXT
  };
}

export function buildOwnerFirstPreview(input: OwnerFirstPreviewInput): OwnerFirstPreview {
  const promptPack = loadPromptPack();
  const promptCount = Object.keys(promptPack).length;
  const filename = input.filename?.trim() || "owner-business.md";
  const mimeType = input.mimeType?.trim() || inferMimeType(filename);
  const ingested = ingestSourceDocument({
    filename,
    mimeType,
    content: input.content
  });

  const aiMode = {
    status: "deterministic_fallback" as const,
    label: "Live AI pending",
    note: `This local preview uses the AI builder orchestrator prompt pack (${promptCount} prompts) with deterministic fallback. Live provider calls are still disabled.`
  };

  if (!ingested.ok) {
    return {
      status: "blocked",
      aiMode,
      assistantMessage: "I could not review this source yet. Fix the source text issue, then try again.",
      suggestedQuestions: ["Paste plain text or markdown only.", "Remove unsupported file content.", "Keep secrets out of source text."],
      sourcePanel: {
        filename,
        sourceRefs: [],
        warnings: ingested.document.warnings.map((warning) => warning.message),
        errors: ingested.document.errors.map((error) => error.message)
      },
      businessBrief: emptyBusinessBrief(),
      workflowProposal: {
        selectedTemplate: null,
        capabilities: [],
        requiredFields: [],
        blockers: ["Source document was rejected before business review."],
        warnings: []
      },
      productCatalog: emptyProductCatalogPanel(),
      runtimeConversation: [],
      telegramPreview: [],
      channelPreview: emptyChannelPreview(),
      safetyNotes: defaultSafetyNotes()
    };
  }

  const document = ingested.document;
  const review = reviewSourceDocument(document, { maxExcerptChars: 240 });
  const facts = extractBusinessFactsDraft(document);
  const understanding = buildBusinessUnderstandingFromFacts(facts);
  const catalog = buildProductCatalogDraftFromBusinessUnderstanding(understanding, facts.language);
  const productInquiryPlan = planProductInquiryWorkflow(catalog);
  const templateHint = inferTemplateHint(understanding.category);
  const workflowResult = generateWorkflowDraft({
    businessUnderstanding: understanding,
    templateHint,
    targetChannel: "telegram_preview",
    strict: false
  });
  const workflow = workflowResult.workflow;
  const validation = workflow ? validateWorkflow(workflow) : undefined;

  return {
    status: workflow && validation?.valid ? "ready" : "blocked",
    aiMode,
    assistantMessage: buildAssistantMessage(understanding.businessName, workflow),
    suggestedQuestions: buildSuggestedQuestions(understanding.category, workflowResult.generationPlan.missingBlockers.map((blocker) => blocker.message)),
    sourcePanel: {
      documentId: document.id,
      filename: document.filename,
      sourceRefs: document.sourceRefs.slice(0, 6).map((ref) => ({
        id: ref.id,
        label: ref.label,
        locator: formatLocator(ref.locator)
      })),
      reviewExcerpt: safeExcerpt(redactSecrets(review.boundedExcerpts[0]?.text ?? ""), 240),
      warnings: document.warnings.map((warning) => warning.message),
      errors: document.errors.map((error) => error.message)
    },
    businessBrief: {
      businessName: understanding.businessName,
      category: understanding.category,
      language: facts.language,
      summary: safeExcerpt(redactSecrets(understanding.summary), 320),
      services: understanding.services.map((service) => ({
        name: service.name,
        requiredFields: service.requiredFields,
        sourceRefs: service.sourceRefs
      })),
      faqs: understanding.faqs.slice(0, 3).map((faq) => ({
        question: faq.question,
        answer: safeExcerpt(redactSecrets(faq.answer), 220),
        sourceRefs: faq.sourceRefs
      })),
      missingQuestions: understanding.missingQuestions.map((question) => question.question)
    },
    workflowProposal: {
      selectedTemplate: workflowResult.generationPlan.selectedTemplate,
      capabilities: workflowResult.generationPlan.selectedCapabilities,
      requiredFields: workflowResult.generationPlan.requiredFields.map((field) => field.key),
      blockers: workflowResult.generationPlan.missingBlockers.map((blocker) => blocker.message),
      warnings: workflowResult.generationPlan.warnings.map((warning) => warning.message)
    },
    productCatalog: {
      reviewStatus: catalog.reviewStatus,
      items: catalog.items.map((item) => ({
        name: item.name,
        type: item.type,
        description: item.description,
        price: item.price,
        priceConfidence: item.price ? "source_backed_review_required" : "unknown",
        availability: item.availability,
        availabilityConfidence: item.availability ? "source_backed_review_required" : "unknown",
        sourceRefs: item.sourceRefs,
        questionsToAsk: item.questionsToAsk
      })),
      unknowns: catalog.unknowns,
      conflicts: catalog.conflicts,
      workflowPlan: productInquiryPlan
    },
    workflowSummary: workflow
      ? {
          workflowId: workflow.workflowId,
          name: workflow.name,
          valid: Boolean(validation?.valid),
          nodeCount: workflow.nodes.length,
          edgeCount: workflow.edges.length,
          nodes: workflow.nodes.map((node) => ({ id: node.id, type: node.type, name: node.name }))
        }
      : undefined,
    visualWorkflow: workflow ? buildWorkflowEditorModel(workflow) : undefined,
    runtimeConversation: workflow ? runRuntimePreview(workflow) : [],
    telegramPreview: workflow ? renderTelegramPreview(workflow) : [],
    channelPreview: workflow ? renderChannelPreview(workflow) : emptyChannelPreview(),
    safetyNotes: defaultSafetyNotes()
  };
}

function inferMimeType(filename: string): string {
  return filename.endsWith(".txt") ? "text/plain" : "text/markdown";
}

function inferTemplateHint(category: string | null): "clinic_booking" | "service_lead" {
  return category?.toLowerCase().includes("clinic") ? "clinic_booking" : "service_lead";
}

function buildAssistantMessage(businessName: string | null, workflow?: WorkflowDefinition): string {
  const name = businessName ?? "your business";
  if (!workflow) {
    return `I reviewed ${name}, but I need a little more information before I can draft a chatbot workflow.`;
  }
  return `I reviewed ${name} and drafted a chatbot workflow you can inspect, test, and later edit visually.`;
}

function buildSuggestedQuestions(category: string | null, blockers: string[]): string[] {
  if (blockers.length > 0) return blockers.slice(0, 3);
  if (category?.toLowerCase().includes("clinic")) {
    return [
      "Should the bot collect preferred appointment date before handoff?",
      "When should medical questions transfer to a human?",
      "Which services should appear as quick replies?"
    ];
  }
  return [
    "Which customer details should the bot collect first?",
    "When should the request transfer to a human?",
    "Which service should be the default lead path?"
  ];
}

function runRuntimePreview(workflow: WorkflowDefinition): OwnerFirstPreview["runtimeConversation"] {
  const runtime = new WorkflowRuntime({
    workflow,
    now: () => new Date("2026-07-01T00:00:00.000Z")
  });
  const started = runtime.start(`studio_${workflow.workflowId}`);
  const transcript: OwnerFirstPreview["runtimeConversation"] = [
    { from: "bot", messages: started.messages.map(formatRuntimeMessage) }
  ];
  const inputs = workflow.workflowId.includes("clinic")
    ? ["book appointment", "Huda Ali", "+966500000000", "2026-07-01"]
    : ["lead", "Noura", "+966511111111", "Riyadh office"];
  let state = started.state;

  for (const input of inputs) {
    if (state.ended) break;
    transcript.push({ from: "owner", messages: [input] });
    const output = runtime.receive(state, { text: input });
    state = output.state;
    transcript.push({ from: "bot", messages: output.messages.map(formatRuntimeMessage) });
  }

  transcript.push({ from: "state", messages: [`ended=${state.ended}`, `currentNode=${state.currentNodeId}`] });
  return transcript;
}

function renderTelegramPreview(workflow: WorkflowDefinition): OwnerFirstPreview["telegramPreview"] {
  const runtime = new WorkflowRuntime({
    workflow,
    now: () => new Date("2026-07-01T00:00:00.000Z")
  });
  const output = runtime.start(`telegram_${workflow.workflowId}`);
  return formatRuntimeOutputForTelegram({ output }).map((descriptor) => ({
    text: descriptor.text,
    buttons: descriptor.replyMarkup?.inline_keyboard.flatMap((row) => row.map((button) => button.text)) ?? []
  }));
}

function renderChannelPreview(workflow: WorkflowDefinition): ChannelPreviewWorkspace {
  const runtime = new WorkflowRuntime({
    workflow,
    now: () => new Date("2026-07-01T00:00:00.000Z")
  });
  const output = runtime.start(`channel_${workflow.workflowId}`);
  return formatRuntimeOutputForChannelPreviews({
    output,
    trace: output.traceEvents.map((entry) => ({ nodeId: entry.nodeId, event: entry.type }))
  });
}

function formatRuntimeMessage(message: RuntimeMessage): string {
  if (message.type === "choices") {
    return `[choices: ${message.choices.map((choice) => choice.label).join(", ")}]`;
  }
  return message.text;
}

function formatLocator(locator: { kind: string; startLine?: number; endLine?: number; heading?: string }): string {
  if (locator.kind === "line_range") return `lines ${locator.startLine ?? "?"}-${locator.endLine ?? "?"}`;
  if (locator.kind === "markdown_heading") return `heading ${locator.heading ?? ""}`.trim();
  return locator.kind;
}

function emptyBusinessBrief(): OwnerFirstPreview["businessBrief"] {
  return {
    businessName: null,
    category: null,
    language: "auto",
    summary: "No reviewable business brief is available yet.",
    services: [],
    faqs: [],
    missingQuestions: []
  };
}

function emptyProductCatalogPanel(): OwnerFirstPreview["productCatalog"] {
  return {
    reviewStatus: "blocked",
    items: [],
    unknowns: ["No reviewable catalog is available until the source document is accepted."],
    conflicts: [],
    workflowPlan: {
      status: "blocked",
      capabilities: [],
      blockers: ["Product inquiry workflow needs at least one source-backed catalog item."],
      warnings: [],
      suggestedQuestions: ["Paste source-backed product or service details."]
    }
  };
}

function emptyChannelPreview(): ChannelPreviewWorkspace {
  return {
    channels: [],
    runtimeTrace: []
  };
}

function defaultSafetyNotes(): string[] {
  return [
    "Live AI is not connected in this task.",
    "Workflow JSON remains strict JSON and validator-backed.",
    "Telegram output is a mock preview, not a production bot.",
    "Upload, crawling, RAG, persistence, WhatsApp, and exporters remain deferred."
  ];
}
