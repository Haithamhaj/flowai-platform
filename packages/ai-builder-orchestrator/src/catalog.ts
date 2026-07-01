import type { BusinessUnderstanding, PreferredLanguage } from "@flowai/business-understanding";
import type {
  ProductCatalogDraft,
  ProductCatalogItemDraft,
  ProductCatalogValidationBlocker,
  ProductCatalogValidationResult,
  ProductInquiryWorkflowPlan
} from "./types.js";

export function createEmptyProductCatalog(language: ProductCatalogDraft["language"], sourceRefs: string[]): ProductCatalogDraft {
  return {
    catalogId: "catalog_empty",
    language,
    items: [],
    unknowns: [],
    conflicts: [],
    sourceRefs,
    reviewStatus: "review_required"
  };
}

export function buildProductCatalogDraftFromBusinessUnderstanding(
  businessUnderstanding: BusinessUnderstanding,
  language: PreferredLanguage = "auto"
): ProductCatalogDraft {
  const items = businessUnderstanding.services.map((service, index): ProductCatalogItemDraft => {
    const description = service.description || service.name;
    const priceMentioned = hasPriceMention(description);
    const availabilityMentioned = hasAvailabilityMention(description);

    return {
      id: `catalog_item_${service.id || index + 1}`,
      name: service.name,
      type: service.name.toLowerCase().includes("package") ? "package" : "service",
      category: businessUnderstanding.category,
      description,
      price: priceMentioned ? "Price mentioned in source; owner review required before use." : null,
      availability: availabilityMentioned ? "Availability mentioned in source; owner review required before use." : null,
      eligibility: null,
      questionsToAsk: buildCatalogQuestions({ priceMentioned, availabilityMentioned }),
      sourceRefs: service.sourceRefs,
      confidence: service.confidence,
      conflictStatus: service.sourceRefs.length > 0 ? "none" : "missing_source"
    };
  });
  const sourceRefs = unique([
    ...businessUnderstanding.sources.map((source) => source.sourceId),
    ...items.flatMap((item) => item.sourceRefs)
  ]);
  const unknowns: string[] = [];
  if (items.length === 0) {
    unknowns.push("No source-backed product or service catalog items were found.");
  }
  if (items.some((item) => !item.price)) {
    unknowns.push("Some prices are unknown or not source-backed enough for confident answers.");
  }
  if (items.some((item) => !item.availability)) {
    unknowns.push("Some availability facts are unknown or not source-backed enough for confident answers.");
  }

  return {
    catalogId: `catalog_${businessUnderstanding.id}`,
    language,
    items,
    unknowns,
    conflicts: businessUnderstanding.conflicts.map((conflict) => conflict.field),
    sourceRefs,
    reviewStatus: items.length > 0 ? "review_required" : "blocked"
  };
}

export function validateProductCatalogDraft(catalog: ProductCatalogDraft): ProductCatalogValidationResult {
  const blockers: ProductCatalogValidationBlocker[] = [];

  for (const item of catalog.items) {
    const hasClaimNeedingEvidence = Boolean(item.price || item.availability || item.eligibility);
    if (hasClaimNeedingEvidence && item.sourceRefs.length === 0) {
      blockers.push({
        id: "product_claim_missing_source_refs",
        message: `Product catalog item '${item.name}' has price, availability, or eligibility claims without sourceRefs.`,
        itemId: item.id
      });
    }
  }

  return {
    valid: blockers.length === 0,
    blockers
  };
}

export function planProductInquiryWorkflow(catalog: ProductCatalogDraft): ProductInquiryWorkflowPlan {
  const sourceBackedItems = catalog.items.filter((item) => item.sourceRefs.length > 0 && item.conflictStatus !== "missing_source");

  if (sourceBackedItems.length === 0) {
    return {
      status: "blocked",
      capabilities: [],
      blockers: ["Product inquiry workflow needs at least one source-backed catalog item."],
      warnings: [],
      suggestedQuestions: [
        "Which products or services should the bot answer questions about?",
        "Do you have source text for prices or availability, or should the bot avoid those claims?"
      ]
    };
  }

  const warnings: string[] = [];
  if (sourceBackedItems.some((item) => !item.price)) {
    warnings.push("Some catalog items are missing source-backed prices.");
  }
  if (sourceBackedItems.some((item) => !item.availability)) {
    warnings.push("Some catalog items are missing source-backed availability.");
  }

  return {
    status: "review_required",
    capabilities: ["product_inquiry"],
    blockers: [],
    warnings,
    suggestedQuestions: [
      "Should the bot mention prices only when the source explicitly states them?",
      "When price or availability is unknown, should the bot ask for handoff?"
    ]
  };
}

function hasPriceMention(text: string): boolean {
  return /\b(price|priced|cost|fee|sar|usd|aed|starts at|from)\b|[$€£ر]\s*\d|\d+\s*(?:sar|usd|aed|ريال)/i.test(text);
}

function hasAvailabilityMention(text: string): boolean {
  return /\b(available|availability|in stock|out of stock|stock|appointment|by appointment|preorder|unavailable)\b/i.test(text);
}

function buildCatalogQuestions({
  priceMentioned,
  availabilityMentioned
}: {
  priceMentioned: boolean;
  availabilityMentioned: boolean;
}): string[] {
  const questions: string[] = [];
  if (!priceMentioned) questions.push("Is there a source-backed price the bot is allowed to mention?");
  if (!availabilityMentioned) questions.push("Is availability known, or should the bot avoid availability claims?");
  return questions;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}
