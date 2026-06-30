import type { BusinessUnderstanding, MissingQuestion } from "@flowai/business-understanding";
import type { ValidationResult } from "@flowai/workflow-dsl";
import type { PlanIssue, WorkflowGenerationPlan, WorkflowGenerationReport, WorkflowSourceCoverage } from "./types.js";

export function buildGenerationReport(options: {
  understanding: BusinessUnderstanding;
  plan: WorkflowGenerationPlan;
  validation: ValidationResult;
  warnings?: PlanIssue[];
  capabilitiesUsed?: string[];
}): WorkflowGenerationReport {
  const warnings = [...options.plan.warnings, ...(options.warnings ?? [])];

  return {
    businessUnderstandingId: options.understanding.id,
    templateUsed: options.plan.selectedTemplate,
    capabilitiesUsed: options.capabilitiesUsed ?? options.plan.selectedCapabilities,
    assumptions: options.plan.assumptions,
    warnings,
    missingQuestionsBlockingPublish: options.understanding.missingQuestions.filter((question) => question.blocksWorkflow),
    sourceCoverage: buildSourceCoverage(options.understanding),
    validation: options.validation
  };
}

export function buildInvalidInputGenerationReport(options: {
  plan: WorkflowGenerationPlan;
  validation: ValidationResult;
}): WorkflowGenerationReport {
  return {
    businessUnderstandingId: options.plan.businessUnderstandingId,
    templateUsed: null,
    capabilitiesUsed: [],
    assumptions: [],
    warnings: options.plan.warnings,
    missingQuestionsBlockingPublish: options.plan.missingBlockers.map(missingQuestionFromIssue),
    sourceCoverage: {},
    validation: options.validation
  };
}

export function validationFromBlockers(blockers: PlanIssue[]): ValidationResult {
  return {
    valid: false,
    issues: blockers.map((blocker) => ({ path: blocker.id, message: blocker.message }))
  };
}

export function validationFromInputIssues(issues: Array<{ path: string; message: string }>): ValidationResult {
  return { valid: false, issues };
}

function buildSourceCoverage(understanding: BusinessUnderstanding): Record<string, WorkflowSourceCoverage> {
  const coverage: Record<string, WorkflowSourceCoverage> = {};

  for (const source of understanding.sources) {
    coverage[source.sourceId] = {
      sourceRefs: [source.sourceId],
      confidence: source.confidence ?? null
    };
  }

  addFactCoverage(coverage, "service", understanding.services);
  addFactCoverage(coverage, "faq", understanding.faqs);
  addFactCoverage(coverage, "policy", understanding.policies);
  addFactCoverage(coverage, "form", understanding.forms);
  addFactCoverage(coverage, "scenario", understanding.scenarios);

  return coverage;
}

function addFactCoverage(
  coverage: Record<string, WorkflowSourceCoverage>,
  prefix: string,
  facts: Array<{ id: string; sourceRefs: string[]; confidence: number }>
) {
  for (const fact of facts) {
    coverage[`${prefix}:${fact.id}`] = {
      sourceRefs: fact.sourceRefs,
      confidence: fact.confidence
    };
  }
}

export function missingQuestionFromIssue(issue: PlanIssue): MissingQuestion {
  return {
    id: issue.id,
    question: issue.message,
    reason: issue.message,
    blocksWorkflow: issue.severity === "blocking",
    category: "source_restrictions"
  };
}
