import {
  buildProductCatalogDraftFromBusinessUnderstanding,
  type AiBuilderProvider,
  type FlowAiKnowledgeBaseSearchMatch,
  type OpenAiProviderDiagnostics,
  type OpenAiVectorStoreClient,
  loadPromptPack,
  orchestrateAiBuilderTurn,
  planProductInquiryWorkflow
} from "@flowai/ai-builder-orchestrator";
import { redactSecrets, safeExcerpt } from "@flowai/business-understanding";
import { formatRuntimeOutputForChannelPreviews, formatRuntimeOutputForTelegram, type ChannelPreviewWorkspace } from "@flowai/channel-adapters";
import { buildWorkflowIntegrationHub, type IntegrationHubPayload } from "@flowai/exporters";
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
  sourceKind?: "business_description" | "document_text" | "website_text";
  sourceUrl?: string;
  content: string;
}

export interface OwnerChecklistItem {
  id:
    | "source_document"
    | "source_refs"
    | "business_understanding"
    | "catalog_review"
    | "workflow_generation"
    | "runtime_test"
    | "telegram_preview"
    | "export_package"
    | "rag_search"
    | "ocr_pdf"
    | "website_crawling";
  label: string;
  status: "done" | "review" | "blocked" | "not_enabled";
  note: string;
}

export interface KnowledgeSearchPanel {
  status: "not_enabled" | "unconfigured" | "blocked" | "ready";
  query: string;
  matches: Array<Pick<FlowAiKnowledgeBaseSearchMatch, "score" | "sourceRefId" | "fileId"> & { text: string }>;
  note: string;
}

export interface OwnerFirstPreview {
  status: "ready" | "blocked";
  aiMode: {
    status: "deterministic_fallback" | "live_provider" | "unconfigured";
    label: string;
    note: string;
  };
  assistantMessage: string;
  suggestedQuestions: string[];
  sourcePanel: {
    documentId?: string;
    filename: string;
    sourceKind: "business_description" | "document_text" | "website_text";
    sourceUrl: string | null;
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
  ownerChecklist: OwnerChecklistItem[];
  knowledgeSearch: KnowledgeSearchPanel;
  workflowSummary?: {
    workflowId: string;
    name: string;
    valid: boolean;
    nodeCount: number;
    edgeCount: number;
    nodes: Array<{ id: string; type: string; name: string }>;
  };
  visualWorkflow?: WorkflowEditorModel;
  integrationHub?: IntegrationHubPayload;
  runtimeConversation: Array<{ from: "owner" | "bot" | "state"; messages: string[] }>;
  telegramPreview: Array<{ text: string; buttons: string[] }>;
  channelPreview: ChannelPreviewWorkspace;
  safetyNotes: string[];
}

export interface OwnerFirstAiReviewOptions {
  useLiveAi: boolean;
  providerDiagnostics: OpenAiProviderDiagnostics;
  provider?: AiBuilderProvider;
  useKnowledgeSearch?: boolean;
  knowledgeSearchQuery?: string;
  knowledgeProviderDiagnostics?: OpenAiProviderDiagnostics;
  knowledgeClient?: OpenAiVectorStoreClient;
  knowledgeSearchRetryDelayMs?: number;
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
  const sourceKind = input.sourceKind ?? "business_description";
  const sourceUrl = normalizeSourceUrl(input.sourceUrl);
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
        sourceKind,
        sourceUrl,
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
      ownerChecklist: buildOwnerChecklist({
        sourceAccepted: false,
        sourceRefCount: 0,
        businessUnderstandingReady: false,
        catalogReviewStatus: "blocked",
        workflowValid: false,
        runtimeTurnCount: 0,
        telegramMessageCount: 0,
        exportReady: false,
        ragStatus: "not_enabled"
      }),
      knowledgeSearch: disabledKnowledgeSearchPanel(),
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
  const runtimeConversation = workflow ? runRuntimePreview(workflow) : [];
  const telegramPreview = workflow ? renderTelegramPreview(workflow) : [];
  const integrationHub = workflow ? buildWorkflowIntegrationHub({ workflow }) : undefined;
  const productCatalog = mapProductCatalogPanel(catalog, productInquiryPlan);
  const workflowValid = Boolean(workflow && validation?.valid);

