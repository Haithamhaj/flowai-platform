import { containsSecretLikeValue, redactSecrets, safeExcerpt } from "./redaction.js";
import type {
  Assumption,
  BusinessInterviewInput,
  BusinessUnderstanding,
  Conflict,
  ExtractedFAQ,
  ExtractedForm,
  ExtractedPolicy,
  ExtractedScenario,
  ExtractedService,
  KnownServiceInput,
  MissingQuestion,
  SourceRef,
  UnknownFact
} from "./types.js";

const SOURCE_ID = "source_business_interview";
const CREATED_AT = "1970-01-01T00:00:00.000Z";

export function analyzeBusinessInterview(input: BusinessInterviewInput): BusinessUnderstanding {
  const description = input.businessDescription.trim();
  const redactedDescription = redactSecrets(description);
  const source: SourceRef = {
    sourceId: SOURCE_ID,
    sourceType: "business_interview",
    label: "Direct business interview",
    locator: "businessDescription",
    excerpt: safeExcerpt(description),
    confidence: containsSecretLikeValue(description) ? 0.55 : 0.85
  };

  const category = inferCategory(input.businessCategoryHint, description);
  const businessName = detectBusinessName(description);
  const services = buildServices(input, redactedDescription);
  const faqs = buildFaqs(input);
  const policies = buildPolicies(input.constraints ?? []);
  const forms = buildForms(services);
  const scenarios = buildScenarios(input, services);
  const missingQuestions = buildMissingQuestions(input, businessName, services, faqs);
  const assumptions = buildAssumptions(input);
  const unknowns = buildUnknowns(input, businessName, services, faqs);
  const conflicts = buildConflicts(input);
  const confidence = computeConfidence(input, category, services, faqs, missingQuestions, unknowns);
  const summary = buildSummary(businessName, category, redactedDescription);

  if (containsSecretLikeValue(input)) {
    unknowns.push({
      id: "unknown_secret_redaction",
      field: "sensitive_input",
      reason: "Secret-like text was detected and redacted from stored excerpts.",
      blocksWorkflow: false
    });
  }

  return {
    id: `bu_${stableHash(JSON.stringify({ description: redactedDescription, goal: input.targetBotGoal ?? "", category }))}`,
    businessName,
    category,
    summary,
    sources: [source],
    services,
    faqs,
    policies,
    forms,
    scenarios,
    missingQuestions,
    assumptions,
    unknowns,
    conflicts,
    confidence,
    createdAt: CREATED_AT
  };
}

function inferCategory(categoryHint: string | undefined, description: string): string | null {
  const hint = categoryHint?.trim();
  if (hint) {
    return normalizeId(hint);
  }

  const text = description.toLowerCase();
  if (/\b(clinic|doctor|appointment|patient|dental|dentist)\b/.test(text)) {
    return "healthcare_clinic";
  }
  if (/\b(restaurant|menu|reservation|order|dine|cafe)\b/.test(text)) {
    return "restaurant";
  }
  if (/\b(store|ecommerce|product|order|cart|shop)\b/.test(text)) {
    return "ecommerce";
  }
  if (/\b(property|real estate|rent|buy|apartment|villa)\b/.test(text)) {
    return "real_estate";
  }
  if (/\b(delivery|logistics|shipment|courier|warehouse)\b/.test(text)) {
    return "logistics";
  }

  return "unknown";
}

