import type {
  BusinessUnderstanding,
  Conflict,
  ExtractedField,
  MissingQuestion,
  ValidationIssue
} from "@flowai/business-understanding";
import type { ValidationResult, VariableType, WorkflowDefinition, WorkflowNodeType, WorkflowTestCase } from "@flowai/workflow-dsl";

export type SupportedWorkflowTemplate = "clinic_booking" | "service_lead";
export type PlanningOnlyWorkflowTemplateHint = "ecommerce_assistant" | "restaurant_inquiry";
export type KnownWorkflowTemplateHint = SupportedWorkflowTemplate | "faq_support" | PlanningOnlyWorkflowTemplateHint;
export type WorkflowTemplateHint = KnownWorkflowTemplateHint | (string & {});
export type TargetChannelHint = "channel_agnostic" | "telegram_preview" | "web_preview";
export type WorkflowGenerationMode = "deterministic_v0";

export interface WorkflowGeneratorInput {
  businessUnderstanding: BusinessUnderstanding;
  templateHint?: WorkflowTemplateHint;
  targetChannel?: TargetChannelHint;
  generationMode?: WorkflowGenerationMode;
  strict?: boolean;
}

export interface PlannedField {
  key: string;
  label: string;
  type: VariableType;
  required: boolean;
  sourceRefs: string[];
  confidence: number;
}

export interface PlanIssue {
  id: string;
  message: string;
  sourceRefs?: string[];
  severity: "blocking" | "warning";
}

export interface NodePlanItem {
  id: string;
  type: WorkflowNodeType;
  reason: string;
  sourceRefs: string[];
  confidence: number;
}

export interface EdgePlanItem {
  id: string;
  source: string;
  target: string;
  reason: string;
  condition?: string;
  fallback?: boolean;
}

export interface WorkflowGenerationPlan {
  businessUnderstandingId: string;
  selectedTemplate: SupportedWorkflowTemplate | null;
  selectedScenarios: string[];
  selectedCapabilities: string[];
  requiredFields: PlannedField[];
  knowledgeNeeds: string[];
  handoffNeeds: string[];
  missingBlockers: PlanIssue[];
  nodePlan: NodePlanItem[];
  edgePlan: EdgePlanItem[];
  assumptions: string[];
  warnings: PlanIssue[];
}

export interface WorkflowSourceCoverage {
  sourceRefs: string[];
  confidence: number | null;
}

export interface WorkflowGenerationReport {
  businessUnderstandingId: string;
  templateUsed: SupportedWorkflowTemplate | null;
  capabilitiesUsed: string[];
  assumptions: string[];
  warnings: PlanIssue[];
  missingQuestionsBlockingPublish: MissingQuestion[];
  sourceCoverage: Record<string, WorkflowSourceCoverage>;
  validation: ValidationResult;
}

export interface WorkflowGenerationResult {
  workflow?: WorkflowDefinition;
  generationPlan: WorkflowGenerationPlan;
  generationReport: WorkflowGenerationReport;
  tests: WorkflowTestCase[];
}

export interface TemplateBuildResult {
  workflow: WorkflowDefinition;
  tests: WorkflowTestCase[];
  nodePlan: NodePlanItem[];
  edgePlan: EdgePlanItem[];
  warnings?: PlanIssue[];
}

export interface TemplateBuildContext {
  input: WorkflowGeneratorInput;
  businessUnderstanding: BusinessUnderstanding;
  plan: WorkflowGenerationPlan;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDefinition {
  id: SupportedWorkflowTemplate;
  capabilities: string[];
  build: (context: TemplateBuildContext) => TemplateBuildResult;
}

export interface BlockingInputResult {
  valid: false;
  issues: ValidationIssue[];
}

export type SafeInputResult = { valid: true } | BlockingInputResult;

export function isSupportedTemplateHint(template: WorkflowTemplateHint | undefined): template is SupportedWorkflowTemplate {
  return template === "clinic_booking" || template === "service_lead";
}

export function isPlanningOnlyTemplateHint(template: WorkflowTemplateHint | undefined): template is PlanningOnlyWorkflowTemplateHint {
  return template === "ecommerce_assistant" || template === "restaurant_inquiry";
}

export function isKnownTemplateHint(template: WorkflowTemplateHint | undefined): template is KnownWorkflowTemplateHint {
  return isSupportedTemplateHint(template) || template === "faq_support" || isPlanningOnlyTemplateHint(template);
}

export function isSupportedTemplate(template: WorkflowTemplateHint | undefined): template is SupportedWorkflowTemplate {
  return isSupportedTemplateHint(template);
}

export function mapFieldType(field: ExtractedField): VariableType {
  switch (field.type) {
    case "number":
      return "number";
    case "email":
      return "email";
    case "phone":
      return "phone";
    case "date":
      return "date";
    case "choice":
      return "choice";
    case "boolean":
      return "boolean";
    case "text":
    default:
      return "string";
  }
}

export function unresolvedConflict(conflict: Conflict): boolean {
  return conflict.resolutionStatus === "unresolved";
}
