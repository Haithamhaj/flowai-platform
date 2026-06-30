import type { FieldDefinition, VariableType, WorkflowDefinition, WorkflowVariable } from "@flowai/workflow-dsl";
import type { PlannedField, SupportedWorkflowTemplate, TemplateBuildContext } from "../types.js";

export function fieldDefinitionsFromPlan(fields: PlannedField[]): FieldDefinition[] {
  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    prompt: promptForField(field)
  }));
}

export function variableDefinitionsFromPlan(fields: PlannedField[]): WorkflowVariable[] {
  return fields.map((field) => ({
    key: field.key,
    type: field.type,
    required: field.required,
    description: `Collected ${field.label}.`
  }));
}

export function baseWorkflowFields(context: TemplateBuildContext, template: SupportedWorkflowTemplate): Omit<WorkflowDefinition, "nodes" | "edges" | "variables" | "tests"> {
  const { businessUnderstanding, createdAt, updatedAt } = context;
  const businessName = businessUnderstanding.businessName ?? "Unknown business";

  return {
    version: "0.1",
    workflowId: `wf_${normalizeId(businessUnderstanding.id || template)}`,
    name: `${businessName} ${labelForTemplate(template)}`,
    description: businessUnderstanding.summary,
    sourceSummary: {
      businessName,
      businessCategory: businessUnderstanding.category ?? undefined,
      sources: businessUnderstanding.sources.map((source) => `${source.sourceType}:${source.sourceId}`),
      summary: businessUnderstanding.summary
    },
    assumptions: context.plan.assumptions,
    knowledgeSources: [],
    tools: [],
    channels: {},
    publishStatus: "draft",
    createdAt,
    updatedAt
  };
}

function labelForTemplate(template: SupportedWorkflowTemplate): string {
  return template === "clinic_booking" ? "appointment workflow draft" : "lead workflow draft";
}

function promptForField(field: PlannedField): string {
  const label = field.label.toLowerCase();
  if (field.type === "phone") return "What phone number should the team use?";
  if (field.type === "email") return "What email address should the team use?";
  if (field.type === "date") return "What date do you prefer?";
  if (label.includes("name")) return "What is your name?";
  return `Please provide ${field.label}.`;
}

function normalizeId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "workflow";
}

export function variableTypeFromString(value: string): VariableType {
  if (value === "phone" || value === "email" || value === "date" || value === "choice" || value === "number" || value === "boolean" || value === "object") {
    return value;
  }
  return "string";
}
