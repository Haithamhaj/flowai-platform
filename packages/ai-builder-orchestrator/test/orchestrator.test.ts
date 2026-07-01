import { describe, expect, test } from "vitest";
import {
  createMockAiBuilderProvider,
  loadPromptPack,
  orchestrateAiBuilderTurn,
  validateProductCatalogDraft
} from "../src/index.js";

const clinicMarkdown = [
  "# Bright Dental Clinic",
  "Category: clinic",
  "Goal: book appointments and answer common questions.",
  "",
  "## Services",
  "- Dental checkup: Routine dental examination.",
  "",
  "## Required fields",
  "- name",
  "- phone"
].join("\n");

describe("AI builder orchestrator", () => {
  test("returns deterministic fallback when AI is disabled", async () => {
    const result = await orchestrateAiBuilderTurn({
      mode: "disabled",
      source: {
        filename: "clinic.md",
        mimeType: "text/markdown",
        content: clinicMarkdown
      }
    });

    expect(result.mode).toBe("deterministic_fallback");
    expect(result.businessUnderstanding.businessName).toBe("Bright Dental Clinic");
    expect(result.messages[0]?.text).toContain("Bright Dental Clinic");
    expect(result.workflowPlan.selectedTemplate).toBe("clinic_booking");
    expect(result.providerDiagnostics.providerCalled).toBe(false);
  });

  test("accepts structured mocked provider output", async () => {
    const provider = createMockAiBuilderProvider({
      businessUnderstandingPatch: {
        summary: "A clinic that books dental appointments and routes medical questions to staff.",
        missingQuestions: [
          {
            id: "handoff_rule",
            question: "When should medical questions transfer to a human?",
            reason: "Medical advice is unsafe without staff review.",
            blocksWorkflow: true,
            category: "handoff"
          }
        ]
      },
      productCatalogDraft: {
        catalogId: "catalog_bright_dental",
        language: "en",
        items: [],
        unknowns: [],
        conflicts: [],
        sourceRefs: ["source_ref_1"],
        reviewStatus: "review_required"
      }
    });

    const result = await orchestrateAiBuilderTurn({
      mode: "mocked_provider",
      provider,
      source: {
        filename: "clinic.md",
        mimeType: "text/markdown",
        content: clinicMarkdown
      }
    });

    expect(result.mode).toBe("mocked_provider");
    expect(result.providerDiagnostics.providerCalled).toBe(true);
    expect(result.businessUnderstanding.summary).toContain("books dental appointments");
    expect(result.businessUnderstanding.missingQuestions.map((question) => question.id)).toContain("handoff_rule");
    expect(result.productCatalog.reviewStatus).toBe("review_required");
  });

  test("falls back safely when provider output is malformed", async () => {
    const provider = createMockAiBuilderProvider({
      rawOutput: {
        businessUnderstandingPatch: {
          summary: 42
        },
        productCatalogDraft: {
          catalogId: "bad",
          items: "not an array"
        }
      }
    });

    const result = await orchestrateAiBuilderTurn({
      mode: "mocked_provider",
      provider,
      source: {
        filename: "clinic.md",
        mimeType: "text/markdown",
        content: clinicMarkdown
      }
    });

    expect(result.mode).toBe("deterministic_fallback");
    expect(result.providerDiagnostics.fallbackReason).toContain("invalid_provider_output");
    expect(result.businessUnderstanding.businessName).toBe("Bright Dental Clinic");
  });

  test("blocks product price claims without source evidence", () => {
    const validation = validateProductCatalogDraft({
      catalogId: "catalog_service",
      language: "en",
      items: [
        {
          id: "item_cleaning",
          name: "Office cleaning",
          type: "service",
          category: "Cleaning",
          description: "Recurring office cleaning.",
          price: "Starts at 500 SAR",
          availability: null,
          eligibility: null,
          questionsToAsk: [],
          sourceRefs: [],
          confidence: 0.7,
          conflictStatus: "none"
        }
      ],
      unknowns: [],
      conflicts: [],
      sourceRefs: [],
      reviewStatus: "review_required"
    });

    expect(validation.valid).toBe(false);
    expect(validation.blockers.map((blocker) => blocker.id)).toContain("product_claim_missing_source_refs");
  });

  test("prompt pack forbids executable workflow code and secret output", () => {
    const prompts = loadPromptPack();
    const joined = Object.values(prompts).join("\n");

    expect(joined).toContain("strict JSON");
    expect(joined).toContain("sourceRefs");
    expect(joined).toContain("Do not output secrets");
    expect(joined).toContain("Do not generate JavaScript");
    expect(joined).not.toContain("new Function");
    expect(joined).not.toContain("eval(");
  });

  test("redacts secret-like provider text from orchestrator output", async () => {
    const provider = createMockAiBuilderProvider({
      businessUnderstandingPatch: {
        summary: "Use key sk-test-secret-value to connect."
      }
    });

    const result = await orchestrateAiBuilderTurn({
      mode: "mocked_provider",
      provider,
      source: {
        filename: "clinic.md",
        mimeType: "text/markdown",
        content: clinicMarkdown
      }
    });

    expect(JSON.stringify(result)).not.toContain("sk-test-secret-value");
    expect(result.safetyFindings.map((finding) => finding.id)).toContain("secret_like_text_redacted");
  });
});
