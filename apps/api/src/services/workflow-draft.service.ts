import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
  generateWorkflowDraft,
  type TargetChannelHint,
  type WorkflowGenerationMode,
  type WorkflowGenerationPlan,
  type WorkflowGenerationReport,
  type WorkflowGeneratorInput,
  type WorkflowTemplateHint
} from "@flowai/workflow-generator";
import type { WorkflowDefinition, WorkflowTestCase } from "@flowai/workflow-dsl";

interface WorkflowDraftRequest {
  businessUnderstanding?: unknown;
  templateHint?: unknown;
  targetChannel?: unknown;
  generationMode?: unknown;
  strict?: unknown;
  [key: string]: unknown;
}

export interface RuntimePreviewHint {
  canStartRuntimeTest: boolean;
  reason: string;
}

export interface WorkflowDraftResponse {
  workflow: WorkflowDefinition | null;
  generationPlan: WorkflowGenerationPlan;
  generationReport: WorkflowGenerationReport;
  tests: WorkflowTestCase[];
  runtimePreviewHint: RuntimePreviewHint;
}

const allowedTargetChannels = new Set(["channel_agnostic", "telegram_preview", "web_preview"]);
const providerOrSecretKeyPattern = /openai|gemini|provider|api[_-]?key|token|secret|password|authorization|database/i;
const secretLikeValuePatterns = [
  /\b(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?[^"'\s,;]+/i,
  /\bbearer\s+[a-z0-9._~+/=-]+/i,
  /\bsk-[a-z0-9][a-z0-9_-]{8,}\b/i
];

@Injectable()
export class WorkflowDraftService {
  createDraft(body: unknown): WorkflowDraftResponse {
    const request = this.readRequest(body);

    try {
      const result = generateWorkflowDraft(this.toGeneratorInput(request));
      const workflow = result.workflow ?? null;

      return {
        workflow,
        generationPlan: result.generationPlan,
        generationReport: result.generationReport,
        tests: result.tests,
        runtimePreviewHint: buildRuntimePreviewHint(workflow, result.generationReport)
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throwApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "WORKFLOW_DRAFT_GENERATION_FAILED",
        "Workflow draft generation failed."
      );
    }
  }

  private readRequest(body: unknown): WorkflowDraftRequest {
    if (!isRecord(body)) {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Workflow draft request body must be an object.");
    }

    if (!Object.prototype.hasOwnProperty.call(body, "businessUnderstanding")) {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "businessUnderstanding is required.");
    }

    if (body.templateHint !== undefined && typeof body.templateHint !== "string") {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "templateHint must be a string when provided.");
    }

    if (body.targetChannel !== undefined) {
      if (typeof body.targetChannel !== "string") {
        throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "targetChannel must be a string when provided.");
      }
      if (!allowedTargetChannels.has(body.targetChannel)) {
        throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "targetChannel must be channel_agnostic, telegram_preview, or web_preview.");
      }
    }

    if (body.generationMode !== undefined && typeof body.generationMode !== "string") {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "generationMode must be a string when provided.");
    }

    if (body.strict !== undefined && typeof body.strict !== "boolean") {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "strict must be a boolean when provided.");
    }

    if (containsSecretLikeRequestValue(body)) {
      throwApiError(
        HttpStatus.BAD_REQUEST,
        "INVALID_REQUEST",
        "Provider configuration and secrets are not accepted by this endpoint."
      );
    }

    return body;
  }

  private toGeneratorInput(request: WorkflowDraftRequest): WorkflowGeneratorInput {
    return {
      businessUnderstanding: request.businessUnderstanding as WorkflowGeneratorInput["businessUnderstanding"],
      ...(request.templateHint !== undefined ? { templateHint: request.templateHint as WorkflowTemplateHint } : {}),
      ...(request.targetChannel !== undefined ? { targetChannel: request.targetChannel as TargetChannelHint } : {}),
      generationMode: (request.generationMode ?? "deterministic_v0") as WorkflowGenerationMode,
      strict: typeof request.strict === "boolean" ? request.strict : true
    };
  }
}

function buildRuntimePreviewHint(workflow: WorkflowDefinition | null, report: WorkflowGenerationReport): RuntimePreviewHint {
  const validationIssues = report.validation.issues;
  const blockingQuestions = report.missingQuestionsBlockingPublish.filter((question) => question.blocksWorkflow);

  if (!workflow) {
    return {
      canStartRuntimeTest: false,
      reason: reasonForBlockedGeneration(validationIssues)
    };
  }

  if (!report.validation.valid) {
    return {
      canStartRuntimeTest: false,
      reason: "Workflow validation failed."
    };
  }

  if (blockingQuestions.length > 0) {
    return {
      canStartRuntimeTest: false,
      reason: "Workflow draft has unresolved publish blockers."
    };
  }

  return {
    canStartRuntimeTest: true,
    reason: "Workflow draft is valid and can be sent to /runtime/test/start."
  };
}

function reasonForBlockedGeneration(issues: WorkflowGenerationReport["validation"]["issues"]): string {
  const firstIssue = issues[0];

  if (firstIssue?.path?.startsWith("unsupported_")) {
    return "Unsupported template hint.";
  }

  if (firstIssue) {
    return "Workflow generation was blocked by missing required business facts.";
  }

  return "Workflow generation was blocked.";
}

function containsSecretLikeRequestValue(value: unknown): boolean {
  if (typeof value === "string") {
    return secretLikeValuePatterns.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikeRequestValue(item));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(([key, nested]) => {
    if (providerOrSecretKeyPattern.test(key)) {
      return true;
    }
    return containsSecretLikeRequestValue(nested);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function throwApiError(status: HttpStatus, code: string, message: string): never {
  throw new HttpException(
    {
      error: {
        code,
        message
      }
    },
    status
  );
}
