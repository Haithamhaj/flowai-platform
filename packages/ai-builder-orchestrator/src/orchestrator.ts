import { containsSecretLikeValue, redactSecrets, safeExcerpt } from "@flowai/business-understanding";
import { ingestSourceDocument } from "@flowai/source-ingestion";
import { buildBusinessUnderstandingFromFacts, extractBusinessFactsDraft } from "@flowai/source-review";
import { generateWorkflowDraft } from "@flowai/workflow-generator";
import { createEmptyProductCatalog, validateProductCatalogDraft } from "./catalog.js";
import { loadPromptPack } from "./prompts.js";
import type {
  AiBuilderOrchestrationResult,
  AiBuilderProviderStructuredOutput,
  AiBuilderSafetyFinding,
  AiBuilderTurnInput,
  BusinessUnderstandingPatch,
  ProductCatalogDraft
} from "./types.js";

export async function orchestrateAiBuilderTurn(input: AiBuilderTurnInput): Promise<AiBuilderOrchestrationResult> {
  const fallback = buildDeterministicFallback(input);

  if (input.mode === "disabled" || !input.provider) {
    return fallback;
  }

  const providerOutput = await input.provider.generateBusinessUnderstanding({
    source: input.source,
    promptPack: loadPromptPack(),
    deterministicBusinessUnderstanding: fallback.businessUnderstanding
  });
  const parsed = parseProviderOutput(providerOutput);

  if (!parsed.valid) {
    return {
      ...fallback,
      providerDiagnostics: {
        providerCalled: true,
        fallbackReason: `invalid_provider_output:${parsed.reason}`
      }
    };
  }

  const safetyFindings: AiBuilderSafetyFinding[] = [...fallback.safetyFindings];
  const businessUnderstanding = applyBusinessUnderstandingPatch(
    fallback.businessUnderstanding,
    parsed.output.businessUnderstandingPatch,
    safetyFindings
  );
  const productCatalog = parsed.output.productCatalogDraft ?? fallback.productCatalog;
  const catalogValidation = validateProductCatalogDraft(productCatalog);

  for (const blocker of catalogValidation.blockers) {
    safetyFindings.push({
      id: blocker.id,
      message: blocker.message
    });
  }

  return {
    ...fallback,
    mode: catalogValidation.valid ? "mocked_provider" : "deterministic_fallback",
    messages: [
      {
        role: "assistant",
        text: `I reviewed ${businessUnderstanding.businessName ?? "the business"} with the mocked AI builder and prepared a structured draft for review.`
      }
    ],
    businessUnderstanding,
    productCatalog,
    providerDiagnostics: {
      providerCalled: true,
      fallbackReason: catalogValidation.valid ? undefined : "product_catalog_claim_missing_source_refs"
    },
    safetyFindings
  };
}

function buildDeterministicFallback(input: AiBuilderTurnInput): AiBuilderOrchestrationResult {
  const ingested = ingestSourceDocument(input.source);

  if (!ingested.ok) {
    return {
      mode: "deterministic_fallback",
      messages: [{ role: "assistant", text: "I could not review this source yet. Paste safe plain text or markdown." }],
      businessUnderstanding: {
        id: "bu_blocked_source",
        businessName: null,
        category: null,
        summary: "Source was rejected before business understanding.",
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
        confidence: 0,
        createdAt: "1970-01-01T00:00:00.000Z"
      },
      productCatalog: createEmptyProductCatalog("auto", []),
      workflowPlan: {
        selectedTemplate: null,
        selectedCapabilities: [],
        blockers: ["Source document was rejected."],
        warnings: ingested.document.errors.map((error) => error.message)
      },
      providerDiagnostics: { providerCalled: false },
      safetyFindings: []
    };
  }

  const facts = extractBusinessFactsDraft(ingested.document);
  const understanding = buildBusinessUnderstandingFromFacts(facts);
  const workflow = generateWorkflowDraft({
    businessUnderstanding: understanding,
    templateHint: understanding.category?.toLowerCase().includes("clinic") ? "clinic_booking" : "service_lead",
    strict: false,
    targetChannel: "telegram_preview"
  });

  return {
    mode: "deterministic_fallback",
    messages: [
      {
        role: "assistant",
        text: `I reviewed ${understanding.businessName ?? "the business"} using deterministic extraction. Mocked AI orchestration can refine this draft for review.`
      }
    ],
    businessUnderstanding: understanding,
    productCatalog: createEmptyProductCatalog(facts.language, facts.sourceRefs.map((ref) => ref.sourceId)),
    workflowPlan: {
      selectedTemplate: workflow.generationPlan.selectedTemplate,
      selectedCapabilities: workflow.generationPlan.selectedCapabilities,
      blockers: workflow.generationPlan.missingBlockers.map((blocker) => blocker.message),
      warnings: workflow.generationPlan.warnings.map((warning) => warning.message)
    },
    providerDiagnostics: { providerCalled: false },
    safetyFindings: []
  };
}

function parseProviderOutput(output: unknown):
  | { valid: true; output: AiBuilderProviderStructuredOutput }
  | { valid: false; reason: string } {
  if (!output || typeof output !== "object") return { valid: false, reason: "not_object" };
  const record = output as Record<string, unknown>;
  const patch = record.businessUnderstandingPatch;
  const catalog = record.productCatalogDraft;

  if (patch !== undefined && !isBusinessUnderstandingPatch(patch)) {
    return { valid: false, reason: "business_understanding_patch" };
  }

  if (catalog !== undefined && !isProductCatalogDraft(catalog)) {
    return { valid: false, reason: "product_catalog_draft" };
  }

  return {
    valid: true,
    output: {
      businessUnderstandingPatch: patch as BusinessUnderstandingPatch | undefined,
      productCatalogDraft: catalog as ProductCatalogDraft | undefined
    }
  };
}

function isBusinessUnderstandingPatch(value: unknown): value is BusinessUnderstandingPatch {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.summary !== undefined && typeof record.summary !== "string") return false;
  if (record.missingQuestions !== undefined && !Array.isArray(record.missingQuestions)) return false;
  return true;
}

function isProductCatalogDraft(value: unknown): value is ProductCatalogDraft {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.catalogId === "string" &&
    typeof record.language === "string" &&
    Array.isArray(record.items) &&
    Array.isArray(record.unknowns) &&
    Array.isArray(record.conflicts) &&
    Array.isArray(record.sourceRefs) &&
    typeof record.reviewStatus === "string"
  );
}

function applyBusinessUnderstandingPatch(
  businessUnderstanding: AiBuilderOrchestrationResult["businessUnderstanding"],
  patch: BusinessUnderstandingPatch | undefined,
  safetyFindings: AiBuilderSafetyFinding[]
): AiBuilderOrchestrationResult["businessUnderstanding"] {
  if (!patch) return businessUnderstanding;

  let summary = businessUnderstanding.summary;
  if (typeof patch.summary === "string") {
    if (containsSecretLikeValue(patch.summary)) {
      safetyFindings.push({
        id: "secret_like_text_redacted",
        message: "Provider text contained a secret-like value and was redacted."
      });
    }
    summary = safeExcerpt(redactSecrets(patch.summary), 600);
  }

  return {
    ...businessUnderstanding,
    summary,
    missingQuestions: patch.missingQuestions ?? businessUnderstanding.missingQuestions
  };
}
