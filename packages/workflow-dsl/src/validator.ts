import type {
  WorkflowNodeType
} from "./types.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const allowedNodeTypes = new Set<WorkflowNodeType>([
  "start",
  "message",
  "question",
  "field_collection",
  "condition",
  "ai_response",
  "rag_answer",
  "action",
  "webhook",
  "handoff",
  "end"
]);

const secretLikeKeys = ["token", "secret", "apiKey", "api_key", "password", "authorization", "bearer"];
const allowedVariableTypes = new Set(["string", "number", "boolean", "date", "email", "phone", "choice", "object"]);
const allowedPublishStatuses = new Set(["draft", "validated", "published", "archived"]);
const allowedKnowledgeSourceTypes = new Set(["website", "document", "manual", "collection"]);
const allowedToolTypes = new Set(["webhook", "crm", "calendar", "internal"]);
const allowedConditionInputs = new Set(["text", "choice", "intent"]);
const binaryConditionOperators = new Set(["equals", "not_equals", "contains", "gt", "gte", "lt", "lte"]);

export function validateWorkflow(workflow: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(workflow)) {
    return invalid([{ path: "workflow", message: "workflow must be an object." }]);
  }

  validateRequiredString(workflow, "version", issues);
  validateRequiredString(workflow, "workflowId", issues);
  validateRequiredString(workflow, "name", issues);
  validateRequiredString(workflow, "description", issues);
  validateStringArray(workflow.assumptions, "assumptions", issues);
  validateIsoDateString(workflow.createdAt, "createdAt", issues);
  validateIsoDateString(workflow.updatedAt, "updatedAt", issues);

  if (typeof workflow.publishStatus !== "string" || !allowedPublishStatuses.has(workflow.publishStatus)) {
    issues.push({ path: "publishStatus", message: "publishStatus must be draft, validated, published, or archived." });
  }

  validateSourceSummary(workflow.sourceSummary, issues);

  const nodes = readArray(workflow.nodes, "nodes", issues);
  const edges = readArray(workflow.edges, "edges", issues);
  const variables = readArray(workflow.variables, "variables", issues);
  const knowledgeSources = readArray(workflow.knowledgeSources, "knowledgeSources", issues);
  const tools = readArray(workflow.tools, "tools", issues);
  const tests = readArray(workflow.tests, "tests", issues);

  if (!isRecord(workflow.channels)) {
    issues.push({ path: "channels", message: "channels must be an object." });
  }

  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const variableKeys = validateVariables(variables, issues);
  const knowledgeSourceIds = validateKnowledgeSources(knowledgeSources, issues);
  const toolIds = validateTools(tools, issues);

  nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!isRecord(node)) {
      issues.push({ path, message: "node must be an object." });
      return;
    }

    const nodeId = readRequiredString(node, "id", `${path}.id`, issues);
    if (nodeId) {
      if (nodeIds.has(nodeId)) issues.push({ path: `${path}.id`, message: `duplicate node id '${nodeId}'.` });
      nodeIds.add(nodeId);
    }

    validateRequiredString(node, "name", issues, path);

    if (typeof node.type !== "string" || !allowedNodeTypes.has(node.type as WorkflowNodeType)) {
      issues.push({ path: `${path}.type`, message: `unknown node type '${String(node.type)}'.` });
      return;
    }

    validateNode(node, path, variableKeys, knowledgeSourceIds, toolIds, issues);
  });

  const startNodes = nodes.filter((node) => isRecord(node) && node.type === "start");
  if (startNodes.length !== 1) {
    issues.push({ path: "nodes", message: `workflow must have exactly one start node; found ${startNodes.length}.` });
  }

  const terminalNodes = nodes.filter((node) => isRecord(node) && (node.type === "end" || node.type === "handoff"));
  if (terminalNodes.length < 1) {
    issues.push({ path: "nodes", message: "workflow must have at least one terminal node: end or handoff." });
  }

  const outgoingPriorities = new Map<string, Set<number>>();
  const outgoingNodeIds = new Set<string>();
  const fallbackNodeIds = new Set<string>();
  validateTests(tests, nodeIds, issues);
  edges.forEach((edge, index) => {
    validateEdge(edge, index, nodeIds, edgeIds, variableKeys, outgoingPriorities, outgoingNodeIds, fallbackNodeIds, issues);
  });

  validateRequiredOutgoingEdges(nodes, outgoingNodeIds, issues);
  validateChannelSettings(isRecord(workflow.channels) ? workflow.channels : {}, issues);

  return { valid: issues.length === 0, issues };
}

