import { formatRuntimeOutputForTelegram } from "@flowai/channel-adapters";
import { WorkflowRuntime, type RuntimeOutput, type RuntimeSessionState } from "@flowai/runtime-core";
import { ingestSourceDocument, type SourceDocument } from "@flowai/source-ingestion";
import {
  buildBusinessUnderstandingFromFacts,
  extractBusinessFactsDraft,
  reviewSourceDocument,
  type BusinessFactsDraft
} from "@flowai/source-review";
import { validateWorkflow, type ValidationResult, type WorkflowDefinition } from "@flowai/workflow-dsl";
import { generateWorkflowDraft, type WorkflowGenerationPlan, type WorkflowGenerationReport } from "@flowai/workflow-generator";
import type {
  BusinessUnderstanding,
  ExtractedFAQ,
  ExtractedField,
  ExtractedForm,
  ExtractedPolicy,
  ExtractedScenario,
  ExtractedService,
  MissingQuestion
} from "@flowai/business-understanding";

export type DemoMode = "deterministic" | "ai_assisted";
export type DemoUseCaseHint = "clinic" | "service_lead" | "faq" | "arabic" | "ecommerce" | "custom";

export interface AnalyzeFlowAiDemoRequest {
  sourceText: string;
  mode: DemoMode;
  useCaseHint: DemoUseCaseHint;
  aiProvider?: AiExtractionProvider;
  env?: Record<string, string | undefined>;
}

export interface AiStatus {
  requested: boolean;
  enabled: boolean;
  model: string | null;
  message: string;
}

export interface AiExtractedFacts {
  businessName: string | null;
  category: string | null;
  summary: string | null;
  services: ExtractedService[];
  faqs: ExtractedFAQ[];
  policies: ExtractedPolicy[];
  forms: ExtractedForm[];
  scenarios: string[];
  missingQuestions: string[];
  warnings: string[];
  confidence: number;
}

export type AiExtractionProvider = (input: {
  sourceText: string;
  deterministicFacts: BusinessFactsDraft;
  useCaseHint: DemoUseCaseHint;
  model: string;
  apiKey?: string;
}) => Promise<unknown>;

export interface DemoRuntimeTurn {
  role: "user" | "assistant" | "system";
  text: string;
  nodeId?: string;
}

export interface FlowAiDemoAnalysis {
  sourceDocument: SourceDocument;
  sourceReview: ReturnType<typeof reviewSourceDocument>;
  deterministicFacts: BusinessFactsDraft;
  aiFacts: AiExtractedFacts | null;
  aiStatus: AiStatus;
  businessUnderstanding: BusinessUnderstanding;
  workflowPlan: WorkflowGenerationPlan;
  generationReport: WorkflowGenerationReport;
  workflow: WorkflowDefinition | null;
  validation: ValidationResult;
  runtimeTranscript: DemoRuntimeTurn[];
  runtimeTraceSummary: Array<{ nodeId: string; type: string }>;
  telegramPreview: {
    label: string;
    messages: ReturnType<typeof formatRuntimeOutputForTelegram>;
  };
  warnings: string[];
  limitations: string[];
}

export interface StudioFixture {
  id: DemoUseCaseHint;
  title: string;
  subtitle: string;
  filename: string;
  sourceText: string;
}

const CREATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_AI_MODEL = "gpt-4.1-mini";
const PRODUCT_CATALOG_WARNING = "ProductCatalog is required before product recommendations, pricing, or availability workflows can be generated.";

