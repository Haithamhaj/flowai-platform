import { createHash } from "node:crypto";
import { redactSecrets, safeExcerpt } from "@flowai/business-understanding";
import type {
  BusinessUnderstanding,
  ExtractedFAQ,
  ExtractedField,
  ExtractedForm,
  ExtractedPolicy,
  ExtractedScenario,
  ExtractedService,
  MissingQuestion,
  SourceRef as BusinessSourceRef,
  UnknownFact
} from "@flowai/business-understanding";
import type { SourceDocument, SourceLocator, SourceRef } from "@flowai/source-ingestion";
import type {
  BoundedSourceExcerpt,
  BusinessFactBlocker,
  BusinessFactsDraft,
  BusinessUnderstandingFromFactsOptions,
  SourceDocumentReview,
  SourceDocumentReviewOptions
} from "./types.js";

export type {
  BoundedSourceExcerpt,
  BusinessFactBlocker,
  BusinessFactsDraft,
  BusinessUnderstandingFromFactsOptions,
  SourceDocumentReview,
  SourceDocumentReviewOptions,
  SourceDocumentReviewStatus
} from "./types.js";

const CREATED_AT = "1970-01-01T00:00:00.000Z";
const DEFAULT_MAX_EXCERPT_CHARS = 320;

export function reviewSourceDocument(document: SourceDocument, options: SourceDocumentReviewOptions = {}): SourceDocumentReview {
  const maxExcerptChars = options.maxExcerptChars ?? DEFAULT_MAX_EXCERPT_CHARS;
  const status = document.status === "extracted" ? "ready_for_review" : "rejected";
  const boundedExcerpts = status === "ready_for_review" ? buildBoundedExcerpts(document, maxExcerptChars) : [];

  return {
    sourceDocumentId: document.id,
    status,
    filename: document.filename,
    summary: {
      lineCount: document.metadata.lineCount,
      headingCount: document.metadata.headingCount,
      warningCodes: document.warnings.map((warning) => warning.code),
      errorCodes: document.errors.map((error) => error.code),
      excerptCount: boundedExcerpts.length
    },
    boundedExcerpts,
    sourceRefs: status === "ready_for_review" ? document.sourceRefs : [],
    warnings: document.warnings,
    errors: document.errors
  };
}

export function extractBusinessFactsDraft(document: SourceDocument): BusinessFactsDraft {
  const businessSourceRefs = mapBusinessSourceRefs(document);
  const documentSourceRefId = businessSourceRefs[0]?.sourceId ?? document.id;

  if (document.status !== "extracted") {
    const blocker: BusinessFactBlocker = {
      id: "source_document_rejected",
      field: "source_document",
      reason: "Source document was rejected before review facts could be extracted.",
      sourceRefs: []
    };
    return emptyFacts(document, businessSourceRefs, [blocker]);
  }

  const lines = document.text.split("\n");
  const sections = parseSections(lines);
  const businessName = detectBusinessName(lines);
  const category = detectCategory(lines, document.text);
  const goal = detectGoal(lines);
  const language = detectLanguage(document.text);
  const fields = extractFields(sections.required_fields ?? [], documentSourceRefId);
  const explicitServices = extractServices(sections.services ?? [], fields, documentSourceRefId);
  const services =
    explicitServices.length > 0
      ? explicitServices
      : extractArabicCatalogServices(document.text, fields, documentSourceRefId);
  const faqs = extractFaqs(sections.faqs ?? [], documentSourceRefId);
  const policies = extractPolicies(sections.policies ?? [], documentSourceRefId);
  const scenarios = extractScenarios({ category, goal, services, fields, sourceRefId: documentSourceRefId });
  const blockers = extractBlockers({ category, goal, sourceRefId: documentSourceRefId });
  const unknowns = blockers.map(blockerToUnknown);
  const forms = fields.length > 0
    ? [
        {
          id: "form_customer_request",
          name: category?.includes("clinic") ? "Appointment request" : "Customer request",
          fields,
          sourceRefs: [documentSourceRefId],
          confidence: 0.78,
          notes: "Deterministically extracted from a Required fields section."
        }
      ]
    : [];
  const summary = buildSummary({ businessName, category, goal, services, faqs, policies });

  return {
    id: `facts_${document.id}`,
    sourceDocumentIds: [document.id],
    sourceRefs: businessSourceRefs,
    businessName,
    category,
    language,
    summary,
    services,
    faqs,
    policies,
    forms,
    scenarios,
    blockers,
    unknowns,
    confidence: computeConfidence({ services, fields, faqs, blockers }),
    documentWarnings: document.warnings
  };
}