function validateNode(
  node: Record<string, unknown>,
  path: string,
  variableKeys: Set<string>,
  knowledgeSourceIds: Set<string>,
  toolIds: Set<string>,
  issues: ValidationIssue[]
) {
  switch (node.type) {
    case "message": {
      validateRequiredString(node, "message", issues, path);
      validateQuickReplies(node.quickReplies, `${path}.quickReplies`, issues);
      break;
    }
    case "question": {
      validateRequiredString(node, "prompt", issues, path);
      const variable = readRequiredString(node, "variable", `${path}.variable`, issues);
      if (variable && !variableKeys.has(variable)) {
        issues.push({ path: `${path}.variable`, message: `question variable '${variable}' is not declared.` });
      }
      break;
    }
    case "field_collection": {
      const fields = readArray(node.fields, `${path}.fields`, issues);
      if (fields.length === 0) {
        issues.push({ path: `${path}.fields`, message: "field_collection requires at least one field." });
      }
      const fieldKeys = new Set<string>();
      fields.forEach((field, index) => {
        const fieldPath = `${path}.fields[${index}]`;
        if (!isRecord(field)) {
          issues.push({ path: fieldPath, message: "field must be an object." });
          return;
        }
        const key = readRequiredString(field, "key", `${fieldPath}.key`, issues);
        validateRequiredString(field, "label", issues, fieldPath);
        if (typeof field.type !== "string" || !allowedVariableTypes.has(field.type)) {
          issues.push({ path: `${fieldPath}.type`, message: "field type is invalid." });
        }
        if (typeof field.required !== "boolean") {
          issues.push({ path: `${fieldPath}.required`, message: "field required must be a boolean." });
        }
        if (key) {
          if (fieldKeys.has(key)) issues.push({ path: `${fieldPath}.key`, message: `duplicate field key '${key}' in node.` });
          fieldKeys.add(key);
        }
        if (key && !variableKeys.has(key)) {
          issues.push({
            path: `${fieldPath}.key`,
            message: `field '${key}' is not declared in variables. Auto-declaration is intentionally disabled in v0.1.`
          });
        }
      });
      break;
    }
    case "rag_answer": {
      const sourceIds = readArray(node.knowledgeSourceIds, `${path}.knowledgeSourceIds`, issues);
      if (sourceIds.length === 0) {
        issues.push({ path: `${path}.knowledgeSourceIds`, message: "rag_answer requires at least one knowledge source id." });
      }
      sourceIds.forEach((sourceId, index) => {
        if (typeof sourceId !== "string" || sourceId.trim() === "") {
          issues.push({ path: `${path}.knowledgeSourceIds[${index}]`, message: "knowledge source id must be a non-empty string." });
        } else if (!knowledgeSourceIds.has(sourceId)) {
          issues.push({ path: `${path}.knowledgeSourceIds[${index}]`, message: `unknown knowledge source '${sourceId}'.` });
        }
      });
      break;
    }
    case "action": {
      const toolId = readRequiredString(node, "toolId", `${path}.toolId`, issues);
      if (toolId && !toolIds.has(toolId)) {
        issues.push({ path: `${path}.toolId`, message: `unknown tool '${toolId}'.` });
      }
      break;
    }
    case "webhook": {
      const webhookId = readRequiredString(node, "webhookId", `${path}.webhookId`, issues);
      if (webhookId && /^https?:\/\//i.test(webhookId)) {
        issues.push({ path: `${path}.webhookId`, message: "webhookId must reference a registered webhook id, not a raw URL." });
      }
      if (webhookId && secretLike(webhookId)) {
        issues.push({ path: `${path}.webhookId`, message: "webhookId must not contain secrets." });
      }
      break;
    }
    case "handoff": {
      validateRequiredString(node, "message", issues, path);
      break;
    }
    case "end": {
      if (node.message !== undefined && typeof node.message !== "string") {
        issues.push({ path: `${path}.message`, message: "end message must be a string when provided." });
      }
      break;
    }
  }
}

