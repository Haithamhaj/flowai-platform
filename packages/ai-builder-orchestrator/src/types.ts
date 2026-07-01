import type { BusinessUnderstanding, MissingQuestion, PreferredLanguage, SourceRef } from "@flowai/business-understanding";

export type AiBuilderMode = "disabled" | "mocked_provider" | "live_provider";
export type OrchestratorResultMode = "deterministic_fallback" | "mocked_provider" | "live_provider";

export interface AiBuilderSourceInput {
  filename: string;
  mimeType: string;
  content: string;
}

export interface AiBuilderTurnInput {
  mode: AiBuilderMode;
  source: AiBuilderSourceInput;
  provider?: AiBuilderProvider;
}

export interface AiBuilderProvider {
  generateBusinessUnderstanding(input: AiBuilderProviderRequest): Promise<unknown>;
}

export interface AiBuilderProviderRequest {
  source: AiBuilderSourceInput;
  promptPack: PromptPack;
  deterministicBusinessUnderstanding: BusinessUnderstanding;
}

export interface PromptPack {
  system: string;
  builderConversation: string;
  businessExtraction: string;
  productCatalog: string;
  workflowPlanning: string;
  workflowCritic: string;
  integrationMapping: string;
}

export interface BusinessUnderstandingPatch {
  summary?: string;
  missingQuestions?: MissingQuestion[];
}

export interface AiBuilderProviderStructuredOutput {
  businessUnderstandingPatch?: BusinessUnderstandingPatch;
  productCatalogDraft?: ProductCatalogDraft;
}

export type ProductCatalogReviewStatus = "draft" | "review_required" | "blocked";
export type ProductCatalogConflictStatus = "none" | "conflicted" | "missing_source";

export interface ProductCatalogDraft {
  catalogId: string;
  language: PreferredLanguage;
  items: ProductCatalogItemDraft[];
  unknowns: string[];
  conflicts: string[];
  sourceRefs: string[];
  reviewStatus: ProductCatalogReviewStatus;
}

export interface ProductCatalogItemDraft {
  id: string;
  name: string;
  type: "product" | "service" | "package";
  category: string | null;
  description: string | null;
  price: string | null;
  availability: string | null;
  eligibility: string | null;
  questionsToAsk: string[];
  sourceRefs: string[];
  confidence: number;
  conflictStatus: ProductCatalogConflictStatus;
}

export interface ProductCatalogValidationBlocker {
  id: string;
  message: string;
  itemId?: string;
}

export interface ProductCatalogValidationResult {
  valid: boolean;
  blockers: ProductCatalogValidationBlocker[];
}

export interface ProductInquiryWorkflowPlan {
  status: "blocked" | "review_required";
  capabilities: string[];
  blockers: string[];
  warnings: string[];
  suggestedQuestions: string[];
}

export interface AiBuilderMessage {
  role: "assistant" | "system";
  text: string;
}

export interface AiBuilderSafetyFinding {
  id: string;
  message: string;
}

export interface AiBuilderOrchestrationResult {
  mode: OrchestratorResultMode;
  messages: AiBuilderMessage[];
  businessUnderstanding: BusinessUnderstanding;
  productCatalog: ProductCatalogDraft;
  workflowPlan: {
    selectedTemplate: string | null;
    selectedCapabilities: string[];
    blockers: string[];
    warnings: string[];
  };
  providerDiagnostics: {
    providerCalled: boolean;
    fallbackReason?: string;
  };
  safetyFindings: AiBuilderSafetyFinding[];
}

export interface OpenAiProviderDiagnostics {
  configured: boolean;
  source: "env" | "local_config" | "none";
  model: string | null;
}

export type OpenAiProviderConfigResult =
  | {
      configured: false;
      diagnostics: OpenAiProviderDiagnostics;
    }
  | {
      configured: true;
      apiKey: string;
      model: string;
      diagnostics: OpenAiProviderDiagnostics;
    };

export interface MockAiBuilderProviderOptions {
  businessUnderstandingPatch?: BusinessUnderstandingPatch;
  productCatalogDraft?: ProductCatalogDraft;
  rawOutput?: unknown;
}

export interface IntegrationMappingPlan {
  targetSystem: string;
  workflowId: string;
  fieldMappings: Array<{ workflowField: string; targetField: string }>;
  nodeMappings: Array<{ workflowNodeId: string; targetNodeId: string }>;
  handoffMappings: Array<{ workflowNodeId: string; targetQueue: string }>;
  unsupportedBehaviors: string[];
  requiredExternalCapabilities: string[];
  exportWarnings: string[];
}

export type SourceBackedCatalogRef = Pick<SourceRef, "sourceId" | "label" | "locator" | "confidence">;
