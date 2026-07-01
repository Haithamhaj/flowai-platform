import { readFileSync } from "node:fs";
import { join } from "node:path";
import { redactSecrets, safeExcerpt } from "@flowai/business-understanding";
import type {
  AiBuilderProvider,
  AiBuilderProviderRequest,
  OpenAiProviderConfigResult,
  OpenAiProviderDiagnostics
} from "./types.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.5";

export interface OpenAiResponsesProviderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export interface LoadOpenAiProviderConfigOptions {
  env?: Record<string, string | undefined>;
  allowLocalConfig: boolean;
  localConfig?: Record<string, unknown>;
  workspaceRoot?: string;
}

export function loadOpenAiProviderConfig(options: LoadOpenAiProviderConfigOptions): OpenAiProviderConfigResult {
  const env = options.env ?? process.env;
  const envKey = stringOrNull(env.OPENAI_API_KEY);
  const envModel = stringOrNull(env.OPENAI_MODEL);

  if (envKey) {
    const model = envModel ?? DEFAULT_MODEL;
    return {
      configured: true,
      apiKey: envKey,
      model,
      diagnostics: diagnostics(true, "env", model)
    };
  }

  if (!options.allowLocalConfig) {
    return {
      configured: false,
      diagnostics: diagnostics(false, "none", null)
    };
  }

  const localConfig = options.localConfig ?? readLocalConfig(options.workspaceRoot ?? process.cwd());
  const localKey = stringOrNull(localConfig?.OPENAI_API_KEY);
  const localModel = stringOrNull(localConfig?.OPENAI_MODEL) ?? readRoutingModel(localConfig, "business_extraction") ?? DEFAULT_MODEL;

  if (!localKey) {
    return {
      configured: false,
      diagnostics: diagnostics(false, "none", null)
    };
  }

  return {
    configured: true,
    apiKey: localKey,
    model: localModel,
    diagnostics: diagnostics(true, "local_config", localModel)
  };
}

export function createOpenAiResponsesProvider(options: OpenAiResponsesProviderOptions): AiBuilderProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model ?? DEFAULT_MODEL;

  return {
    async generateBusinessUnderstanding(input: AiBuilderProviderRequest): Promise<unknown> {
      const response = await fetchImpl(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(buildResponsesBody(input, model))
      });

      if (!response.ok) {
        throw new Error(`openai_response_error:${response.status}`);
      }

      const payload = await response.json();
      const text = extractOutputText(payload);
      if (!text) {
        throw new Error("openai_response_error:missing_output_text");
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("openai_response_error:invalid_json");
      }
    }
  };
}

function buildResponsesBody(input: AiBuilderProviderRequest, model: string): Record<string, unknown> {
  return {
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              input.promptPack.system,
              input.promptPack.businessExtraction,
              input.promptPack.productCatalog,
              "Return only strict JSON matching the provided schema.",
              "Do not generate WorkflowDefinition JSON.",
              "Do not output secrets, executable code, JavaScript conditions, eval, or new Function.",
              "Every factual service, FAQ, product, policy, price, availability, eligibility, or recommendation-like claim needs sourceRefs."
            ].join("\n\n")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              source: {
                filename: input.source.filename,
                mimeType: input.source.mimeType,
                content: safeExcerpt(redactSecrets(input.source.content), 12000)
              },
              deterministicBusinessUnderstanding: input.deterministicBusinessUnderstanding
            })
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "flowai_business_understanding_refinement",
        strict: true,
        schema: providerOutputSchema()
      }
    }
  };
}

function providerOutputSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["businessUnderstandingPatch", "productCatalogDraft"],
    properties: {
      businessUnderstandingPatch: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["summary", "missingQuestions"],
        properties: {
          summary: { type: ["string", "null"] },
          missingQuestions: {
            type: ["array", "null"],
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "question", "reason", "blocksWorkflow", "category"],
              properties: {
                id: { type: "string" },
                question: { type: "string" },
                reason: { type: "string" },
                blocksWorkflow: { type: "boolean" },
                category: {
                  type: "string",
                  enum: [
                    "bot_goal",
                    "services",
                    "required_fields",
                    "handoff",
                    "policies",
                    "source_restrictions",
                    "language",
                    "channel",
                    "refusal_rules",
                    "business_identity"
                  ]
                }
              }
            }
          }
        }
      },
      productCatalogDraft: {
        type: ["object", "null"],
        additionalProperties: false,
        required: ["catalogId", "language", "items", "unknowns", "conflicts", "sourceRefs", "reviewStatus"],
        properties: {
          catalogId: { type: "string" },
          language: { type: "string", enum: ["ar", "en", "auto"] },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "id",
                "name",
                "type",
                "category",
                "description",
                "price",
                "availability",
                "eligibility",
                "questionsToAsk",
                "sourceRefs",
                "confidence",
                "conflictStatus"
              ],
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                type: { type: "string", enum: ["product", "service", "package"] },
                category: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                price: { type: ["string", "null"] },
                availability: { type: ["string", "null"] },
                eligibility: { type: ["string", "null"] },
                questionsToAsk: { type: "array", items: { type: "string" } },
                sourceRefs: { type: "array", items: { type: "string" } },
                confidence: { type: "number" },
                conflictStatus: { type: "string", enum: ["none", "conflicted", "missing_source"] }
              }
            }
          },
          unknowns: { type: "array", items: { type: "string" } },
          conflicts: { type: "array", items: { type: "string" } },
          sourceRefs: { type: "array", items: { type: "string" } },
          reviewStatus: { type: "string", enum: ["draft", "review_required", "blocked"] }
        }
      }
    }
  };
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  const output = record.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") return text;
    }
  }

  return null;
}

function readLocalConfig(workspaceRoot: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(join(workspaceRoot, ".flowai.local.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readRoutingModel(config: Record<string, unknown> | null, route: string): string | null {
  const routing = config?.OPENAI_MODEL_ROUTING;
  if (!routing || typeof routing !== "object") return null;
  const routeConfig = (routing as Record<string, unknown>)[route];
  if (!routeConfig || typeof routeConfig !== "object") return null;
  return stringOrNull((routeConfig as Record<string, unknown>).model);
}

function diagnostics(
  configured: boolean,
  source: OpenAiProviderDiagnostics["source"],
  model: string | null
): OpenAiProviderDiagnostics {
  return {
    configured,
    source,
    model
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