export function createStudioFixtures(): Record<Exclude<DemoUseCaseHint, "custom">, StudioFixture> {
  return {
    clinic: {
      id: "clinic",
      title: "Clinic Appointment",
      subtitle: "Appointment booking with patient fields and clinic handoff.",
      filename: "brightcare-clinic.md",
      sourceText: `# BrightCare Clinic
Category: clinic
Goal: Help patients book appointments and answer common questions before human handoff.

Services:
- General consultation - Patients can request a doctor appointment.
- Dental checkup - Patients can request a dental appointment.
- Pediatric visit - Parents can request a child appointment.

Required fields:
- full name: text required
- phone: phone required
- preferred date: date required
- service: choice required

FAQs:
Q: What are your hours?
A: Sunday to Thursday, 9 AM to 6 PM.
Q: Do you accept walk-ins?
A: Walk-ins are accepted when capacity is available, but appointments are preferred.

Policies:
- Emergency symptoms should be directed to emergency services or human staff immediately.
- The chatbot should not provide diagnosis or medical advice.`
    },
    service_lead: {
      id: "service_lead",
      title: "Service Lead",
      subtitle: "Lead capture for a home services company.",
      filename: "northstar-home-services.md",
      sourceText: `# Northstar Home Services
Category: service company
Goal: Qualify service leads and collect enough details for a callback.

Services:
- AC repair - Diagnose cooling issues and schedule technician visits.
- Plumbing inspection - Check leaks, pressure, and drainage problems.
- Electrical maintenance - Handle routine maintenance requests.

Required fields:
- customer name: text required
- phone: phone required
- service needed: choice required
- address area: text required

FAQs:
Q: How soon can someone visit?
A: Same-day visits may be available depending on technician capacity.

Policies:
- Urgent safety issues should be escalated to a human dispatcher.`
    },
    faq: {
      id: "faq",
      title: "FAQ Support",
      subtitle: "Source-backed answers with fallback to handoff.",
      filename: "faq-support.md",
      sourceText: `# CarePlus Support Desk
Category: clinic
Goal: Answer common support questions and collect contact details when escalation is needed.

Services:
- Support inquiry - Help customers understand clinic policies and contact support.

Required fields:
- full name: text required
- phone: phone required

FAQs:
Q: Can I reschedule an appointment?
A: Yes, rescheduling is available by contacting support at least 24 hours before the appointment.
Q: Can the chatbot provide medical diagnosis?
A: No. The chatbot can only share clinic information and should hand off medical concerns.

Policies:
- Medical diagnosis is not allowed.
- Escalate urgent symptoms to human staff.`
    },
    arabic: {
      id: "arabic",
      title: "Arabic Clinic",
      subtitle: "Arabic source text with RTL review mode.",
      filename: "arabic-clinic.md",
      sourceText: `# عيادة الشفاء
Category: clinic
Goal: مساعدة المرضى على حجز موعد ومعرفة معلومات العيادة الأساسية.

Services:
- استشارة عامة - حجز موعد مع طبيب عام.
- أسنان - حجز كشف أسنان.

Required fields:
- الاسم الكامل: text required
- رقم الجوال: phone required
- التاريخ المفضل: date required
- نوع الخدمة: choice required

FAQs:
Q: ما هي ساعات العمل؟
A: من الأحد إلى الخميس من 9 صباحا إلى 6 مساء.

Policies:
- لا يقدم الشات بوت تشخيصا طبيا.
- الحالات الطارئة يجب تحويلها إلى موظف أو جهة طوارئ.`
    },
    ecommerce: {
      id: "ecommerce",
      title: "Unsupported Ecommerce",
      subtitle: "Blocked case for product/pricing recommendations without catalog evidence.",
      filename: "unsupported-ecommerce.md",
      sourceText: `# QuickShop
Category: ecommerce
Goal: Recommend products, compare prices, and answer availability questions.

Services:
- Product recommendation - Suggest products to customers.

FAQs:
Q: Can you recommend the cheapest phone?
A: The business wants this, but no ProductCatalog, inventory, price list, or freshness policy is provided.

Policies:
- Do not invent prices or availability.`
    }
  };
}