export function buildBusinessUnderstandingFromFacts(
  facts: BusinessFactsDraft,
  options: BusinessUnderstandingFromFactsOptions = {}
): BusinessUnderstanding {
  const missingQuestions = buildMissingQuestions(facts);
  const assumptions = facts.documentWarnings.map((warning) => ({
    id: `assumption_${normalizeId(warning.code)}`,
    text: warning.message,
    confidence: 0.45,
    sourceRefs: facts.sourceRefs[0] ? [facts.sourceRefs[0].sourceId] : [],
    notes: "Warning carried from source document ingestion."
  }));

  return {
    id: `bu_${facts.sourceDocumentIds[0] ?? stableId(facts.summary)}`,
    businessName: facts.businessName,
    category: facts.category,
    summary: facts.summary,
    sources: facts.sourceRefs,
    services: facts.services,
    faqs: facts.faqs,
    policies: facts.policies,
    forms: facts.forms as ExtractedForm[],
    scenarios: facts.scenarios,
    missingQuestions,
    assumptions,
    unknowns: facts.unknowns,
    conflicts: [],
    confidence: facts.confidence,
    createdAt: options.createdAt ?? CREATED_AT
  };
}

function buildBoundedExcerpts(document: SourceDocument, maxExcerptChars: number): BoundedSourceExcerpt[] {
  const lineRef = document.sourceRefs.find((ref) => ref.locator.kind === "line_range") ?? document.sourceRefs[0];
  if (!lineRef) return [];

  const firstText = boundedExcerpt(document.text, maxExcerptChars);
  return [
    {
      id: `${document.id}#excerpt_1`,
      sourceDocumentId: document.id,
      sourceRefId: lineRef.id,
      label: `${document.filename} review excerpt`,
      locator: locatorToString(lineRef.locator),
      text: firstText
    }
  ];
}

function boundedExcerpt(text: string, maxExcerptChars: number): string {
  const excerpt = safeExcerpt(redactSecrets(text), maxExcerptChars);
  if (excerpt.length <= maxExcerptChars) return excerpt;
  if (maxExcerptChars <= 3) return excerpt.slice(0, maxExcerptChars);
  return `${excerpt.slice(0, maxExcerptChars - 3).trimEnd()}...`;
}

function mapBusinessSourceRefs(document: SourceDocument): BusinessSourceRef[] {
  const excerptByRef = new Map<string, string>();
  const lines = document.text.split("\n");

  for (const ref of document.sourceRefs) {
    excerptByRef.set(ref.id, excerptForLocator(ref.locator, lines));
  }

  if (document.sourceRefs.length === 0) {
    return [
      {
        sourceId: document.id,
        sourceType: "document",
        label: document.filename,
        confidence: document.status === "extracted" ? 0.75 : 0.2
      }
    ];
  }

  return document.sourceRefs.map((ref) => ({
    sourceId: ref.id,
    sourceType: "document",
    label: ref.label || document.filename,
    locator: locatorToString(ref.locator),
    excerpt: safeExcerpt(redactSecrets(excerptByRef.get(ref.id) ?? ""), 220),
    confidence: document.status === "extracted" ? 0.82 : 0.2
  }));
}

function emptyFacts(document: SourceDocument, sourceRefs: BusinessSourceRef[], blockers: BusinessFactBlocker[]): BusinessFactsDraft {
  return {
    id: `facts_${document.id}`,
    sourceDocumentIds: [document.id],
    sourceRefs,
    businessName: null,
    category: null,
    language: "auto",
    summary: "No review-ready facts were extracted because the source document was rejected.",
    services: [],
    faqs: [],
    policies: [],
    forms: [],
    scenarios: [],
    blockers,
    unknowns: blockers.map(blockerToUnknown),
    confidence: 0.1,
    documentWarnings: document.warnings
  };
}

function parseSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current = "overview";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = /^(?:#{1,6}\s+)?([A-Za-z ]+):?$/.exec(line);
    if (heading?.[1]) {
      const key = normalizeSectionKey(heading[1]);
      if (isKnownSection(key)) {
        current = key;
        sections[current] ??= [];
        continue;
      }
    }

    sections[current] ??= [];
    sections[current].push(line);
  }

  return sections;
}

function normalizeSectionKey(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  if (normalized === "required_field" || normalized === "required_fields" || normalized === "fields") return "required_fields";
  if (normalized === "faq" || normalized === "faqs" || normalized === "questions") return "faqs";
  if (normalized === "policy" || normalized === "policies" || normalized === "constraints") return "policies";
  if (normalized === "service" || normalized === "services") return "services";
  return normalized;
}

