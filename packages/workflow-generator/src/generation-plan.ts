import { validateBusinessUnderstanding } from "@flowai/business-understanding";
import type { BusinessUnderstanding, ExtractedField } from "@flowai/business-understanding";
import type {
  PlanIssue,
  PlannedField,
  SafeInputResult,
  SupportedWorkflowTemplate,
  WorkflowGenerationPlan,
  WorkflowGeneratorInput
} from "./types.js";
import { isSupportedTemplate, mapFieldType, unresolvedConflict } from "./types.js";

export function validateGeneratorInput(input: WorkflowGeneratorInput): SafeInputResult {
  const validation = validateBusinessUnderstanding(input.businessUnderstanding);
  if (!validation.valid) {
    return { valid: false, issues: validation.issues };
  }

  if (input.generationMode !== undefined && input.generationMode !== "deterministic_v0") {
    return {
      valid: false,
      issues: [{ path: "generationMode", message: "generationMode must be deterministic_v0." }]
    };
  }

  return { valid: true };
}

export function buildWorkflowGenerationPlan(input: WorkflowGeneratorInput): WorkflowGenerationPlan {
  const businessUnderstanding = input.businessUnderstanding;
  const selectedTemplate = selectTemplate(input);
  const requiredFields = collectRequiredFields(businessUnderstanding);
  const missingBlockers = collectMissingBlockers(input, selectedTemplate, requiredFields);
  const warnings = collectWarnings(input, selectedTemplate);
  const selectedScenarios = businessUnderstanding.scenarios.map((scenario) => scenario.id);
  const assumptions = businessUnderstanding.assumptions.map((assumption) => assumption.text);

  return {
    businessUnderstandingId: businessUnderstanding.id,
    selectedTemplate,
    selectedScenarios,
    selectedCapabilities: selectedTemplate ? capabilitiesForTemplate(selectedTemplate, businessUnderstanding) : [],
    requiredFields,
    knowledgeNeeds: businessUnderstanding.faqs.map((faq) => faq.id),
    handoffNeeds: ["human_handoff"],
    missingBlockers,
    nodePlan: [],
    edgePlan: [],
    assumptions,
    warnings
  };
}

export function blocksDraftGeneration(issue: PlanIssue): boolean {
  if (
    issue.id === "missing_handoff_rules" ||
    issue.id === "missing_refusal_rules" ||
    issue.id === "missing_faq_sources"
  ) {
    return false;
  }

  return issue.severity === "blocking";
}

export function selectTemplate(input: WorkflowGeneratorInput): SupportedWorkflowTemplate | null {
  if (input.templateHint === "faq_support") {
    return null;
  }
  if (isSupportedTemplate(input.templateHint)) {
    return input.templateHint;
  }

  const understanding = input.businessUnderstanding;
  const category = understanding.category?.toLowerCase() ?? "";
  const scenarioNames = understanding.scenarios.map((scenario) => scenario.name.toLowerCase()).join(" ");
  const summary = understanding.summary.toLowerCase();

  if (
    category.includes("clinic") ||
    category.includes("health") ||
    scenarioNames.includes("booking") ||
    scenarioNames.includes("appointment") ||
    summary.includes("appointment")
  ) {
    return "clinic_booking";
  }

  if (understanding.services.length > 0) {
    return "service_lead";
  }

  return null;
}

function collectRequiredFields(understanding: BusinessUnderstanding): PlannedField[] {
  const fields = new Map<string, PlannedField>();

  for (const form of understanding.forms) {
    for (const field of form.fields) {
      addField(fields, field, form.sourceRefs, form.confidence);
    }
  }

  for (const service of understanding.services) {
    for (const field of service.requiredFields) {
      addField(fields, { key: normalizeId(field), label: field, type: inferFieldType(field), required: true }, service.sourceRefs, service.confidence);
    }
  }

  return [...fields.values()];
}

function addField(fields: Map<string, PlannedField>, field: ExtractedField, sourceRefs: string[], confidence: number) {
  const key = normalizeId(field.key || field.label);
  if (!key || fields.has(key)) return;

  fields.set(key, {
    key,
    label: field.label,
    type: mapFieldType(field),
    required: field.required,
    sourceRefs,
    confidence
  });
}