export async function analyzeFlowAiDemo(request: AnalyzeFlowAiDemoRequest): Promise<FlowAiDemoAnalysis> {
  const env = request.env ?? process.env;
  const filename = filenameForUseCase(request.useCaseHint);
  const ingestion = ingestSourceDocument({
    filename,
    mimeType: "text/markdown",
    content: request.sourceText
  });

  if (!ingestion.ok) {
    throw new Error(`Demo source rejected: ${ingestion.error.message}`);
  }

  const sourceDocument = ingestion.document;
  const sourceReview = reviewSourceDocument(sourceDocument);
  const deterministicFacts = extractBusinessFactsDraft(sourceDocument);
  const aiStatus = buildAiStatus({ mode: request.mode, env });
  const warnings: string[] = [];

  const aiFacts = aiStatus.enabled
    ? await tryExtractAiFacts({ request, deterministicFacts, aiStatus, warnings, env })
    : null;

  const deterministicUnderstanding = buildBusinessUnderstandingFromFacts(deterministicFacts, { createdAt: CREATED_AT });
  const businessUnderstanding = aiFacts
    ? mergeAiFactsIntoBusinessUnderstanding(deterministicUnderstanding, aiFacts)
    : deterministicUnderstanding;

  if (request.useCaseHint === "ecommerce" || businessUnderstanding.category === "ecommerce") {
    businessUnderstanding.missingQuestions = addProductCatalogQuestion(businessUnderstanding.missingQuestions);
    warnings.push(PRODUCT_CATALOG_WARNING);
  }

  const templateHint = templateForUseCase(request.useCaseHint);
  const generation = generateWorkflowDraft({
    businessUnderstanding,
    templateHint,
    targetChannel: "telegram_preview",
    generationMode: "deterministic_v0",
    strict: false
  });
  const workflow = generation.workflow ?? null;
  const validation = workflow ? validateWorkflow(workflow) : generation.generationReport.validation;
  const runtime = workflow ? runRuntimePreview(workflow) : emptyRuntimePreview();
  const telegramOutput = workflow && runtime.lastOutput
    ? formatRuntimeOutputForTelegram({
        output: runtime.lastOutput
      })
    : [];

  return {
    sourceDocument,
    sourceReview,
    deterministicFacts,
    aiFacts,
    aiStatus,
    businessUnderstanding,
    workflowPlan: generation.generationPlan,
    generationReport: generation.generationReport,
    workflow,
    validation,
    runtimeTranscript: runtime.transcript,
    runtimeTraceSummary: runtime.traceSummary,
    telegramPreview: {
      label: "Mock preview only, not production Telegram",
      messages: telegramOutput
    },
    warnings: uniqueStrings([...warnings, ...generation.generationPlan.warnings.map((warning) => warning.message)]),
    limitations: [
      "Local demo only: no persistence, tenants, auth, production routing, live Telegram, WhatsApp, crawling, RAG, PDF, DOCX, OCR, or exporters.",
      "Generated workflows are still deterministic templates validated by FlowAI; AI only enriches BusinessUnderstanding when configured."
    ]
  };
}

function buildAiStatus(input: { mode: DemoMode; env: Record<string, string | undefined> }): AiStatus {
  const requested = input.mode === "ai_assisted";
  const hasKey = Boolean(input.env.OPENAI_API_KEY?.trim());
  const model = input.env.OPENAI_MODEL?.trim() || DEFAULT_AI_MODEL;

  if (!requested) {
    return { requested, enabled: false, model: null, message: "Deterministic mode selected." };
  }

  if (!hasKey) {
    return {
      requested,
      enabled: false,
      model,
      message: "AI mode unavailable: OPENAI_API_KEY not configured. Deterministic extraction is active."
    };
  }

  return { requested, enabled: true, model, message: "AI-assisted extraction enabled through backend-only OpenAI API access." };
}

async function tryExtractAiFacts(input: {
  request: AnalyzeFlowAiDemoRequest;
  deterministicFacts: BusinessFactsDraft;
  aiStatus: AiStatus;
  warnings: string[];
  env: Record<string, string | undefined>;
}): Promise<AiExtractedFacts | null> {
  const provider = input.request.aiProvider ?? openAiExtractionProvider;

  try {
    const raw = await provider({
      sourceText: boundText(input.request.sourceText, 16000),
      deterministicFacts: input.deterministicFacts,
      useCaseHint: input.request.useCaseHint,
      model: input.aiStatus.model ?? DEFAULT_AI_MODEL,
      apiKey: input.env.OPENAI_API_KEY
    });
    const parsed = parseAiExtractedFacts(raw);
    if (!parsed) {
      input.warnings.push("AI extraction returned invalid structured JSON and deterministic extraction was used instead.");
      return null;
    }
    return parsed;
  } catch {
    input.warnings.push("AI extraction failed and deterministic extraction was used instead.");
    return null;
  }
}

async function openAiExtractionProvider(input: {
  sourceText: string;
  deterministicFacts: BusinessFactsDraft;
  useCaseHint: DemoUseCaseHint;
  model: string;
  apiKey?: string;
}): Promise<unknown> {
  if (!input.apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        {
          role: "system",
          content: "You are FlowAI's backend extraction service. Return strict JSON only. Do not include chain-of-thought or prose."
        },
        {
          role: "developer",
          content: buildAiExtractionInstructions(input.useCaseHint)
        },
        {
          role: "user",
          content: JSON.stringify({
            useCaseHint: input.useCaseHint,
            sourceText: input.sourceText,
            deterministicFacts: input.deterministicFacts
          })
        }
      ],
      text: {
        format: {
          type: "json_object"
        }
      },
      max_output_tokens: 2200
    })
  });

  if (!response.ok) throw new Error(`OpenAI extraction failed with status ${response.status}.`);

  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("OpenAI response did not include JSON text.");
  return JSON.parse(text);
}