function validateEdge(
  edge: unknown,
  index: number,
  nodeIds: Set<string>,
  edgeIds: Set<string>,
  variableKeys: Set<string>,
  outgoingPriorities: Map<string, Set<number>>,
  outgoingNodeIds: Set<string>,
  fallbackNodeIds: Set<string>,
  issues: ValidationIssue[]
) {
  const path = `edges[${index}]`;
  if (!isRecord(edge)) {
    issues.push({ path, message: "edge must be an object." });
    return;
  }

  const edgeId = readRequiredString(edge, "id", `${path}.id`, issues);
  const source = readRequiredString(edge, "source", `${path}.source`, issues);
  const target = readRequiredString(edge, "target", `${path}.target`, issues);

  if (source) {
    if (!nodeIds.has(source)) issues.push({ path: `${path}.source`, message: `edge source '${source}' does not exist.` });
    outgoingNodeIds.add(source);
  }
  if (target && !nodeIds.has(target)) issues.push({ path: `${path}.target`, message: `edge target '${target}' does not exist.` });

  if (edgeId) {
    if (edgeIds.has(edgeId)) issues.push({ path: `${path}.id`, message: `duplicate edge id '${edgeId}'.` });
    edgeIds.add(edgeId);
  }

  if (edge.priority !== undefined && typeof edge.priority !== "number") {
    issues.push({ path: `${path}.priority`, message: "edge priority must be a number when provided." });
  }

  if (source && typeof edge.priority === "number") {
    const priorities = outgoingPriorities.get(source) ?? new Set<number>();
    if (priorities.has(edge.priority)) {
      issues.push({ path: `${path}.priority`, message: `duplicate outgoing priority '${edge.priority}' for source '${source}'.` });
    }
    priorities.add(edge.priority);
    outgoingPriorities.set(source, priorities);
  }

  if (edge.fallback !== undefined && typeof edge.fallback !== "boolean") {
    issues.push({ path: `${path}.fallback`, message: "edge fallback must be a boolean when provided." });
  }

  if (source && edge.fallback === true) {
    if (fallbackNodeIds.has(source)) {
      issues.push({ path: `${path}.fallback`, message: `source '${source}' must not have more than one fallback edge.` });
    }
    fallbackNodeIds.add(source);
  }

  if (typeof edge.condition === "string") {
    issues.push({ path: `${path}.condition`, message: "condition must be a safe AST object, not a string." });
  } else if (edge.condition !== undefined) {
    validateConditionAst(edge.condition, `${path}.condition`, issues, { variableKeys });
  }
}

interface ConditionValidationContext {
  variableKeys?: Set<string>;
}

export function validateConditionAst(
  condition: unknown,
  path = "condition",
  issues: ValidationIssue[] = [],
  context: ConditionValidationContext = {}
): ValidationResult {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    issues.push({ path, message: "condition must be an object AST." });
    return { valid: false, issues };
  }

  const conditionRecord = condition as Record<string, unknown>;
  const op = conditionRecord.op;
  if (typeof op !== "string") {
    issues.push({ path: `${path}.op`, message: "condition op must be a string." });
    return { valid: false, issues };
  }

  switch (op) {
    case "equals":
    case "not_equals":
    case "contains":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      validateRequiredConditionValue(conditionRecord.left, `${path}.left`, issues, context);
      validateRequiredConditionValue(conditionRecord.right, `${path}.right`, issues, context);
      break;
    case "exists":
      validateRequiredConditionValue(conditionRecord.value, `${path}.value`, issues, context);
      break;
    case "in":
      validateRequiredConditionValue(conditionRecord.value, `${path}.value`, issues, context);
      if (!Array.isArray(conditionRecord.list)) {
        issues.push({ path: `${path}.list`, message: "in condition requires a list." });
      } else {
        conditionRecord.list.forEach((item, index) => validateConditionValue(item, `${path}.list[${index}]`, issues, context));
      }
      break;
    case "all":
    case "any":
      if (!Array.isArray(conditionRecord.conditions) || conditionRecord.conditions.length === 0) {
        issues.push({ path: `${path}.conditions`, message: `${op} requires at least one nested condition.` });
      } else {
        conditionRecord.conditions.forEach((nested, index) => validateConditionAst(nested, `${path}.conditions[${index}]`, issues, context));
      }
      break;
    case "not":
      validateConditionAst(conditionRecord.condition, `${path}.condition`, issues, context);
      break;
    case "intent_is":
      if (!conditionRecord.intent || typeof conditionRecord.intent !== "string") {
        issues.push({ path: `${path}.intent`, message: "intent_is requires an intent string." });
      } else if (looksExecutable(conditionRecord.intent)) {
        issues.push({ path: `${path}.intent`, message: "intent must not contain executable JavaScript-like strings." });
      }
      break;
    default:
      issues.push({ path: `${path}.op`, message: `unsupported condition operator '${String(op)}'.` });
  }

  return { valid: issues.length === 0, issues };
}

function validateRequiredConditionValue(value: unknown, path: string, issues: ValidationIssue[], context: ConditionValidationContext) {
  if (value === undefined) {
    issues.push({ path, message: "condition value is required." });
    return;
  }
  validateConditionValue(value, path, issues, context);
}

