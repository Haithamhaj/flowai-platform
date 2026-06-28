export type PublishStatus = "draft" | "validated" | "published" | "archived";

export type WorkflowNodeType =
  | "start"
  | "message"
  | "question"
  | "field_collection"
  | "condition"
  | "ai_response"
  | "rag_answer"
  | "action"
  | "webhook"
  | "handoff"
  | "end";

export type VariableType = "string" | "number" | "boolean" | "date" | "email" | "phone" | "choice" | "object";

export interface SourceSummary {
  businessName: string;
  businessCategory?: string;
  sources: string[];
  summary: string;
}

export interface WorkflowVariable {
  key: string;
  type: VariableType;
  description?: string;
  required?: boolean;
}

export interface KnowledgeSource {
  id: string;
  type: "website" | "document" | "manual" | "collection";
  title: string;
  description?: string;
}

export interface WorkflowTool {
  id: string;
  type: "webhook" | "crm" | "calendar" | "internal";
  name: string;
  description?: string;
}

export interface WorkflowChannelConfig {
  enabled: boolean;
  settings?: Record<string, unknown>;
}

export interface WorkflowTestCase {
  id: string;
  name: string;
  input: string[];
  expectedPath?: string[];
  expectedVariables?: Record<string, unknown>;
}

export interface NodeMetadata {
  sourceRefs?: string[];
  confidence?: number;
  [key: string]: unknown;
}

export interface BaseNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;
  metadata?: NodeMetadata;
}

export interface StartNode extends BaseNode {
  type: "start";
}

export interface MessageNode extends BaseNode {
  type: "message";
  message: string;
  quickReplies?: Array<{ id: string; label: string; value?: string }>;
}

export interface QuestionNode extends BaseNode {
  type: "question";
  prompt: string;
  variable: string;
  expectedType?: VariableType;
  choices?: Array<{ id: string; label: string; value: string }>;
  retryMessage?: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: VariableType;
  required: boolean;
  prompt?: string;
}

export interface FieldCollectionNode extends BaseNode {
  type: "field_collection";
  fields: FieldDefinition[];
  completionMessage?: string;
}

export interface ConditionNode extends BaseNode {
  type: "condition";
}

export interface AiResponseNode extends BaseNode {
  type: "ai_response";
  promptTemplateId?: string;
}

export interface RagAnswerNode extends BaseNode {
  type: "rag_answer";
  knowledgeSourceIds: string[];
  fallbackMessage?: string;
}

export interface ActionNode extends BaseNode {
  type: "action";
  toolId: string;
  inputMapping?: Record<string, string>;
}

export interface WebhookNode extends BaseNode {
  type: "webhook";
  webhookId: string;
  inputMapping?: Record<string, string>;
}

export interface HandoffNode extends BaseNode {
  type: "handoff";
  message: string;
  queue?: string;
}

export interface EndNode extends BaseNode {
  type: "end";
  message?: string;
}

export type WorkflowNode =
  | StartNode
  | MessageNode
  | QuestionNode
  | FieldCollectionNode
  | ConditionNode
  | AiResponseNode
  | RagAnswerNode
  | ActionNode
  | WebhookNode
  | HandoffNode
  | EndNode;

export type ConditionValue =
  | string
  | number
  | boolean
  | null
  | { var: string }
  | { input: "text" | "choice" | "intent" };

export type ConditionAst =
  | { op: "equals" | "not_equals" | "contains" | "gt" | "gte" | "lt" | "lte"; left: ConditionValue; right: ConditionValue }
  | { op: "exists"; value: ConditionValue }
  | { op: "in"; value: ConditionValue; list: ConditionValue[] }
  | { op: "all" | "any"; conditions: ConditionAst[] }
  | { op: "not"; condition: ConditionAst }
  | { op: "intent_is"; intent: string };

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: ConditionAst;
  priority?: number;
  fallback?: boolean;
  label?: string;
}

export interface WorkflowDefinition {
  version: string;
  workflowId: string;
  name: string;
  description: string;
  sourceSummary: SourceSummary;
  assumptions: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  knowledgeSources: KnowledgeSource[];
  tools: WorkflowTool[];
  channels: Record<string, WorkflowChannelConfig>;
  tests: WorkflowTestCase[];
  publishStatus: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