function buildAiExtractionInstructions(useCaseHint: DemoUseCaseHint): string {
  return [
    "Extract source-backed business facts for FlowAI's BusinessUnderstanding draft.",
    "Output one JSON object with keys: businessName, category, summary, services, faqs, policies, forms, scenarios, missingQuestions, warnings, confidence.",
    "Use null or empty arrays when unsupported. Confidence is 0..1.",
    "Each service/faq/policy/form should include sourceRefs when possible and must not invent prices, availability, diagnosis, policies, or products.",
    "For ecommerce, product recommendation, pricing, or availability without a ProductCatalog must return warnings and missingQuestions instead of recommendations.",
    `Use case hint: ${useCaseHint}.`
  ].join("\n");
}

function parseAiExtractedFacts(value: unknown): AiExtractedFacts | null {
  if (!isRecord(value)) return null;
  const confidence = typeof value.confidence === "number" ? clamp(value.confidence) : 0.5;
  const businessName = nullableString(value.businessName);
  const category = nullableString(value.category);
  const summary = nullableString(value.summary);
  if (businessName === undefined || category === undefined || summary === undefined) return null;

  return {
    businessName,
    category,
    summary,
    services: parseServices(value.services),
    faqs: parseFaqs(value.faqs),
    policies: parsePolicies(value.policies),
    forms: parseForms(value.forms),
    scenarios: parseStringArray(value.scenarios),
    missingQuestions: parseStringArray(value.missingQuestions),
    warnings: parseStringArray(value.warnings),
    confidence
  };
}

function mergeAiFactsIntoBusinessUnderstanding(base: BusinessUnderstanding, ai: AiExtractedFacts): BusinessUnderstanding {
  return {
    ...base,
    businessName: ai.businessName ?? base.businessName,
    category: ai.category ?? base.category,
    summary: ai.summary ?? base.summary,
    services: ai.services.length ? ai.services : base.services,
    faqs: ai.faqs.length ? ai.faqs : base.faqs,
    policies: ai.policies.length ? ai.policies : base.policies,
    forms: ai.forms.length ? ai.forms : base.forms,
    scenarios: ai.scenarios.length ? scenarioNamesToExtractedScenarios(ai.scenarios, base.sources[0]?.sourceId ?? "ai_source") : base.scenarios,
    missingQuestions: [
      ...base.missingQuestions,
      ...ai.missingQuestions.map((question, index): MissingQuestion => ({
        id: `ai_missing_${index + 1}`,
        question,
        reason: "AI extraction identified a missing fact that would improve workflow quality.",
        blocksWorkflow: false,
        category: "source_restrictions"
      }))
    ],
    assumptions: [
      ...base.assumptions,
      {
        id: "ai_assisted_extraction_used",
        text: "AI-assisted extraction enriched deterministic facts, then FlowAI normalized and validated the workflow output.",
        confidence: ai.confidence,
        sourceRefs: base.sources[0] ? [base.sources[0].sourceId] : []
      }
    ],
    confidence: Math.max(base.confidence, ai.confidence)
  };
}

function runRuntimePreview(workflow: WorkflowDefinition): {
  transcript: DemoRuntimeTurn[];
  traceSummary: Array<{ nodeId: string; type: string }>;
  lastOutput: RuntimeOutput | null;
} {
  const runtime = new WorkflowRuntime({
    workflow,
    now: () => new Date(CREATED_AT)
  });
  const transcript: DemoRuntimeTurn[] = [];
  let output = runtime.start("studio_preview_session");
  appendOutput(transcript, output);

  const scriptedInputs = ["Book an appointment", "Haitham", "+966500000000", "2026-07-10", "General consultation"];
  let state: RuntimeSessionState = output.state;

  for (const text of scriptedInputs) {
    if (state.ended) break;
    transcript.push({ role: "user", text, nodeId: state.currentNodeId });
    output = runtime.receive(state, { text });
    state = output.state;
    appendOutput(transcript, output);
  }

  return {
    transcript,
    traceSummary: output.state.trace.slice(-12).map((event) => ({ nodeId: event.nodeId, type: event.type })),
    lastOutput: output
  };
}

