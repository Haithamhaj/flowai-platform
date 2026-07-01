import {
  createOpenAiResponsesProvider,
  loadOpenAiProviderConfig,
  orchestrateAiBuilderTurn
} from "../../packages/ai-builder-orchestrator/dist/index.js";

const source = {
  filename: "noor-clinic.md",
  mimeType: "text/markdown",
  content: [
    "# Noor Clinic",
    "Category: clinic",
    "Goal: book appointments and answer common questions.",
    "",
    "## Services",
    "- Dental checkup: Routine dental examination.",
    "- Teeth whitening: Cosmetic whitening consultation.",
    "",
    "## Required fields",
    "- name",
    "- phone",
    "- preferred date",
    "",
    "## FAQs",
    "Q: Do you provide medical diagnosis in chat?",
    "A: No. Medical questions should be routed to clinic staff."
  ].join("\n")
};

const config = loadOpenAiProviderConfig({
  allowLocalConfig: true,
  workspaceRoot: process.cwd()
});

console.log("FlowAI Live AI Extraction Smoke");
console.log("===============================");
console.log(
  JSON.stringify(
    {
      provider: config.diagnostics,
      source: {
        filename: source.filename,
        mimeType: source.mimeType
      }
    },
    null,
    2
  )
);

if (!config.configured) {
  console.log("Provider is not configured. Deterministic fallback remains available.");
  process.exit(0);
}

const result = await orchestrateAiBuilderTurn({
  mode: "live_provider",
  source,
  provider: createOpenAiResponsesProvider({
    apiKey: config.apiKey,
    model: config.model
  })
});

console.log(
  JSON.stringify(
    {
      mode: result.mode,
      providerDiagnostics: result.providerDiagnostics,
      businessUnderstanding: {
        businessName: result.businessUnderstanding.businessName,
        category: result.businessUnderstanding.category,
        summary: result.businessUnderstanding.summary,
        missingQuestions: result.businessUnderstanding.missingQuestions.map((question) => ({
          id: question.id,
          category: question.category,
          blocksWorkflow: question.blocksWorkflow
        }))
      },
      productCatalog: {
        reviewStatus: result.productCatalog.reviewStatus,
        itemCount: result.productCatalog.items.length,
        blockers: result.safetyFindings.map((finding) => finding.id)
      },
      workflowPlan: result.workflowPlan
    },
    null,
    2
  )
);
