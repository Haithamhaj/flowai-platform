import { validateWorkflow } from "@flowai/workflow-dsl";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";
import type { TemplateDefinition, WorkflowGenerationResult, WorkflowGeneratorInput } from "./types.js";
import { blocksDraftGeneration, buildInvalidInputGenerationPlan, buildWorkflowGenerationPlan, validateGeneratorInput } from "./generation-plan.js";
import { buildGenerationReport, buildInvalidInputGenerationReport, validationFromBlockers, validationFromInputIssues } from "./report.js";
import { buildClinicBookingTemplate } from "./templates/clinic-booking.js";
import { buildServiceLeadTemplate } from "./templates/service-lead.js";

const CREATED_AT = "1970-01-01T00:00:00.000Z";

const templates: Record<string, TemplateDefinition> = {
  clinic_booking: {
    id: "clinic_booking",
    capabilities: ["book_appointments", "handoff_to_human"],
    build: buildClinicBookingTemplate
  },
  service_lead: {
    id: "service_lead",
    capabilities: ["collect_leads", "handoff_to_human"],
    build: buildServiceLeadTemplate
  }
};

export function generateWorkflowDraft(input: WorkflowGeneratorInput): WorkflowGenerationResult {
  const inputValidation = validateGeneratorInput(input);

  if (!inputValidation.valid) {
    const invalidPlan = buildInvalidInputGenerationPlan(input, inputValidation.issues);
    return {
      generationPlan: invalidPlan,
      generationReport: buildInvalidInputGenerationReport({ plan: invalidPlan, validation: validationFromInputIssues(inputValidation.issues) }),
      tests: []
    };
  }

  const plan = buildWorkflowGenerationPlan(input);

  if (input.strict && plan.missingBlockers.length > 0) {
    return {
      generationPlan: plan,
      generationReport: buildGenerationReport({
        understanding: input.businessUnderstanding,
        plan,
        validation: validationFromBlockers(plan.missingBlockers),
        capabilitiesUsed: []
      }),
      tests: []
    };
  }

  const draftBlockers = plan.missingBlockers.filter(blocksDraftGeneration);

  if (!plan.selectedTemplate || draftBlockers.length > 0) {
    return {
      generationPlan: plan,
      generationReport: buildGenerationReport({
        understanding: input.businessUnderstanding,
        plan,
        validation: validationFromBlockers(draftBlockers.length > 0 ? draftBlockers : plan.missingBlockers),
        capabilitiesUsed: []
      }),
      tests: []
    };
  }

  const template = templates[plan.selectedTemplate];
  if (!template) {
    const blockers = [
      ...plan.missingBlockers,
      { id: "unsupported_template", message: `Template '${plan.selectedTemplate}' is not implemented.`, severity: "blocking" as const }
    ];
    return {
      generationPlan: { ...plan, missingBlockers: blockers },
      generationReport: buildGenerationReport({
        understanding: input.businessUnderstanding,
        plan: { ...plan, missingBlockers: blockers },
        validation: validationFromBlockers(blockers),
        capabilitiesUsed: []
      }),
      tests: []
    };
  }

  const built = template.build({
    input,
    businessUnderstanding: input.businessUnderstanding,
    plan: { ...plan, selectedCapabilities: template.capabilities },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  });
  const validation = validateWorkflow(built.workflow);
  const actualCapabilities = capabilitiesFromGeneratedWorkflow(template.capabilities, built.workflow);
  const generationPlan = {
    ...plan,
    selectedCapabilities: actualCapabilities,
    nodePlan: built.nodePlan,
    edgePlan: built.edgePlan,
    warnings: [...plan.warnings, ...(built.warnings ?? [])]
  };

  return {
    workflow: validation.valid ? built.workflow : undefined,
    generationPlan,
    generationReport: buildGenerationReport({
      understanding: input.businessUnderstanding,
      plan: generationPlan,
      validation,
      capabilitiesUsed: validation.valid ? actualCapabilities : []
    }),
    tests: built.tests
  };
}

function capabilitiesFromGeneratedWorkflow(baseCapabilities: string[], workflow: WorkflowDefinition): string[] {
  const capabilities = new Set(baseCapabilities);

  if (workflow.nodes.some((node) => node.id === "answer_faq" && node.type === "message")) {
    capabilities.add("answer_faq");
  }

  return [...capabilities];
}
