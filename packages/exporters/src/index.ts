import { validateWorkflow, type WorkflowDefinition, type WorkflowNode, type WorkflowVariable } from "@flowai/workflow-dsl";

export interface ExportWarning {
  code: string;
  message: string;
  nodeId?: string;
}

export interface FlowAiExportPackage {
  format: "flowai.workflow.export.v1";
  workflow: WorkflowDefinition;
  validation: ReturnType<typeof validateWorkflow>;
  warnings: ExportWarning[];
}

export interface IntegrationFieldMapping {
  workflowField: string;
  workflowType: WorkflowVariable["type"];
  suggestedExternalField: string;
  required: boolean;
}

export interface UnsupportedMapping {
  nodeId: string;
  nodeType: WorkflowNode["type"];
  reason: string;
}

export interface CrmMappingPlan {
  target: "crm";
  workflowId: string;
  fieldMappings: IntegrationFieldMapping[];
  routing: {
    queue: string | null;
    handoffNodeIds: string[];
  };
  unsupported: UnsupportedMapping[];
  notes: string[];
}

export interface TicketingMappingPlan {
  target: "ticketing";
  workflowId: string;
  ticketFields: IntegrationFieldMapping[];
  routing: {
    queue: string | null;
    handoffNodeIds: string[];
  };
  unsupported: UnsupportedMapping[];
  notes: string[];
}

export interface IntegrationHubPayload {
  summary: {
    workflowId: string;
    workflowName: string;
    valid: boolean;
    unsupportedCount: number;
  };
  flowAiJson: FlowAiExportPackage;
  crm: CrmMappingPlan;
  ticketing: TicketingMappingPlan;
  copyBlocks: Array<{ id: "flowai_json" | "crm_mapping" | "ticketing_mapping"; label: string; content: string }>;
}

export interface WorkflowExportInput {
  workflow: WorkflowDefinition;
}

export const exportersStatus = {
  status: "active",
  note: "FlowAI JSON plus CRM and ticketing mapping plans are deterministic local exports."
};

export function buildFlowAiExportPackage(input: WorkflowExportInput): FlowAiExportPackage {
  const workflow = sanitizeWorkflow(input.workflow);
  return {
    format: "flowai.workflow.export.v1",
    workflow,
    validation: validateWorkflow(workflow),
    warnings: collectExportWarnings(workflow)
  };
}

export function buildCrmMappingPlan(input: WorkflowExportInput): CrmMappingPlan {
  const workflow = sanitizeWorkflow(input.workflow);
  return {
    target: "crm",
    workflowId: workflow.workflowId,
    fieldMappings: workflow.variables.map(mapVariable),
    routing: buildRouting(workflow),
    unsupported: collectUnsupportedMappings(workflow),
    notes: [
      "This is a mapping plan only; it does not connect to a live CRM.",
      "External field names are suggestions and must be reviewed before production use."
    ]
  };
}

export function buildTicketingMappingPlan(input: WorkflowExportInput): TicketingMappingPlan {
  const workflow = sanitizeWorkflow(input.workflow);
  return {
    target: "ticketing",
    workflowId: workflow.workflowId,
    ticketFields: workflow.variables.map(mapVariable),
    routing: buildRouting(workflow),
    unsupported: collectUnsupportedMappings(workflow),
    notes: [
      "This is a mapping plan only; it does not create tickets.",
      "Queue routing is inferred from workflow handoff nodes and must be reviewed."
    ]
  };
}

export function buildWorkflowIntegrationHub(input: WorkflowExportInput): IntegrationHubPayload {
  const flowAiJson = buildFlowAiExportPackage(input);
  const crm = buildCrmMappingPlan(input);
  const ticketing = buildTicketingMappingPlan(input);
  const unsupportedCount = new Set([...crm.unsupported, ...ticketing.unsupported].map((item) => item.nodeId)).size;

  return {
    summary: {
      workflowId: flowAiJson.workflow.workflowId,
      workflowName: flowAiJson.workflow.name,
      valid: flowAiJson.validation.valid,
      unsupportedCount
    },
    flowAiJson,
    crm,
    ticketing,
    copyBlocks: [
      { id: "flowai_json", label: "FlowAI Workflow JSON", content: stableJson(flowAiJson.workflow) },
      { id: "crm_mapping", label: "CRM mapping plan", content: stableJson(crm) },
      { id: "ticketing_mapping", label: "Ticketing mapping plan", content: stableJson(ticketing) }
    ]
  };
}

function sanitizeWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
  const clone = JSON.parse(JSON.stringify(workflow)) as WorkflowDefinition;
  clone.channels = Object.fromEntries(
    Object.entries(clone.channels).map(([channelId, config]) => [
      channelId,
      {
        enabled: config.enabled,
        settings: sanitizeSettings(config.settings)
      }
    ])
  );
  return clone;
}

function sanitizeSettings(settings: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!settings) return undefined;
  const safeEntries = Object.entries(settings).filter(([key]) => !isSecretKey(key));
  return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : undefined;
}

function isSecretKey(key: string): boolean {
  return ["token", "secret", "password", "apiKey", "api_key", "authorization", "webhookSecret"].includes(key);
}

function collectExportWarnings(workflow: WorkflowDefinition): ExportWarning[] {
  return collectUnsupportedMappings(workflow).map((item) => ({
    code: warningCodeForNodeType(item.nodeType),
    message: item.reason,
    nodeId: item.nodeId
  }));
}

function collectUnsupportedMappings(workflow: WorkflowDefinition): UnsupportedMapping[] {
  const unsupported: UnsupportedMapping[] = [];
  for (const node of workflow.nodes) {
    if (node.type === "webhook") {
      unsupported.push({ nodeId: node.id, nodeType: node.type, reason: "Live webhook export is not configured." });
      continue;
    }
    if (node.type === "action") {
      unsupported.push({ nodeId: node.id, nodeType: node.type, reason: "Live action/tool export is not configured." });
      continue;
    }
    if (node.type === "ai_response") {
      unsupported.push({ nodeId: node.id, nodeType: node.type, reason: "Live AI provider export is not configured." });
      continue;
    }
    if (node.type === "rag_answer") {
      unsupported.push({ nodeId: node.id, nodeType: node.type, reason: "RAG source export is not configured." });
    }
  }
  return unsupported;
}

function warningCodeForNodeType(nodeType: WorkflowNode["type"]): string {
  if (nodeType === "webhook") return "UNSUPPORTED_WEBHOOK_EXPORT";
  if (nodeType === "action") return "UNSUPPORTED_ACTION_EXPORT";
  if (nodeType === "ai_response") return "UNSUPPORTED_AI_EXPORT";
  if (nodeType === "rag_answer") return "UNSUPPORTED_RAG_EXPORT";
  return "UNSUPPORTED_NODE_EXPORT";
}

function mapVariable(variable: WorkflowVariable): IntegrationFieldMapping {
  return {
    workflowField: variable.key,
    workflowType: variable.type,
    suggestedExternalField: variable.key,
    required: Boolean(variable.required)
  };
}

function buildRouting(workflow: WorkflowDefinition): CrmMappingPlan["routing"] {
  const handoffNodes = workflow.nodes.filter((node) => node.type === "handoff");
  const firstQueue = handoffNodes.find((node) => node.type === "handoff" && node.queue)?.queue ?? null;
  return {
    queue: firstQueue,
    handoffNodeIds: handoffNodes.map((node) => node.id)
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
