import { describe, expect, test } from "vitest";
import {
  analyzeFlowAiDemo,
  createStudioFixtures,
  type AiExtractionProvider
} from "../src/demo-pipeline.js";

describe("FlowAI Studio demo pipeline", () => {
  test("runs deterministic clinic source through workflow, runtime, and Telegram preview", async () => {
    const fixtures = createStudioFixtures();

    const result = await analyzeFlowAiDemo({
      sourceText: fixtures.clinic.sourceText,
      mode: "deterministic",
      useCaseHint: "clinic"
    });

    expect(result.sourceDocument.status).toBe("extracted");
    expect(result.deterministicFacts.businessName).toBe("BrightCare Clinic");
    expect(result.aiFacts).toBeNull();
    expect(result.businessUnderstanding.businessName).toBe("BrightCare Clinic");
    expect(result.workflow).toBeTruthy();
    expect(result.validation.valid).toBe(true);
    expect(result.runtimeTranscript.length).toBeGreaterThan(1);
    expect(result.telegramPreview.messages.length).toBeGreaterThan(0);
    expect(result.aiStatus.enabled).toBe(false);
  });

  test("keeps unsupported ecommerce blocked instead of inventing recommendations", async () => {
    const fixtures = createStudioFixtures();

    const result = await analyzeFlowAiDemo({
      sourceText: fixtures.ecommerce.sourceText,
      mode: "deterministic",
      useCaseHint: "ecommerce"
    });

    expect(result.workflow).toBeNull();
    expect(result.workflowPlan.selectedTemplate).toBeNull();
    expect(result.warnings).toContain("ProductCatalog is required before product recommendations, pricing, or availability workflows can be generated.");
    expect(result.businessUnderstanding.missingQuestions.some((question) => question.question.includes("ProductCatalog"))).toBe(true);
  });

  test("uses a mocked AI provider to enrich facts without exposing the API key", async () => {
    const fixtures = createStudioFixtures();
    const provider: AiExtractionProvider = async () => ({
      businessName: "AI BrightCare Clinic",
      category: "clinic",
      summary: "AI structured clinic summary.",
      services: [
        {
          id: "service_ai_consult",
          name: "AI Consultation",
          description: "AI-extracted appointment service.",
          sourceRefs: ["demo-source#document"],
          confidence: 0.88
        }
      ],
      faqs: [],
      policies: [],
      forms: [],
      scenarios: ["booking"],
      missingQuestions: ["What insurance providers are accepted?"],
      warnings: [],
      confidence: 0.86
    });

    const result = await analyzeFlowAiDemo({
      sourceText: fixtures.clinic.sourceText,
      mode: "ai_assisted",
      useCaseHint: "clinic",
      aiProvider: provider,
      env: { OPENAI_API_KEY: "unit-test-api-key" }
    });

    expect(result.aiFacts?.businessName).toBe("AI BrightCare Clinic");
    expect(result.businessUnderstanding.businessName).toBe("AI BrightCare Clinic");
    expect(JSON.stringify(result)).not.toContain("unit-test-api-key");
  });

  test("falls back to deterministic facts when AI output is malformed", async () => {
    const fixtures = createStudioFixtures();
    const provider: AiExtractionProvider = async () => ({ businessName: 42 });

    const result = await analyzeFlowAiDemo({
      sourceText: fixtures.service_lead.sourceText,
      mode: "ai_assisted",
      useCaseHint: "service_lead",
      aiProvider: provider,
      env: { OPENAI_API_KEY: "unit-test-api-key" }
    });

    expect(result.aiFacts).toBeNull();
    expect(result.businessUnderstanding.businessName).toBe("Northstar Home Services");
    expect(result.warnings).toContain("AI extraction returned invalid structured JSON and deterministic extraction was used instead.");
  });
});