function isKnownSection(key: string): key is "overview" | "services" | "required_fields" | "faqs" | "policies" {
  return key === "overview" || key === "services" || key === "required_fields" || key === "faqs" || key === "policies";
}

function detectBusinessName(lines: string[]): string | null {
  for (const line of lines) {
    const trimmed = stripMarkdown(line.trim());
    const explicit = /^(?:business|company)\s+name\s*:\s*(.+)$/i.exec(trimmed);
    if (explicit?.[1]) return cleanText(explicit[1]);
    const heading = /^#\s+(.+)$/.exec(line.trim());
    if (heading?.[1]) return cleanText(heading[1]);
  }
  return null;
}

function detectCategory(lines: string[], text: string): string | null {
  for (const line of lines) {
    const explicit = /^category\s*:\s*(.+)$/i.exec(stripMarkdown(line.trim()));
    if (explicit?.[1]) return normalizeCategory(explicit[1]);
  }

  const normalized = text.toLowerCase();
  if (/\b(clinic|dental|appointment|patient)\b/.test(normalized)) return "clinic";
  if (/\b(service company|cleaning|repair|maintenance|lead)\b/.test(normalized)) return "service_company";
  if (/\b(ecommerce|product|price|shop|store)\b/.test(normalized)) return "ecommerce";
  if (/خدمات|مشاريع|صدقات|حفر\s+آ?بار|الآبار|الذبائح|وقف\s+مصاحف|المصاحف/.test(text)) {
    return "service_company";
  }
  return null;
}

function normalizeCategory(value: string): string {
  const normalized = normalizeId(value);
  if (normalized.includes("service")) return "service_company";
  if (normalized.includes("clinic") || normalized.includes("health")) return "clinic";
  if (normalized.includes("ecommerce") || normalized.includes("shop") || normalized.includes("store")) return "ecommerce";
  return normalized || cleanText(value).toLowerCase();
}

function detectGoal(lines: string[]): string | null {
  for (const line of lines) {
    const explicit = /^goal\s*:\s*(.+)$/i.exec(stripMarkdown(line.trim()));
    if (explicit?.[1]) return cleanText(explicit[1]);
  }
  return null;
}

function detectLanguage(text: string): BusinessFactsDraft["language"] {
  return /[\u0600-\u06ff]/.test(text) ? "ar" : "en";
}

function extractServices(lines: string[], fields: ExtractedField[], sourceRefId: string): ExtractedService[] {
  return lines
    .map((line) => parseBullet(line))
    .filter((line): line is string => Boolean(line))
    .map((line, index) => {
      const [rawName, ...descriptionParts] = line.split(":");
      const name = cleanText(rawName ?? "");
      const description = cleanText(descriptionParts.join(":") || name);
      return {
        id: `service_${normalizeIdOrHash(name, index)}`,
        name: redactSecrets(name),
        description: redactSecrets(description),
        requiredFields: fields.map((field) => field.label),
        sourceRefs: [sourceRefId],
        confidence: 0.78,
        notes: "Deterministically extracted from a Services section."
      };
    });
}

function extractArabicCatalogServices(text: string, fields: ExtractedField[], sourceRefId: string): ExtractedService[] {
  if (!/[\u0600-\u06ff]/.test(text)) return [];

  const normalized = normalizeArabic(text);
  const catalogPatterns = [
    {
      name: "حفر آبار",
      patterns: [/حفر\s+ا?بار/, /الابار/, /ابار/]
    },
    {
      name: "ذبح وتوزيع المواشي",
      patterns: [/ذبح\s+وتوزيع\s+المواشي/, /توزيع\s+المواشي/, /الذبائح/, /ذبائح/]
    },
    {
      name: "وقف مصاحف",
      patterns: [/وقف\s+مصاحف/, /وقف\s+المصاحف/, /المصاحف/]
    }
  ];

  return catalogPatterns
    .filter((catalogItem) => catalogItem.patterns.some((pattern) => pattern.test(normalized)))
    .map((catalogItem, index) => ({
      id: `service_${normalizeIdOrHash(catalogItem.name, index)}`,
      name: redactSecrets(catalogItem.name),
      description: redactSecrets(extractNearbyArabicDescription(text, catalogItem.patterns) ?? catalogItem.name),
      requiredFields: fields.map((field) => field.label),
      sourceRefs: [sourceRefId],
      confidence: 0.68,
      notes: "Deterministically extracted from Arabic website catalog headings or source text; price and availability claims are not inferred."
    }));
}