function validateConditionValue(value: unknown, path: string, issues: ValidationIssue[], context: ConditionValidationContext) {
  if (typeof value === "string" && looksExecutable(value)) {
    issues.push({ path, message: "condition values must not contain executable JavaScript-like strings." });
    return;
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return;
  }

  if (!isRecord(value)) {
    issues.push({ path, message: "condition value must be a primitive, variable reference, or input reference." });
    return;
  }

  if ("var" in value) {
    if (typeof value.var !== "string" || value.var.trim() === "") {
      issues.push({ path: `${path}.var`, message: "condition variable reference must be a non-empty string." });
    } else if (context.variableKeys && !context.variableKeys.has(value.var)) {
      issues.push({ path: `${path}.var`, message: `condition variable '${value.var}' is not declared.` });
    }
    return;
  }

  if ("input" in value) {
    if (typeof value.input !== "string" || !allowedConditionInputs.has(value.input)) {
      issues.push({ path: `${path}.input`, message: "condition input reference must be text, choice, or intent." });
    }
    return;
  }

  issues.push({ path, message: "condition value object must be a variable reference or input reference." });
}

function validateChannelSettings(channels: Record<string, unknown>, issues: ValidationIssue[]) {
  Object.entries(channels).forEach(([channelName, config]) => {
    if (!isRecord(config)) {
      issues.push({ path: `channels.${channelName}`, message: "channel config must be an object." });
      return;
    }
    if (typeof config.enabled !== "boolean") {
      issues.push({ path: `channels.${channelName}.enabled`, message: "channel enabled must be a boolean." });
    }
    if (config.settings !== undefined && !isRecord(config.settings)) {
      issues.push({ path: `channels.${channelName}.settings`, message: "channel settings must be an object when provided." });
      return;
    }
    walkSettings(config.settings ?? {}, `channels.${channelName}.settings`, issues);
  });
}

function walkSettings(value: unknown, path: string, issues: ValidationIssue[]) {
  if (!value || typeof value !== "object") return;
  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    if (secretLike(key) || (typeof nested === "string" && secretLike(nested))) {
      issues.push({ path: `${path}.${key}`, message: "channel settings must not include secrets." });
    }
    if (typeof nested === "string" && /^https?:\/\//i.test(nested)) {
      issues.push({ path: `${path}.${key}`, message: "channel settings must not include raw URLs; use a reference id." });
    }
    walkSettings(nested, `${path}.${key}`, issues);
  });
}

function invalid(issues: ValidationIssue[]): ValidationResult {
  return { valid: false, issues };
}

function secretLike(value: string): boolean {
  const normalized = value.toLowerCase();
  return secretLikeKeys.some((key) => normalized.includes(key.toLowerCase()));
}

function looksExecutable(value: string): boolean {
  return /\b(function|eval|new Function|=>|require\(|process\.|globalThis|window\.)\b/.test(value);
}

function validateSourceSummary(value: unknown, issues: ValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push({ path: "sourceSummary", message: "sourceSummary must be an object." });
    return;
  }
  validateRequiredString(value, "businessName", issues, "sourceSummary");
  validateStringArray(value.sources, "sourceSummary.sources", issues);
  validateRequiredString(value, "summary", issues, "sourceSummary");
}

function validateVariables(variables: unknown[], issues: ValidationIssue[]): Set<string> {
  const keys = new Set<string>();
  variables.forEach((variable, index) => {
    const path = `variables[${index}]`;
    if (!isRecord(variable)) {
      issues.push({ path, message: "variable must be an object." });
      return;
    }
    const key = readRequiredString(variable, "key", `${path}.key`, issues);
    if (key) {
      if (keys.has(key)) issues.push({ path: `${path}.key`, message: `duplicate variable key '${key}'.` });
      keys.add(key);
    }
    if (typeof variable.type !== "string" || !allowedVariableTypes.has(variable.type)) {
      issues.push({ path: `${path}.type`, message: "variable type is invalid." });
    }
  });
  return keys;
}

function validateKnowledgeSources(sources: unknown[], issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>();
  sources.forEach((source, index) => {
    const path = `knowledgeSources[${index}]`;
    if (!isRecord(source)) {
      issues.push({ path, message: "knowledge source must be an object." });
      return;
    }
    const id = readRequiredString(source, "id", `${path}.id`, issues);
    if (id) {
      if (ids.has(id)) issues.push({ path: `${path}.id`, message: `duplicate knowledge source id '${id}'.` });
      ids.add(id);
    }
    if (typeof source.type !== "string" || !allowedKnowledgeSourceTypes.has(source.type)) {
      issues.push({ path: `${path}.type`, message: "knowledge source type is invalid." });
    }
    validateRequiredString(source, "title", issues, path);
  });
  return ids;
}

