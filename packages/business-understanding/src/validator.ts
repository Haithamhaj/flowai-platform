import { containsSecretLikeValue } from "./redaction.js";
import type { BusinessInterviewInput, BusinessUnderstanding, ValidationIssue, ValidationResult } from "./types.js";

const WORKFLOW_ONLY_KEYS = new Set(["workflowId", "nodes", "edges"]);
const PROVIDER_KEYS = /openai|gemini|provider|api[_-]?key|token|secret|password|authorization/i;

export function validateBusinessInterviewInput(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return { valid: false, issues: [{ path: "$", message: "Input must be an object." }] };
  }

  if (typeof input.businessDescription !== "string" || input.businessDescription.trim().length === 0) {
    issues.push({ path: "businessDescription", message: "businessDescription must be a non-empty string." });
  }

  if (
    input.preferredLanguage !== undefined &&
    input.preferredLanguage !== "ar" &&
    input.preferredLanguage !== "en" &&
    input.preferredLanguage !== "auto"
  ) {
    issues.push({ path: "preferredLanguage", message: "preferredLanguage must be ar, en, or auto." });
  }

  if (input.knownServices !== undefined) {
    if (!Array.isArray(input.knownServices)) {
      issues.push({ path: "knownServices", message: "knownServices must be an array when present." });
    } else {
      input.knownServices.forEach((service, index) => {
        const name = typeof service === "string" ? service : isRecord(service) ? service.name : undefined;
        if (typeof name !== "string" || name.trim().length === 0) {
          issues.push({ path: `knownServices.${index}`, message: "knownServices cannot contain empty service names." });
        }
      });
    }
  }

  if (input.knownFaqs !== undefined) {
    if (!Array.isArray(input.knownFaqs)) {
      issues.push({ path: "knownFaqs", message: "knownFaqs must be an array when present." });
    } else {
      input.knownFaqs.forEach((faq, index) => {
        if (!isRecord(faq) || typeof faq.question !== "string" || faq.question.trim().length === 0) {
          issues.push({ path: `knownFaqs.${index}.question`, message: "FAQ question must be a non-empty string." });
        }
        if (!isRecord(faq) || typeof faq.answer !== "string" || faq.answer.trim().length === 0) {
          issues.push({ path: `knownFaqs.${index}.answer`, message: "FAQ answer must be a non-empty string." });
        }
      });
    }
  }

  if (containsSecretLikeValue(input)) {
    issues.push({ path: "$", message: "Input contains obvious secret-like values and should be redacted before storage." });
  }

  findForbiddenProviderKeys(input, "$", issues);

  return { valid: issues.length === 0, issues };
}

export function validateBusinessUnderstanding(understanding: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(understanding)) {
    return { valid: false, issues: [{ path: "$", message: "BusinessUnderstanding must be an object." }] };
  }

  for (const key of [
    "id",
    "summary",
    "createdAt",
    "sources",
    "services",
    "faqs",
    "policies",
    "forms",
    "scenarios",
    "missingQuestions",
    "assumptions",
    "unknowns",
    "conflicts",
    "confidence"
  ]) {
    if (!(key in understanding)) {
      issues.push({ path: key, message: `${key} is required.` });
    }
  }

  if (!isConfidence(understanding.confidence)) {
    issues.push({ path: "confidence", message: "confidence must be between 0 and 1." });
  }

  if (!Array.isArray(understanding.sources)) {
    issues.push({ path: "sources", message: "sources must be an array." });
  }

  const sourceIds = new Set<string>();
  if (Array.isArray(understanding.sources)) {
    understanding.sources.forEach((source, index) => {
      if (!isRecord(source) || typeof source.sourceId !== "string" || source.sourceId.trim().length === 0) {
        issues.push({ path: `sources.${index}.sourceId`, message: "sourceId is required." });
        return;
      }
      sourceIds.add(source.sourceId);
      if (source.confidence !== undefined && !isConfidence(source.confidence)) {
        issues.push({ path: `sources.${index}.confidence`, message: "source confidence must be between 0 and 1." });
      }
    });
  }

  for (const collection of ["services", "faqs", "policies", "forms", "scenarios"] as const) {
    validateFactCollection(understanding[collection], collection, sourceIds, issues);
  }

  validateAssumptions(understanding.assumptions, sourceIds, issues);
  findWorkflowKeys(understanding, "$", issues);
  findForbiddenProviderKeys(understanding, "$", issues);

  if (containsSecretLikeValue(understanding)) {
    issues.push({ path: "$", message: "BusinessUnderstanding contains obvious secret-like values." });
  }

  return { valid: issues.length === 0, issues };
}

function validateFactCollection(value: unknown, path: string, sourceIds: Set<string>, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ path, message: `${path} must be an array.` });
    return;
  }

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push({ path: `${path}.${index}`, message: "Extracted fact must be an object." });
      return;
    }
    if (!isConfidence(item.confidence)) {
      issues.push({ path: `${path}.${index}.confidence`, message: "fact confidence must be between 0 and 1." });
    }
    validateSourceRefs(item.sourceRefs, `${path}.${index}.sourceRefs`, sourceIds, issues);
  });
}

function validateAssumptions(value: unknown, sourceIds: Set<string>, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ path: "assumptions", message: "assumptions must be an array." });
    return;
  }

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push({ path: `assumptions.${index}`, message: "Assumption must be an object." });
      return;
    }
    if (!isConfidence(item.confidence)) {
      issues.push({ path: `assumptions.${index}.confidence`, message: "assumption confidence must be between 0 and 1." });
    }
    validateSourceRefs(item.sourceRefs, `assumptions.${index}.sourceRefs`, sourceIds, issues);
  });
}

function validateSourceRefs(value: unknown, path: string, sourceIds: Set<string>, issues: ValidationIssue[]) {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "sourceRefs must be an array." });
    return;
  }

  value.forEach((sourceRef, index) => {
    if (typeof sourceRef !== "string" || !sourceIds.has(sourceRef)) {
      issues.push({ path: `${path}.${index}`, message: "sourceRef must reference an existing source id." });
    }
  });
}

function findWorkflowKeys(value: unknown, path: string, issues: ValidationIssue[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findWorkflowKeys(item, `${path}.${index}`, issues));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (WORKFLOW_ONLY_KEYS.has(key)) {
      issues.push({ path: `${path}.${key}`, message: `${key} belongs to Workflow JSON and is not allowed here.` });
    }
    findWorkflowKeys(nested, `${path}.${key}`, issues);
  }
}

function findForbiddenProviderKeys(value: unknown, path: string, issues: ValidationIssue[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenProviderKeys(item, `${path}.${index}`, issues));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (PROVIDER_KEYS.test(key)) {
      issues.push({ path: `${path}.${key}`, message: "Provider configuration and secrets are not allowed in TASK-005A data." });
    }
    findForbiddenProviderKeys(nested, `${path}.${key}`, issues);
  }
}

function isConfidence(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function assertValidBusinessInterviewInput(input: BusinessInterviewInput): ValidationResult {
  return validateBusinessInterviewInput(input);
}