function detectBusinessName(description: string): string | null {
  const patterns = [
    /\bbusiness name\s*[:\-]\s*([A-Za-z0-9 '&.-]{2,80})/i,
    /\bcompany name\s*[:\-]\s*([A-Za-z0-9 '&.-]{2,80})/i,
    /\b(?:called|named)\s+([A-Z][A-Za-z0-9 '&.-]{2,80})/
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      return cleanDetectedName(match[1]);
    }
  }

  return null;
}

function cleanDetectedName(value: string): string {
  return value.split(/[.,;\n]/)[0]?.trim() ?? value.trim();
}

function buildServices(input: BusinessInterviewInput, redactedDescription: string): ExtractedService[] {
  const known = input.knownServices ?? [];
  const services = known.map((service, index) => {
    const serviceInput: KnownServiceInput =
      typeof service === "string" ? { name: service } : { name: service.name, description: service.description, requiredFields: service.requiredFields };
    return {
      id: `service_${normalizeId(serviceInput.name) || index + 1}`,
      name: redactSecrets(serviceInput.name.trim()),
      description: redactSecrets(serviceInput.description?.trim() || serviceInput.name.trim()),
      requiredFields: (serviceInput.requiredFields ?? []).map((field) => normalizeFieldLabel(field)).filter(Boolean),
      sourceRefs: [SOURCE_ID],
      confidence: 0.9,
      notes: "Provided as a known service in the direct interview input."
    };
  });

  if (services.length > 0) {
    return services;
  }

  const extracted = extractServicePhrase(redactedDescription);
  return extracted.map((name, index) => ({
    id: `service_${normalizeId(name) || index + 1}`,
    name,
    description: name,
    requiredFields: [],
    sourceRefs: [SOURCE_ID],
    confidence: 0.55,
    notes: "Conservatively extracted from a simple service phrase in the business description."
  }));
}

function extractServicePhrase(description: string): string[] {
  const match = description.match(/\b(?:offers|provides|specializes in)\s+([^.;\n]{3,140})/i);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(/,|\band\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3)
    .slice(0, 5);
}

function buildFaqs(input: BusinessInterviewInput): ExtractedFAQ[] {
  return (input.knownFaqs ?? []).map((faq, index) => ({
    id: `faq_${index + 1}`,
    question: redactSecrets(faq.question.trim()),
    answer: redactSecrets(faq.answer.trim()),
    sourceRefs: [SOURCE_ID],
    confidence: 0.9,
    notes: "Provided as a known FAQ in the direct interview input."
  }));
}

function buildPolicies(constraints: string[]): ExtractedPolicy[] {
  return constraints
    .map((constraint) => redactSecrets(constraint.trim()))
    .filter(Boolean)
    .map((constraint, index) => ({
      id: `policy_${index + 1}`,
      title: titleFromText(constraint),
      description: constraint,
      sourceRefs: [SOURCE_ID],
      confidence: 0.82,
      notes: "Mapped from a direct interview constraint."
    }));
}

function buildForms(services: ExtractedService[]): ExtractedForm[] {
  const fields = unique(
    services.flatMap((service) => service.requiredFields),
    (field) => field
  );

  if (fields.length === 0) {
    return [];
  }

  return [
    {
      id: "form_customer_request",
      name: "Customer request",
      fields: fields.map((field) => ({
        key: normalizeId(field),
        label: field,
        type: inferFieldType(field),
        required: true
      })),
      sourceRefs: [SOURCE_ID],
      confidence: 0.75,
      notes: "Created from required fields attached to known services."
    }
  ];
}

function buildScenarios(input: BusinessInterviewInput, services: ExtractedService[]): ExtractedScenario[] {
  const goal = input.targetBotGoal?.toLowerCase() ?? "";
  const scenarios: ExtractedScenario[] = [];

  if (/\b(book|booking|appointment|reservation|reserve|schedule)\b/.test(goal)) {
    scenarios.push({
      id: "scenario_booking_or_reservation",
      name: "booking_or_reservation",
      triggerPhrases: ["book", "appointment", "reservation", "schedule"],
      steps: ["Identify requested service.", "Collect required customer fields.", "Confirm handoff or next step."],
      requiredFields: unique(services.flatMap((service) => service.requiredFields), (field) => field),
      handoffRule: "Handoff rule must be confirmed before workflow generation.",
      sourceRefs: [SOURCE_ID],
      confidence: 0.78,
      notes: "Created because the target bot goal mentions booking, appointment, reservation, or scheduling."
    });
  }

  if (/\b(support|question|questions|faq|answer|help)\b/.test(goal)) {
    scenarios.push({
      id: "scenario_answer_common_questions",
      name: "answer_common_questions",
      triggerPhrases: ["question", "faq", "help", "support"],
      steps: ["Match the customer question to approved FAQs or policies.", "Answer only from provided sources.", "Escalate if unsupported."],
      requiredFields: [],
      sourceRefs: [SOURCE_ID],
      confidence: 0.74,
      notes: "Created because the target bot goal mentions answering questions or support."
    });
  }

  if (/\b(lead|sales|qualify|qualification|prospect)\b/.test(goal)) {
    scenarios.push({
      id: "scenario_lead_qualification",
      name: "lead_qualification",
      triggerPhrases: ["sales", "lead", "interested", "quote"],
      steps: ["Understand customer interest.", "Collect qualifying fields.", "Send to a human for follow-up."],
      requiredFields: ["name", "phone"],
      handoffRule: "Lead handoff destination must be clarified before workflow generation.",
      sourceRefs: [SOURCE_ID],
      confidence: 0.72,
      notes: "Created because the target bot goal mentions leads, sales, or qualification."
    });
  }

  return scenarios;
}

function buildMissingQuestions(
  input: BusinessInterviewInput,
  businessName: string | null,
  services: ExtractedService[],
  faqs: ExtractedFAQ[]
): MissingQuestion[] {
  const questions: MissingQuestion[] = [];

  if (!businessName) {
    questions.push({
      id: "missing_business_identity",
      question: "What is the exact business name the bot should represent?",
      reason: "Workflow copy and review need a clear business identity.",
      blocksWorkflow: true,
      category: "business_identity"
    });
  }

  if (!input.targetBotGoal?.trim()) {
    questions.push({
      id: "missing_bot_goal",
      question: "What should the bot accomplish for customers?",
      reason: "Workflow generation needs a clear target outcome before creating scenarios.",
      blocksWorkflow: true,
      category: "bot_goal"
    });
  }

  if (services.length === 0) {
    questions.push({
      id: "missing_services",
      question: "What are the main services or products the bot should understand?",
      reason: "Services/products drive intents, questions, and customer request flows.",
      blocksWorkflow: true,
      category: "services"
    });
  }

  if (services.every((service) => service.requiredFields.length === 0)) {
    questions.push({
      id: "missing_required_fields",
      question: "Which customer fields are required for requests or bookings?",
      reason: "Workflow generation needs required fields before collecting customer information.",
      blocksWorkflow: true,
      category: "required_fields"
    });
  }

  if (faqs.length === 0 && /\b(faq|question|answer|support|help)\b/i.test(input.targetBotGoal ?? "")) {
    questions.push({
      id: "missing_faq_sources",
      question: "Which FAQ answers are approved for the bot to use?",
      reason: "Question answering should use approved source material rather than invented answers.",
      blocksWorkflow: true,
      category: "source_restrictions"
    });
  }

  questions.push(
    {
      id: "missing_handoff_rules",
      question: "When should the bot hand off to a human?",
      reason: "Escalation rules prevent the bot from handling unsupported or sensitive cases.",
      blocksWorkflow: true,
      category: "handoff"
    },
    {
      id: "missing_refusal_rules",
      question: "What should the bot refuse or avoid answering?",
      reason: "Refusal rules keep generated workflows inside business and safety boundaries.",
      blocksWorkflow: true,
      category: "refusal_rules"
    },
    {
      id: "missing_test_channel",
      question: "Which channel should be tested first?",
      reason: "Channel choice affects preview formatting even though business understanding stays channel-neutral.",
      blocksWorkflow: false,
      category: "channel"
    }
  );

  if (!input.preferredLanguage || input.preferredLanguage === "auto") {
    questions.push({
      id: "missing_language_support",
      question: "Which languages should the bot support?",
      reason: "Language support affects copy, examples, and review expectations.",
      blocksWorkflow: false,
      category: "language"
    });
  }

  return questions;
}

function buildAssumptions(input: BusinessInterviewInput): Assumption[] {
  const assumptions: Assumption[] = [
    {
      id: "assumption_wait_for_handoff_rules",
      text: "Workflow generation should wait until handoff rules are clarified.",
      confidence: 0.55,
      sourceRefs: [SOURCE_ID],
      notes: "Handoff rules are commonly needed before a safe customer workflow can be generated."
    },
    {
      id: "assumption_channel_neutral_understanding",
      text: "Business understanding should remain channel-neutral until a preview or deployment task consumes it.",
      confidence: 0.75,
      sourceRefs: [SOURCE_ID],
      notes: "TASK-005A is scoped to business understanding, not Telegram or WhatsApp behavior."
    }
  ];

  if (!input.targetBotGoal?.toLowerCase().includes("telegram")) {
    assumptions.push({
      id: "assumption_telegram_first_preview",
      text: "Telegram preview is the first test channel unless changed.",
      confidence: 0.45,
      sourceRefs: [SOURCE_ID],
      notes: "This follows the current accepted project path, not the interview input itself."
    });
  }

  return assumptions;
}

function buildUnknowns(
  input: BusinessInterviewInput,
  businessName: string | null,
  services: ExtractedService[],
  faqs: ExtractedFAQ[]
): UnknownFact[] {
  const unknowns: UnknownFact[] = [];

  if (!businessName) {
    unknowns.push({
      id: "unknown_business_name",
      field: "businessName",
      reason: "No explicit business name was detected in the direct interview input.",
      blocksWorkflow: true
    });
  }

  if (!input.targetBotGoal?.trim()) {
    unknowns.push({
      id: "unknown_target_bot_goal",
      field: "targetBotGoal",
      reason: "The desired bot outcome was not provided.",
      blocksWorkflow: true
    });
  }

  if (services.length === 0) {
    unknowns.push({
      id: "unknown_services",
      field: "services",
      reason: "No known services were provided or conservatively extracted.",
      blocksWorkflow: true
    });
  }

  if (faqs.length === 0) {
    unknowns.push({
      id: "unknown_faqs",
      field: "faqs",
      reason: "No approved FAQs were provided.",
      blocksWorkflow: false
    });
  }

  return unknowns;
}

function buildConflicts(input: BusinessInterviewInput): Conflict[] {
  const goal = input.targetBotGoal?.toLowerCase() ?? "";
  const constraints = (input.constraints ?? []).join(" ").toLowerCase();

  if (/\b(appointment|appointments|booking|reservation|reservations|schedule)\b/.test(goal) && /\b(no appointments|no booking|no reservations)\b/.test(constraints)) {
    return [
      {
        id: "conflict_booking_goal_vs_constraint",
        field: "targetBotGoal",
        claims: ["Target goal asks for booking/reservation support.", "Constraints say bookings or reservations are not allowed."],
        resolutionStatus: "unresolved"
      }
    ];
  }

  return [];
}

function computeConfidence(
  input: BusinessInterviewInput,
  category: string | null,
  services: ExtractedService[],
  faqs: ExtractedFAQ[],
  missingQuestions: MissingQuestion[],
  unknowns: UnknownFact[]
): number {
  let score = 0.2;
  if (input.targetBotGoal?.trim()) score += 0.18;
  if (services.length > 0) score += 0.2;
  if (category && category !== "unknown") score += 0.16;
  if (faqs.length > 0) score += 0.12;
  if ((input.constraints ?? []).length > 0) score += 0.08;

  score -= Math.min(0.28, missingQuestions.filter((question) => question.blocksWorkflow).length * 0.04);
  score -= Math.min(0.16, unknowns.filter((unknown) => unknown.blocksWorkflow).length * 0.04);

  if (containsSecretLikeValue(input)) {
    score -= 0.05;
  }

  return clampConfidence(score);
}

function buildSummary(businessName: string | null, category: string | null, description: string): string {
  const subject = businessName ?? "Unknown business";
  const categoryText = category && category !== "unknown" ? ` in ${category}` : "";
  return `${subject}${categoryText}: ${safeExcerpt(description, 180)}`;
}

function titleFromText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > 64 ? `${trimmed.slice(0, 61).trimEnd()}...` : trimmed;
}

function normalizeFieldLabel(value: string): string {
  return redactSecrets(value).trim().replace(/\s+/g, " ");
}

function inferFieldType(field: string): "text" | "email" | "phone" | "date" {
  const normalized = field.toLowerCase();
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone") || normalized.includes("mobile")) return "phone";
  if (normalized.includes("date") || normalized.includes("time")) return "date";
  return "text";
}

function normalizeId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stableHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const itemKey = key(item);
    if (!itemKey || seen.has(itemKey)) {
      continue;
    }
    seen.add(itemKey);
    result.push(item);
  }

  return result;
}
