import type {
  ActionNode,
  ConditionAst,
  ConditionValue,
  FieldCollectionNode,
  QuestionNode,
  RagAnswerNode,
  WebhookNode,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
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

export function validateWorkflow(workflow: WorkflowDefinition): ValidationResult {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const variableKeys = new Set(workflow.variables?.map((variable) => variable.key) ?? []);
  const knowledgeSourceIds = new Set(workflow.knowledgeSources?.map((source) => source.id) ?? []);
  const toolIds = new Set(workflow.tools?.map((tool) => tool.id) ?? []);

  if (!Array.isArray(workflow.nodes)) {
    return invalid([{ path: "nodes", message: "nodes must be an array." }]);
  }

  if (!Array.isArray(workflow.edges)) {
    return invalid([{ path: "edges", message: "edges must be an array." }]);
  }

  workflow.nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    if (!node.id) issues.push({ path: `${path}.id`, message: "node id is required." });
    if (nodeIds.has(node.id)) issues.push({ path: `${path}.id`, message: `duplicate node id '${node.id}'.` });
    nodeIds.add(node.id);

    if (!allowedNodeTypes.has(node.type)) {
      issues.push({ path: `${path}.type`, message: `unknown node type '${String(node.type)}'.` });
      return;
    }

    validateNode(node, path, variableKeys, knowledgeSourceIds, toolIds, issues);
  });

  const startNodes = workflow.nodes.filter((node) => node.type === "start");
  if (startNodes.length !== 1) {
    issues.push({ path: "nodes", message: `workflow must have exactly one start node; found ${startNodes.length}.` });
  }

  const terminalNodes = workflow.nodes.filter((node) => node.type === "end" || node.type === "handoff");
  if (terminalNodes.length < 1) {
    issues.push({ path: "nodes", message: "workflow must have at least one terminal node: end or handoff." });
  }

  const outgoingPriorities = new Map<string, Set<number>>();
  workflow.edges.forEach((edge, index) => {
    validateEdge(edge, index, nodeIds, edgeIds, outgoingPriorities, issues);
  });

  validateChannelSettings(workflow.channels ?? {}, issues);

  return { valid: issues.length === 0, issues };
}

function validateNode(
  node: WorkflowNode,
  path: string,
  variableKeys: Set<string>,
  knowledgeSourceIds: Set<string>,
  toolIds: Set<string>,
  issues: ValidationIssue[]
) {
  switch (node.type) {
    case "question": {
      const question = node as QuestionNode;
      if (!variableKeys.has(question.variable)) {
        issues.push({ path: `${path}.variable`, message: `question variable '${question.variable}' is not declared.` });
      }
      break;
    }
    case "field_collection": {
      const collection = node as FieldCollectionNode;
      collection.fields?.forEach((field, index) => {
        if (!variableKeys.has(field.key)) {
          issues.push({
            path: `${path}.fields[${index}].key`,
            message: `field '${field.key}' is not declared in variables. Auto-declaration is intentionally disabled in v0.1.`
          });
        }
      });
      break;
    }
    case "rag_answer": {
      const rag = node as RagAnswerNode;
      rag.knowledgeSourceIds?.forEach((sourceId, index) => {
        if (!knowledgeSourceIds.has(sourceId)) {
          issues.push({ path: `${path}.knowledgeSourceIds[${index}]`, message: `unknown knowledge source '${sourceId}'.` });
        }
      });
      break;
    }
    case "action": {
      const action = node as ActionNode;
      if (!toolIds.has(action.toolId)) {
        issues.push({ path: `${path}.toolId`, message: `unknown tool '${action.toolId}'.` });
      }
      break;
    }
    case "webhook": {
      const webhook = node as WebhookNode;
      if (/^https?:\/\//i.test(webhook.webhookId)) {
        issues.push({ path: `${path}.webhookId`, message: "webhookId must reference a registered webhook id, not a raw URL." });
      }
      if (secretLike(webhook.webhookId)) {
        issues.push({ path: `${path}.webhookId`, message: "webhookId must not contain secrets." });
      }
      break;
    }
  }
}