function extractNearbyArabicDescription(text: string, patterns: RegExp[]): string | null {
  const matchingLine = text
    .split("\n")
    .map((line) => cleanText(stripMarkdown(line)))
    .find((line) => {
      const normalized = normalizeArabic(line);
      return patterns.some((pattern) => pattern.test(normalized));
    });

  if (!matchingLine) return null;
  return matchingLine.replace(/^Page\s+\d+\s*:\s*/i, "").slice(0, 180);
}

function extractFields(lines: string[], sourceRefId: string): ExtractedField[] {
  return lines
    .map((line) => parseBullet(line))
    .filter((line): line is string => Boolean(line))
    .map((line) => cleanText(line))
    .filter(Boolean)
    .map((label) => ({
      key: normalizeIdOrHash(label),
      label: redactSecrets(label),
      type: inferFieldType(label),
      required: true,
      sourceRefs: [sourceRefId]
    }));
}

function extractFaqs(lines: string[], sourceRefId: string): ExtractedFAQ[] {
  const faqs: ExtractedFAQ[] = [];
  let pendingQuestion: string | null = null;

  for (const line of lines) {
    const question = /^Q\s*:\s*(.+)$/i.exec(line);
    if (question?.[1]) {
      pendingQuestion = cleanText(question[1]);
      continue;
    }

    const answer = /^A\s*:\s*(.+)$/i.exec(line);
    if (answer?.[1] && pendingQuestion) {
      faqs.push({
        id: `faq_${faqs.length + 1}`,
        question: redactSecrets(pendingQuestion),
        answer: redactSecrets(cleanText(answer[1])),
        sourceRefs: [sourceRefId],
        confidence: 0.8,
        notes: "Deterministically extracted from adjacent Q:/A: lines."
      });
      pendingQuestion = null;
    }
  }

  return faqs;
}

function extractPolicies(lines: string[], sourceRefId: string): ExtractedPolicy[] {
  return lines
    .map((line) => parseBullet(line))
    .filter((line): line is string => Boolean(line))
    .map((line, index) => {
      const description = redactSecrets(cleanText(line));
      return {
        id: `policy_${index + 1}`,
        title: titleFromText(description),
        description,
        sourceRefs: [sourceRefId],
        confidence: 0.74,
        notes: "Deterministically extracted from a Policies section."
      };
    });
}

function extractScenarios({
  category,
  goal,
  services,
  fields,
  sourceRefId
}: {
  category: string | null;
  goal: string | null;
  services: ExtractedService[];
  fields: ExtractedField[];
  sourceRefId: string;
}): ExtractedScenario[] {
  const goalText = goal?.toLowerCase() ?? "";

  if (category?.includes("clinic") || /\b(book|appointment|schedule)\b/.test(goalText)) {
    return [
      {
        id: "scenario_booking_or_reservation",
        name: "booking_or_reservation",
        triggerPhrases: ["book", "appointment", "schedule"],
        steps: ["Identify requested service.", "Collect required customer fields.", "Hand off to staff."],
        requiredFields: fields.map((field) => field.label),
        handoffRule: "Send appointment requests to staff for follow-up.",
        sourceRefs: [sourceRefId],
        confidence: services.length > 0 && fields.length > 0 ? 0.78 : 0.55,
        notes: "Created from clinic category or booking goal in the source document."
      }
    ];
  }

  if (/\b(lead|quote|request|sales|collect)\b/.test(goalText) || category?.includes("service")) {
    return [
      {
        id: "scenario_lead_qualification",
        name: "lead_qualification",
        triggerPhrases: ["lead", "quote", "service", "interested"],
        steps: ["Identify requested service.", "Collect lead fields.", "Hand off to staff."],
        requiredFields: fields.map((field) => field.label),
        handoffRule: "Send service requests to staff for follow-up.",
        sourceRefs: [sourceRefId],
        confidence: services.length > 0 && fields.length > 0 ? 0.76 : 0.52,
        notes: "Created from service or lead collection goal in the source document."
      }
    ];
  }

  return [];
}

function extractBlockers({ category, goal, sourceRefId }: { category: string | null; goal: string | null; sourceRefId: string }): BusinessFactBlocker[] {
  const text = `${category ?? ""} ${goal ?? ""}`.toLowerCase();
  if (/\b(ecommerce|product|price|recommend)\b/.test(text)) {
    return [
      {
        id: "unsupported_ecommerce_recommendations",
        field: "product_catalog",
        reason: "Product recommendation, price, and availability claims require ProductCatalog evidence and are not implemented in the MVP.",
        sourceRefs: [sourceRefId]
      }
    ];
  }
  return [];
}

