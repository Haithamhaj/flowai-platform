import { describe, expect, test } from "vitest";
import {
  buildProductCatalogDraftFromBusinessUnderstanding,
  planProductInquiryWorkflow,
  validateProductCatalogDraft
} from "../src/index.js";
import type { BusinessUnderstanding } from "@flowai/business-understanding";

const baseUnderstanding: BusinessUnderstanding = {
  id: "bu_store",
  businessName: "Noura Home Store",
  category: "ecommerce",
  summary: "Noura Home Store sells home service packages and products.",
  sources: [
    {
      sourceId: "source_ref_1",
      sourceType: "document",
      label: "catalog.md",
      locator: "lines:1-12",
      confidence: 0.82
    }
  ],
  services: [
    {
      id: "service_sofa_cleaning",
      name: "Sofa cleaning package",
      description: "Deep sofa cleaning package. Price starts at 250 SAR. Availability is by appointment.",
      requiredFields: ["name", "phone"],
      sourceRefs: ["source_ref_1"],
      confidence: 0.78
    },
    {
      id: "service_curtain_install",
      name: "Curtain installation",
      description: "Curtain installation service.",
      requiredFields: ["name", "phone"],
      sourceRefs: ["source_ref_1"],
      confidence: 0.74
    }
  ],
  faqs: [],
  policies: [],
  forms: [],
  scenarios: [],
  missingQuestions: [],
  assumptions: [],
  unknowns: [],
  conflicts: [],
  confidence: 0.82,
  createdAt: "1970-01-01T00:00:00.000Z"
};

describe("product catalog workspace planning", () => {
  test("builds source-backed product catalog draft from business services", () => {
    const catalog = buildProductCatalogDraftFromBusinessUnderstanding(baseUnderstanding, "en");

    expect(catalog.items.map((item) => item.name)).toEqual(["Sofa cleaning package", "Curtain installation"]);
    expect(catalog.items[0]?.sourceRefs).toEqual(["source_ref_1"]);
    expect(catalog.items[0]?.price).toBe("Price mentioned in source; owner review required before use.");
    expect(catalog.items[0]?.availability).toBe("Availability mentioned in source; owner review required before use.");
    expect(catalog.items[1]?.price).toBeNull();
    expect(catalog.unknowns).toContain("Some prices are unknown or not source-backed enough for confident answers.");
    expect(validateProductCatalogDraft(catalog).valid).toBe(true);
  });

  test("blocks product inquiry workflow when catalog has no source-backed items", () => {
    const catalog = buildProductCatalogDraftFromBusinessUnderstanding(
      {
        ...baseUnderstanding,
        services: []
      },
      "en"
    );

    const plan = planProductInquiryWorkflow(catalog);

    expect(plan.status).toBe("blocked");
    expect(plan.blockers).toContain("Product inquiry workflow needs at least one source-backed catalog item.");
    expect(plan.suggestedQuestions).toContain("Which products or services should the bot answer questions about?");
  });

  test("allows product inquiry planning with source-backed catalog items while warning about missing price facts", () => {
    const catalog = buildProductCatalogDraftFromBusinessUnderstanding(baseUnderstanding, "en");
    const plan = planProductInquiryWorkflow(catalog);

    expect(plan.status).toBe("review_required");
    expect(plan.capabilities).toContain("product_inquiry");
    expect(plan.blockers).toEqual([]);
    expect(plan.warnings).toContain("Some catalog items are missing source-backed prices.");
  });
});