function validateTools(tools: unknown[], issues: ValidationIssue[]): Set<string> {
  const ids = new Set<string>();
  tools.forEach((tool, index) => {
    const path = `tools[${index}]`;
    if (!isRecord(tool)) {
      issues.push({ path, message: "tool must be an object." });
      return;
    }
    const id = readRequiredString(tool, "id", `${path}.id`, issues);
    if (id) {
      if (ids.has(id)) issues.push({ path: `${path}.id`, message: `duplicate tool id '${id}'.` });
      ids.add(id);
    }
    if (typeof tool.type !== "string" || !allowedToolTypes.has(tool.type)) {
      issues.push({ path: `${path}.type`, message: "tool type is invalid." });
    }
    validateRequiredString(tool, "name", issues, path);
  });
  return ids;
}

function validateTests(tests: unknown[], nodeIds: Set<string>, issues: ValidationIssue[]) {
  const ids = new Set<string>();
  tests.forEach((test, index) => {
    const path = `tests[${index}]`;
    if (!isRecord(test)) {
      issues.push({ path, message: "test must be an object." });
      return;
    }
    const id = readRequiredString(test, "id", `${path}.id`, issues);
    if (id) {
      if (ids.has(id)) issues.push({ path: `${path}.id`, message: `duplicate test id '${id}'.` });
      ids.add(id);
    }
    validateRequiredString(test, "name", issues, path);
    validateStringArray(test.input, `${path}.input`, issues);
    if (Array.isArray(test.expectedPath)) {
      test.expectedPath.forEach((nodeId, pathIndex) => {
        if (typeof nodeId !== "string" || nodeId.trim() === "") {
          issues.push({ path: `${path}.expectedPath[${pathIndex}]`, message: "expected path node id must be a non-empty string." });
        } else if (nodeIds.size > 0 && !nodeIds.has(nodeId)) {
          issues.push({ path: `${path}.expectedPath[${pathIndex}]`, message: `expected path references unknown node '${nodeId}'.` });
        }
      });
    }
  });
}

function validateQuickReplies(value: unknown, path: string, issues: ValidationIssue[]) {
  if (value === undefined) return;
  const quickReplies = readArray(value, path, issues);
  const ids = new Set<string>();
  quickReplies.forEach((reply, index) => {
    const replyPath = `${path}[${index}]`;
    if (!isRecord(reply)) {
      issues.push({ path: replyPath, message: "quick reply must be an object." });
      return;
    }
    const id = readRequiredString(reply, "id", `${replyPath}.id`, issues);
    if (id) {
      if (ids.has(id)) issues.push({ path: `${replyPath}.id`, message: `duplicate quick reply id '${id}'.` });
      ids.add(id);
    }
    validateRequiredString(reply, "label", issues, replyPath);
  });
}

function validateRequiredOutgoingEdges(nodes: unknown[], outgoingNodeIds: Set<string>, issues: ValidationIssue[]) {
  nodes.forEach((node, index) => {
    if (!isRecord(node) || typeof node.id !== "string" || typeof node.type !== "string") return;
    if (node.type === "end" || node.type === "handoff") return;
    if (!outgoingNodeIds.has(node.id)) {
      issues.push({ path: `nodes[${index}]`, message: `non-terminal node '${node.id}' must have at least one outgoing edge.` });
    }
  });
}

function validateRequiredString(record: Record<string, unknown>, key: string, issues: ValidationIssue[], parentPath?: string) {
  const path = parentPath ? `${parentPath}.${key}` : key;
  readRequiredString(record, key, path, issues);
}

function readRequiredString(record: Record<string, unknown>, key: string, path: string, issues: ValidationIssue[]): string | undefined {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({ path, message: `${key} must be a non-empty string.` });
    return undefined;
  }
  return value;
}

function validateStringArray(value: unknown, path: string, issues: ValidationIssue[]) {
  const array = readArray(value, path, issues);
  array.forEach((item, index) => {
    if (typeof item !== "string") {
      issues.push({ path: `${path}[${index}]`, message: "value must be a string." });
    }
  });
}

function validateIsoDateString(value: unknown, path: string, issues: ValidationIssue[]) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    issues.push({ path, message: `${path} must be an ISO date string.` });
  }
}

function readArray(value: unknown, path: string, issues: ValidationIssue[]): unknown[] {
  if (!Array.isArray(value)) {
    issues.push({ path, message: `${path} must be an array.` });
    return [];
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
