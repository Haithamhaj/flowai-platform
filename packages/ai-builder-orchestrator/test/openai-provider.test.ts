import { describe, expect, test } from "vitest";
import {
  createOpenAiResponsesProvider,
  loadOpenAiProviderConfig,
  orchestrateAiBuilderTurn
} from "../src/index.js";

const clinicMarkdown = [
  "# Noor Clinic",
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

describe("OpenAI Responses provider boundary", () => {
  test("is disabled unless explicitly configured", () => {
    const config = loadOpenAiProviderConfig({
      env: {},
      allowLocalConfig: false
    });

    expect(config.configured).toBe(false);
    expect(config.diagnostics).toEqual({
      configured: false,
      source: "none",
      model: null
    });
  });

  test("loads local ignored config only when allowed without exposing the key in diagnostics", () => {
    const config = loadOpenAiProviderConfig({
      env: {},
      allowLocalConfig: true,
      localConfig: {
        OPENAI_API_KEY: "sk-test-secret-value",
        OPENAI_MODEL: "gpt-5.5"
      }
    });

    expect(config.configured).toBe(true);
    if (!config.configured) throw new Error("expected configured provider");
    expect(config.apiKey).toBe("sk-test-secret-value");
    expect(config.model).toBe("gpt-5.5");
    expect(JSON.stringify(config.diagnostics)).not.toContain("sk-test-secret-value");
    expect(config.diagnostics).toEqual({
      configured: true,
      source: "local_config",
      model: "gpt-5.5"
    });
  });

  test("calls Responses API with strict JSON schema and returns parsed structured output", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    businessUnderstandingPatch: {
                      summary: "A clinic that books dental appointments with safe handoff rules."
                    }
                  })
                }
              ]
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };
    const provider = createOpenAiResponsesProvider({
      apiKey: "sk-test-secret-value",
      model: "gpt-5.5",
      fetchImpl
    });

    const output = await provider.generateBusinessUnderstanding({
      source: {
        filename: "clinic.md",
        mimeType: "text/markdown",
        content: clinicMarkdown
      },
      promptPack: {
        system: "System prompt",
        builderConversation: "Builder prompt",
        businessExtraction: "Extraction prompt",
        productCatalog: "Catalog prompt",
        workflowPlanning: "Workflow prompt",
        workflowCritic: "Critic prompt",
        integrationMapping: "Integration prompt"
      },
      deterministicBusinessUnderstanding: {
        id: "bu_test",
        businessName: "Noor Clinic",
        category: "clinic",
        summary: "Clinic.",
        sources: [],
        services: [],
        faqs: [],
        policies: [],
        forms: [],
        scenarios: [],
        missingQuestions: [],
        assumptions: [],
        unknowns: [],
        conflicts: [],
        confidence: 0.5,
        createdAt: "1970-01-01T00:00:00.000Z"
      }
    });

    expect(output).toEqual({
      businessUnderstandingPatch: {
        summary: "A clinic that books dental appointments with safe handoff rules."
      }
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/responses");
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.model).toBe("gpt-5.5");
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.strict).toBe(true);
    expect(JSON.stringify(body)).toContain("businessUnderstandingPatch");
    expect(JSON.stringify(output)).not.toContain("sk-test-secret-value");
  });

  test("orchestrator falls back with sanitized diagnostics when live provider fails", async () => {
    const result = await orchestrateAiBuilderTurn({
      mode: "live_provider",
      source: {
        filename: "clinic.md",
        mimeType: "text/markdown",
        content: clinicMarkdown
      },
      provider: {
        async generateBusinessUnderstanding() {
          throw new Error("401 invalid sk-test-secret-value");
        }
      }
    });

    expect(result.mode).toBe("deterministic_fallback");
    expect(result.providerDiagnostics.providerCalled).toBe(true);
    expect(result.providerDiagnostics.fallbackReason).toContain("provider_error");
    expect(JSON.stringify(result)).not.toContain("sk-test-secret-value");
  });
});