function validateEdge(
  edge: WorkflowEdge,
  index: number,
  nodeIds: Set<string>,
  edgeIds: Set<string>,
  outgoingPriorities: Map<string, Set<number>>,
  issues: ValidationIssue[]
) {
  const path = `edges[${index}]`;
  if (!edge.id) issues.push({ path: `${path}.id`, message: "edge id is required." });
  if (!nodeIds.has(edge.source)) issues.push({ path: `${path}.source`, message: `edge source '${edge.source}' does not exist.` });
  if (!nodeIds.has(edge.target)) issues.push({ path: `${path}.target`, message: `edge target '${edge.target}' does not exist.` });

  if (edgeIds.has(edge.id)) issues.push({ path: `${path}.id`, message: `duplicate edge id '${edge.id}'.` });
  edgeIds.add(edge.id);

  if (edge.priority !== undefined) {
    const priorities = outgoingPriorities.get(edge.source) ?? new Set<number>();
    if (priorities.has(edge.priority)) {
      issues.push({ path: `${path}.priority`, message: `duplicate outgoing priority '${edge.priority}' for source '${edge.source}'.` });
    }
    priorities.add(edge.priority);
    outgoingPriorities.set(edge.source, priorities);
  }

  if (typeof edge.condition === "string") {
    issues.push({ path: `${path}.condition`, message: "condition must be a safe AST object, not a string." });
  } else if (edge.condition !== undefined) {
    validateConditionAst(edge.condition, `${path}.condition`, issues);
  }
}

export function validateConditionAst(condition: ConditionAst, path = "condition", issues: ValidationIssue[] = []): ValidationResult {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    issues.push({ path, message: "condition must be an object AST." });
    return { valid: false, issues };
  }

  switch (condition.op) {
    case "equals":
    case "not_equals":
    case "contains":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      validateConditionValue(condition.left, `${path}.left`, issues);
      validateConditionValue(condition.right, `${path}.right`, issues);
      break;
    case "exists":
      validateConditionValue(condition.value, `${path}.value`, issues);
      break;
    case "in":
      validateConditionValue(condition.value, `${path}.value`, issues);
      if (!Array.isArray(condition.list)) {
        issues.push({ path: `${path}.list`, message: "in condition requires a list." });
      } else {
        condition.list.forEach((item, index) => validateConditionValue(item, `${path}.list[${index}]`, issues));
      }
      break;
    case "all":
    case "any":
      if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) {
        issues.push({ path: `${path}.conditions`, message: `${condition.op} requires at least one nested condition.` });
      } else {
        condition.conditions.forEach((nested, index) => validateConditionAst(nested, `${path}.conditions[${index}]`, issues));
      }
      break;
    case "not":
      validateConditionAst(condition.condition, `${path}.condition`, issues);
      break;
    case "intent_is":
      if (!condition.intent || typeof condition.intent !== "string") {
        issues.push({ path: `${path}.intent`, message: "intent_is requires an intent string." });
      }
      break;
    default:
      issues.push({ path: `${path}.op`, message: `unsupported condition operator '${String((condition as { op?: unknown }).op)}'.` });
  }

  return { valid: issues.length === 0, issues };
}

function validateConditionValue(value: ConditionValue, path: string, issues: ValidationIssue[]) {
  if (typeof value === "string" && looksExecutable(value)) {
    issues.push({ path, message: "condition values must not contain executable JavaScript-like strings." });
  }
}

function validateChannelSettings(channels: Record<string, { settings?: Record<string, unknown> }>, issues: ValidationIssue[]) {
  Object.entries(channels).forEach(([channelName, config]) => {
    walkSettings(config.settings ?? {}, `channels.${channelName}.settings`, issues);
  });
}

function walkSettings(value: unknown, path: string, issues: ValidationIssue[]) {
  if (!value || typeof value !== "object") return;
  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    if (secretLike(key) || (typeof nested === "string" && secretLike(nested))) {
      issues.push({ path: `${path}.${key}`, message: "channel settings must not include secrets." });
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