function emptyRuntimePreview(): { transcript: DemoRuntimeTurn[]; traceSummary: Array<{ nodeId: string; type: string }>; lastOutput: null } {
  return {
    transcript: [{ role: "system", text: "Workflow was not generated because blockers remain." }],
    traceSummary: [],
    lastOutput: null
  };
}

function appendOutput(transcript: DemoRuntimeTurn[], output: RuntimeOutput): void {
  for (const message of output.messages) {
    if (message.type === "text") {
      const nodeId = output.traceEvents.at(-1)?.nodeId ?? output.state.currentNodeId;
      transcript.push({ role: "assistant", text: message.text, nodeId });
    }
    if (message.type === "choices") {
      transcript.push({
        role: "assistant",
        text: message.choices.map((choice) => choice.label).join(" / "),
        nodeId: output.state.currentNodeId
      });
    }
  }
}

function templateForUseCase(useCase: DemoUseCaseHint): "clinic_booking" | "service_lead" | "faq_support" | "ecommerce_assistant" | undefined {
  if (useCase === "clinic" || useCase === "arabic" || useCase === "faq") return "clinic_booking";
  if (useCase === "service_lead") return "service_lead";
  if (useCase === "ecommerce") return "ecommerce_assistant";
  return undefined;
}

function filenameForUseCase(useCase: DemoUseCaseHint): string {
  const fixture = useCase !== "custom" ? createStudioFixtures()[useCase] : undefined;
  return fixture?.filename ?? "custom-flowai-source.md";
}

function addProductCatalogQuestion(existing: MissingQuestion[]): MissingQuestion[] {
  if (existing.some((question) => question.question.includes("ProductCatalog"))) return existing;
  return [
    ...existing,
    {
      id: "missing_product_catalog",
      question: "Provide a source-backed ProductCatalog with product names, prices, availability, freshness, and recommendation rules.",
      reason: "FlowAI must not generate product recommendations, prices, or availability claims without source-backed catalog evidence.",
      blocksWorkflow: true,
      category: "source_restrictions"
    }
  ];
}

function scenarioNamesToExtractedScenarios(names: string[], sourceRefId: string): ExtractedScenario[] {
  return names.map((name, index) => ({
    id: `ai_scenario_${index + 1}`,
    name,
    triggerPhrases: [name],
    steps: [`Handle ${name} using source-backed business facts.`],
    requiredFields: [],
    sourceRefs: [sourceRefId],
    confidence: 0.7
  }));
}

function parseServices(value: unknown): ExtractedService[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const name = stringValue(item.name);
    if (!name) return [];
    return [{
      id: stringValue(item.id) || `ai_service_${index + 1}`,
      name,
      description: stringValue(item.description) || name,
      requiredFields: parseStringArray(item.requiredFields),
      sourceRefs: parseStringArray(item.sourceRefs),
      confidence: numberValue(item.confidence, 0.65)
    }];
  });
}

function parseFaqs(value: unknown): ExtractedFAQ[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const question = stringValue(item.question);
    const answer = stringValue(item.answer);
    if (!question || !answer) return [];
    return [{ id: `ai_faq_${index + 1}`, question, answer, sourceRefs: parseStringArray(item.sourceRefs), confidence: numberValue(item.confidence, 0.65) }];
  });
}

function parsePolicies(value: unknown): ExtractedPolicy[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const title = stringValue(item.title);
    const description = stringValue(item.description) || stringValue(item.text);
    if (!title || !description) return [];
    return [{ id: `ai_policy_${index + 1}`, title, description, sourceRefs: parseStringArray(item.sourceRefs), confidence: numberValue(item.confidence, 0.65) }];
  });
}

function parseForms(value: unknown): ExtractedForm[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const name = stringValue(item.name) || `AI form ${index + 1}`;
    const fields = parseFields(item.fields);
    if (!fields.length) return [];
    return [{ id: `ai_form_${index + 1}`, name, fields, sourceRefs: parseStringArray(item.sourceRefs), confidence: numberValue(item.confidence, 0.65) }];
  });
}

function parseFields(value: unknown): ExtractedField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const key = stringValue(item.key)?.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
    const label = stringValue(item.label);
    if (!key || !label) return [];
    const rawType = stringValue(item.type);
    const type = rawType && ["text", "number", "email", "phone", "date", "choice", "boolean"].includes(rawType) ? rawType as ExtractedField["type"] : "text";
    return [{ key, label, type, required: item.required === true }];
  });
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  return value.trim() || null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? clamp(value) : fallback;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function boundText(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}
