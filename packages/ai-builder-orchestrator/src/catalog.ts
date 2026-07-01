import type { ProductCatalogDraft, ProductCatalogValidationBlocker, ProductCatalogValidationResult } from "./types.js";

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