function collectMissingBlockers(
  input: WorkflowGeneratorInput,
  selectedTemplate: SupportedWorkflowTemplate | null,
  requiredFields: PlannedField[]
): PlanIssue[] {
  const understanding = input.businessUnderstanding;
  const blockers: PlanIssue[] = understanding.missingQuestions
    .filter((question) => question.blocksWorkflow)
    .map((question) => ({
      id: question.id,
      message: question.reason,
      severity: "blocking" as const
    }));

  for (const conflict of understanding.conflicts.filter(unresolvedConflict)) {
    blockers.push({
      id: conflict.id,
      message: `Unresolved conflict on ${conflict.field}: ${conflict.claims.join(" / ")}`,
      severity: "blocking"
    });
  }

  if (!selectedTemplate) {
    blockers.push({
      id: input.templateHint === "faq_support" ? "unsupported_faq_support_template" : "unsupported_template",
      message:
        input.templateHint === "faq_support"
          ? "FAQ support generation is deferred until deterministic exact-answer routing is implemented safely."
          : "No supported deterministic workflow template could be selected.",
      severity: "blocking"
    });
  }

  if (selectedTemplate === "clinic_booking" && requiredFields.length === 0) {
    blockers.push({
      id: "missing_booking_fields",
      message: "Clinic booking requires source-backed required customer fields.",
      severity: "blocking"
    });
  }

  if (selectedTemplate === "service_lead" && input.businessUnderstanding.services.length === 0) {
    blockers.push({
      id: "missing_services",
      message: "Service lead generation requires at least one source-backed service.",
      severity: "blocking"
    });
  }

  if (selectedTemplate === "service_lead" && requiredFields.length === 0) {
    blockers.push({
      id: "missing_lead_fields",
      message: "Service lead generation requires source-backed lead collection fields.",
      severity: "blocking"
    });
  }

  return uniqueIssues(blockers);
}

function collectWarnings(input: WorkflowGeneratorInput, selectedTemplate: SupportedWorkflowTemplate | null): PlanIssue[] {
  const warnings: PlanIssue[] = [];
  const understanding = input.businessUnderstanding;

  for (const unknown of understanding.unknowns) {
    warnings.push({
      id: unknown.id,
      message: unknown.reason,
      severity: unknown.blocksWorkflow ? "blocking" : "warning"
    });
  }

  if (understanding.confidence < 0.6) {
    warnings.push({
      id: "low_business_understanding_confidence",
      message: "BusinessUnderstanding confidence is below the recommended generation threshold.",
      severity: "warning"
    });
  }

  if (input.targetChannel && input.targetChannel !== "channel_agnostic") {
    warnings.push({
      id: "target_channel_metadata_only",
      message: "targetChannel is accepted as a hint only and does not change generated workflow semantics.",
      severity: "warning"
    });
  }

  if (selectedTemplate && !understanding.missingQuestions.some((question) => question.category === "handoff")) {
    warnings.push({
      id: "handoff_destination_unconfirmed",
      message: "No explicit handoff destination is confirmed; generated workflow uses a generic human handoff node.",
      severity: "warning"
    });
  }

  return uniqueIssues(warnings);
}

function capabilitiesForTemplate(template: SupportedWorkflowTemplate, understanding: BusinessUnderstanding): string[] {
  const capabilities = template === "clinic_booking" ? ["book_appointments", "handoff_to_human"] : ["collect_leads", "handoff_to_human"];
  if (understanding.faqs.length > 0) capabilities.push("answer_faq");
  return capabilities;
}

function uniqueIssues(issues: PlanIssue[]): PlanIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
}

function inferFieldType(label: string): ExtractedField["type"] {
  const normalized = label.toLowerCase();
  if (normalized.includes("email")) return "email";
  if (normalized.includes("phone") || normalized.includes("mobile")) return "phone";
  if (normalized.includes("date") || normalized.includes("day")) return "date";
  if (normalized.includes("number") || normalized.includes("count") || normalized.includes("quantity")) return "number";
  return "text";
}

function normalizeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