  return {
    status: workflowValid ? "ready" : "blocked",
    aiMode,
    assistantMessage: buildAssistantMessage(understanding.businessName, workflow),
    suggestedQuestions: buildSuggestedQuestions(understanding.category, workflowResult.generationPlan.missingBlockers.map((blocker) => blocker.message)),
    sourcePanel: {
      documentId: document.id,
      filename: document.filename,
      sourceKind,
      sourceUrl,
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
    productCatalog,
    ownerChecklist: buildOwnerChecklist({
      sourceAccepted: true,
      sourceRefCount: document.sourceRefs.length,
      businessUnderstandingReady: Boolean(understanding.businessName || understanding.summary),
      catalogReviewStatus: productCatalog.reviewStatus,
      workflowValid,
      runtimeTurnCount: runtimeConversation.length,
      telegramMessageCount: telegramPreview.length,
      exportReady: Boolean(integrationHub),
      ragStatus: "not_enabled"
    }),
    knowledgeSearch: disabledKnowledgeSearchPanel(),
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
    integrationHub,
    runtimeConversation,
    telegramPreview,
    channelPreview: workflow ? renderChannelPreview(workflow) : emptyChannelPreview(),
    safetyNotes: defaultSafetyNotes()
  };
}

export async function buildOwnerFirstPreviewWithAiReview(
  input: OwnerFirstPreviewInput,
  options: OwnerFirstAiReviewOptions
): Promise<OwnerFirstPreview> {
  const deterministic = buildOwnerFirstPreview(input);
  let preview = deterministic;

  if (options.useLiveAi && (!options.providerDiagnostics.configured || !options.provider)) {
    preview = {
      ...deterministic,
      aiMode: {
        status: "unconfigured",
        label: "Live AI unavailable",
        note: "Live AI review was requested, but no backend provider is configured. Deterministic fallback is still available."
      }
    };
  } else if (options.useLiveAi && options.provider) {
    const providerResult = await orchestrateAiBuilderTurn({
      mode: "live_provider",
      source: {
        filename: input.filename?.trim() || "owner-business.md",
        mimeType: input.mimeType?.trim() || inferMimeType(input.filename?.trim() || "owner-business.md"),
        content: input.content
      },
      provider: options.provider
    });
    const productInquiryPlan = planProductInquiryWorkflow(providerResult.productCatalog);
    const fallbackReason = providerResult.providerDiagnostics.fallbackReason;
    const productCatalog = mapProductCatalogPanel(providerResult.productCatalog, productInquiryPlan);

    preview = {
      ...deterministic,
      aiMode: {
        status: providerResult.mode === "live_provider" ? "live_provider" : "deterministic_fallback",
        label: providerResult.mode === "live_provider" ? "Live AI review" : "Live AI fallback",
        note:
          providerResult.mode === "live_provider"
            ? `Reviewed with backend-only live AI provider (${options.providerDiagnostics.model ?? "configured model"}). Workflow JSON is still generated deterministically.`
            : `Live AI provider returned an unsafe or invalid result, so FlowAI used deterministic fallback. ${fallbackReason ?? ""}`.trim()
      },
      assistantMessage:
        providerResult.mode === "live_provider"
          ? `I reviewed ${providerResult.businessUnderstanding.businessName ?? "the business"} with live AI and kept the workflow draft under deterministic validation.`
          : deterministic.assistantMessage,
      businessBrief: {
        ...deterministic.businessBrief,
        businessName: providerResult.businessUnderstanding.businessName,
        category: providerResult.businessUnderstanding.category,
        summary: safeExcerpt(redactSecrets(providerResult.businessUnderstanding.summary), 320),
        missingQuestions: providerResult.businessUnderstanding.missingQuestions.map((question) => question.question)
      },
      productCatalog,
      ownerChecklist: buildOwnerChecklist({
        sourceAccepted: deterministic.sourcePanel.errors.length === 0,
        sourceRefCount: deterministic.sourcePanel.sourceRefs.length,
        businessUnderstandingReady: Boolean(providerResult.businessUnderstanding.businessName || providerResult.businessUnderstanding.summary),
        catalogReviewStatus: productCatalog.reviewStatus,
        workflowValid: Boolean(deterministic.workflowSummary?.valid),
        runtimeTurnCount: deterministic.runtimeConversation.length,
        telegramMessageCount: deterministic.telegramPreview.length,
        exportReady: Boolean(deterministic.integrationHub),
        ragStatus: deterministic.knowledgeSearch.status
      }),
      safetyNotes: [
        "Live AI review is source-backed draft assistance only; Workflow JSON is still generated and validated deterministically.",
        ...deterministic.safetyNotes
      ]
    };
  }

  if (!options.useKnowledgeSearch) return preview;
  return withKnowledgeSearch(input, preview, options);
}

function inferMimeType(filename: string): string {
  return filename.endsWith(".txt") ? "text/plain" : "text/markdown";
}

function normalizeSourceUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return safeExcerpt(redactSecrets(trimmed), 240);
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

function mapProductCatalogPanel(
  catalog: ReturnType<typeof buildProductCatalogDraftFromBusinessUnderstanding>,
  productInquiryPlan: ReturnType<typeof planProductInquiryWorkflow>
): OwnerFirstPreview["productCatalog"] {
  return {
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
  };
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

async function withKnowledgeSearch(
  input: OwnerFirstPreviewInput,
  preview: OwnerFirstPreview,
  options: OwnerFirstAiReviewOptions
): Promise<OwnerFirstPreview> {
  const knowledgeSearch = await runKnowledgeSearch(input, options);
  return {
    ...preview,
    knowledgeSearch,
    ownerChecklist: buildOwnerChecklist({
      sourceAccepted: preview.sourcePanel.errors.length === 0,
      sourceRefCount: preview.sourcePanel.sourceRefs.length,
      businessUnderstandingReady: Boolean(preview.businessBrief.businessName || preview.businessBrief.summary),
      catalogReviewStatus: preview.productCatalog.reviewStatus,
      workflowValid: Boolean(preview.workflowSummary?.valid),
      runtimeTurnCount: preview.runtimeConversation.length,
      telegramMessageCount: preview.telegramPreview.length,
      exportReady: Boolean(preview.integrationHub),
      ragStatus: knowledgeSearch.status
    })
  };
}

async function runKnowledgeSearch(
  input: OwnerFirstPreviewInput,
  options: OwnerFirstAiReviewOptions
): Promise<KnowledgeSearchPanel> {
  const query = options.knowledgeSearchQuery?.trim() || "What should the chatbot know about this business?";
  if (!options.knowledgeProviderDiagnostics?.configured || !options.knowledgeClient) {
    return {
      status: "unconfigured",
      query,
      matches: [],
      note: "RAG search was requested, but no backend OpenAI Vector Stores client is configured."
    };
  }

  const ingested = ingestSourceDocument({
    filename: input.filename?.trim() || "owner-business.md",
    mimeType: input.mimeType?.trim() || inferMimeType(input.filename?.trim() || "owner-business.md"),
    content: input.content
  });
  if (!ingested.ok) {
    return {
      status: "blocked",
      query,
      matches: [],
      note: "RAG search was skipped because the source document was rejected."
    };
  }

  let handle: Awaited<ReturnType<OpenAiVectorStoreClient["createKnowledgeBase"]>> | null = null;
  try {
    handle = await options.knowledgeClient.createKnowledgeBase({
      name: `FlowAI Studio ${Date.now()}`,
      sourceDocuments: [ingested.document]
    });
    const result = await searchKnowledgeWithRetry({
      client: options.knowledgeClient,
      vectorStoreId: handle.vectorStoreId,
      query,
      delayMs: options.knowledgeSearchRetryDelayMs ?? 2500,
      attempts: 6
    });
    if (result.matches.length === 0) {
      return {
        status: "blocked",
        query,
        matches: [],
        note: "RAG search completed, but OpenAI returned no source matches for this query."
      };
    }
    return {
      status: "ready",
      query,
      matches: result.matches.slice(0, 5).map((match) => ({
        text: safeExcerpt(redactSecrets(match.text), 700),
        score: match.score,
        sourceRefId: match.sourceRefId,
        fileId: match.fileId
      })),
      note: "Temporary OpenAI vector store was created, searched, and scheduled for cleanup in this request."
    };
  } catch (error) {
    return {
      status: "blocked",
      query,
      matches: [],
      note: `RAG search failed safely: ${safeExcerpt(redactSecrets(error instanceof Error ? error.message : "unknown"), 220)}`
    };
  } finally {
    if (handle) {
      await options.knowledgeClient.deleteKnowledgeBase(handle);
    }
  }
}

async function searchKnowledgeWithRetry({
  client,
  vectorStoreId,
  query,
  attempts,
  delayMs
}: {
  client: OpenAiVectorStoreClient;
  vectorStoreId: string;
  query: string;
  attempts: number;
  delayMs: number;
}): Promise<Awaited<ReturnType<OpenAiVectorStoreClient["searchKnowledgeBase"]>>> {
  let last: Awaited<ReturnType<OpenAiVectorStoreClient["searchKnowledgeBase"]>> = { matches: [] };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await client.searchKnowledgeBase({ vectorStoreId, query });
    if (last.matches.length > 0) return last;
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return last;
}

function disabledKnowledgeSearchPanel(): KnowledgeSearchPanel {
  return {
    status: "not_enabled",
    query: "What should the chatbot know about this business?",
    matches: [],
    note: "RAG search is available only when explicitly enabled from the local backend."
  };
}

function buildOwnerChecklist({
  sourceAccepted,
  sourceRefCount,
  businessUnderstandingReady,
  catalogReviewStatus,
  workflowValid,
  runtimeTurnCount,
  telegramMessageCount,
  exportReady,
  ragStatus
}: {
  sourceAccepted: boolean;
  sourceRefCount: number;
  businessUnderstandingReady: boolean;
  catalogReviewStatus: OwnerFirstPreview["productCatalog"]["reviewStatus"];
  workflowValid: boolean;
  runtimeTurnCount: number;
  telegramMessageCount: number;
  exportReady: boolean;
  ragStatus: KnowledgeSearchPanel["status"];
}): OwnerChecklistItem[] {
  return [
    checklistItem("source_document", "Source document accepted", sourceAccepted ? "done" : "blocked", sourceAccepted ? "Text/markdown source is accepted." : "Source needs safe text or markdown."),
    checklistItem("source_refs", "SourceRefs created", sourceRefCount > 0 ? "done" : "blocked", `${sourceRefCount} sourceRef(s) available.`),
    checklistItem("business_understanding", "Business brain drafted", businessUnderstandingReady ? "done" : "blocked", "BusinessUnderstanding draft is reviewable."),
    checklistItem("catalog_review", "Catalog review", catalogReviewStatus === "blocked" ? "blocked" : "review", "Catalog facts require owner review before recommendations or price claims."),
    checklistItem("workflow_generation", "Workflow generated", workflowValid ? "done" : "blocked", workflowValid ? "Workflow JSON validates." : "Workflow needs missing information."),
    checklistItem("runtime_test", "Runtime test conversation", runtimeTurnCount > 0 ? "done" : "blocked", `${runtimeTurnCount} runtime transcript turn(s).`),
    checklistItem("telegram_preview", "Telegram mock preview", telegramMessageCount > 0 ? "done" : "blocked", "Mock only; no live bot token."),
    checklistItem("export_package", "Export package", exportReady ? "done" : "blocked", "Copy-ready JSON/mapping is available."),
    checklistItem("rag_search", "RAG knowledge search", ragStatus === "ready" ? "done" : ragStatus === "not_enabled" ? "not_enabled" : "blocked", ragStatus === "ready" ? "SourceRef-backed knowledge search returned evidence." : "Enable backend RAG search to test OpenAI Vector Stores."),
    checklistItem("ocr_pdf", "OCR/PDF ingestion", "blocked", "Needs approved OCR/parser dependency spike."),
    checklistItem("website_crawling", "Website crawling", "blocked", "Current website mode accepts pasted website text only; crawler spike is separate.")
  ];
}

function checklistItem(
  id: OwnerChecklistItem["id"],
  label: string,
  status: OwnerChecklistItem["status"],
  note: string
): OwnerChecklistItem {
  return { id, label, status, note };
}

function emptyChannelPreview(): ChannelPreviewWorkspace {
  return {
    channels: [],
    runtimeTrace: []
  };
}

function defaultSafetyNotes(): string[] {
  return [
    "Live AI review is backend-only and explicit when enabled.",
    "OpenAI RAG search is temporary per request when enabled; production retention and tenant isolation are not implemented.",
    "Workflow JSON remains strict JSON and validator-backed.",
    "Telegram output is a mock preview, not a production bot.",
    "Upload, OCR/PDF parsing, crawling, persistence, and live WhatsApp remain deferred."
  ];
}