function buildMissingQuestions(facts: BusinessFactsDraft): MissingQuestion[] {
  const questions: MissingQuestion[] = [];
  if (!facts.businessName) {
    questions.push({
      id: "missing_business_identity",
      question: "What is the exact business name the bot should represent?",
      reason: "The source document did not expose a clear business name.",
      blocksWorkflow: true,
      category: "business_identity"
    });
  }
  if (facts.services.length === 0 && facts.category !== "ecommerce") {
    questions.push({
      id: "missing_services",
      question: "Which services should the bot understand?",
      reason: "No service facts were extracted from the source document.",
      blocksWorkflow: true,
      category: "services"
    });
  }
  if (facts.forms.length === 0 && facts.category !== "ecommerce") {
    questions.push({
      id: "missing_required_fields",
      question: "Which customer fields are required?",
      reason: "No required customer fields were extracted from the source document.",
      blocksWorkflow: true,
      category: "required_fields"
    });
  }
  return questions;
}

function blockerToUnknown(blocker: BusinessFactBlocker): UnknownFact {
  return {
    id: blocker.id === "unsupported_ecommerce_recommendations" ? "unknown_product_catalog_required" : `unknown_${normalizeId(blocker.id)}`,
    field: blocker.field,
    reason: blocker.reason,
    blocksWorkflow: true
  };
}

function buildSummary({
  businessName,
  category,
  goal,
  services,
  faqs,
  policies
}: {
  businessName: string | null;
  category: string | null;
  goal: string | null;
  services: ExtractedService[];
  faqs: ExtractedFAQ[];
  policies: ExtractedPolicy[];
}): string {
  const name = businessName ?? "The business";
  const serviceText = services.length > 0 ? ` Services: ${services.map((service) => service.name).join(", ")}.` : "";
  const faqText = faqs.length > 0 ? ` ${faqs.length} FAQ answer(s) were found.` : "";
  const policyText = policies.length > 0 ? ` ${policies.length} policy note(s) were found.` : "";
  const goalText = goal ? ` Goal: ${goal}` : "";
  return redactSecrets(`${name}${category ? ` is categorized as ${category}` : ""}.${goalText}${serviceText}${faqText}${policyText}`.trim());
}

function computeConfidence({
  services,
  fields,
  faqs,
  blockers
}: {
  services: ExtractedService[];
  fields: ExtractedField[];
  faqs: ExtractedFAQ[];
  blockers: BusinessFactBlocker[];
}): number {
  if (blockers.length > 0) return 0.5;
  let confidence = 0.55;
  if (services.length > 0) confidence += 0.15;
  if (fields.length > 0) confidence += 0.12;
  if (faqs.length > 0) confidence += 0.08;
  return Math.min(confidence, 0.86);
}

function parseBullet(line: string): string | null {
  const match = /^[-*]\s+(.+)$/.exec(line.trim());
  return match?.[1] ? cleanText(match[1]) : null;
}

function stripMarkdown(value: string): string {
  return value.replace(/^#{1,6}\s+/, "").trim();
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeArabic(value: string): string {
  return value
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferFieldType(label: string): ExtractedField["type"] {
  const normalized = label.toLowerCase();
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone") || normalized.includes("mobile")) return "phone";
  if (normalized.includes("date") || normalized.includes("day")) return "date";
  if (normalized.includes("number") || normalized.includes("count") || normalized.includes("quantity")) return "number";
  return "text";
}

function titleFromText(value: string): string {
  const words = value.split(/\s+/).slice(0, 6).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function locatorToString(locator: SourceLocator): string {
  if (locator.kind === "document") return "document";
  if (locator.kind === "heading") return `heading:${locator.line}:${locator.heading}`;
  return `lines:${locator.startLine}-${locator.endLine}`;
}

function excerptForLocator(locator: SourceLocator, lines: string[]): string {
  if (locator.kind === "line_range") {
    return lines.slice(Math.max(locator.startLine - 1, 0), locator.endLine).join("\n");
  }
  if (locator.kind === "heading") {
    return lines[locator.line - 1] ?? "";
  }
  return lines.slice(0, 8).join("\n");
}

function normalizeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeIdOrHash(value: string, fallbackIndex = 0): string {
  return normalizeId(value) || `value_${stableId(`${value}:${fallbackIndex}`)}`;
}

function stableId(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 12);
}
