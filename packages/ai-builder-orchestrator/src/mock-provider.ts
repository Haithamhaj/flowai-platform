import type { AiBuilderProvider, AiBuilderProviderStructuredOutput, MockAiBuilderProviderOptions } from "./types.js";

export function createMockAiBuilderProvider(options: MockAiBuilderProviderOptions): AiBuilderProvider {
  return {
    async generateBusinessUnderstanding(): Promise<unknown> {
      if ("rawOutput" in options) return options.rawOutput;
      return {
        businessUnderstandingPatch: options.businessUnderstandingPatch ?? {},
        productCatalogDraft: options.productCatalogDraft
      } satisfies AiBuilderProviderStructuredOutput;
    }
  };
}
