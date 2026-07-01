import { formatRuntimeOutputForTelegram } from "@flowai/channel-adapters";
import { WorkflowRuntime, type RuntimeMessage } from "@flowai/runtime-core";
import { validateWorkflow, type ValidationResult, type WorkflowDefinition, type WorkflowEdge, type WorkflowNode } from "@flowai/workflow-dsl";

export interface VisualWorkflowNode {
  id: string;
  type: WorkflowNode["type"];
  name: string;
  text: string;
  x: number;
  y: number;
  editable: boolean;
}

export interface VisualWorkflowEdge {
  id: string;
  source: string;
  target: string;
  label: string | null;
  fallback: boolean;
}

export interface WorkflowEditorModel {
  workflowJson: WorkflowDefinition;
  nodes: VisualWorkflowNode[];
  edges: VisualWorkflowEdge[];
  validation: ValidationResult;
}

export type WorkflowEditorCommand =
  | { type: "edit_node_text"; nodeId: string; text: string }
  | { type: "add_message_node"; nodeId: string; sourceNodeId: string; name: string; message: string; edgeLabel?: string }
  | { type: "connect_nodes"; edgeId?: string; sourceNodeId: string; targetNodeId: string; label?: string }
  | { type: "delete_node_only"; nodeId: string };

export interface WorkflowEditorCommandResult {
  workflow: WorkflowDefinition;
  model: WorkflowEditorModel;
  validation: ValidationResult;
}

export interface EditedWorkflowPreview {
  validation: ValidationResult;
  runtimeConversation: Array<{ from: "owner" | "bot" | "state"; messages: string[] }>;
  telegramPreview: Array<{ text: string; buttons: string[] }>;
}

export function buildWorkflowEditorModel(workflow: WorkflowDefinition): WorkflowEditorModel {
  const validation = validateWorkflow(workflow);
  return {
    workflowJson: cloneWorkflow(workflow),
    nodes: workflow.nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      name: node.name,
      text: textForNode(node),
      x: 80 + (index % 3) * 260,
      y: 80 + Math.floor(index / 3) * 170,
      editable: node.type !== "start" && node.type !== "condition"
    })),
    edges: workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? null,
      fallback: Boolean(edge.fallback)
    })),
    validation
  };
}

export function applyWorkflowEditorCommand(
  workflow: WorkflowDefinition,
  command: WorkflowEditorCommand
): WorkflowEditorCommandResult {
  const next = cloneWorkflow(workflow);

  switch (command.type) {
    case "edit_node_text":
      editNodeText(next, command.nodeId, command.text);
      break;
    case "add_message_node":
      addMessageNode(next, command);
      break;
    case "connect_nodes":
      connectNodes(next, command);
      break;
    case "delete_node_only":
      next.nodes = next.nodes.filter((node) => node.id !== command.nodeId);
      break;
  }

  next.updatedAt = "1970-01-01T00:00:00.000Z";
  const model = buildWorkflowEditorModel(next);
  return {
    workflow: next,
    model,
    validation: model.validation
  };
}

export function runEditedWorkflowPreview(workflow: WorkflowDefinition): EditedWorkflowPreview {
  const validation = validateWorkflow(workflow);
  if (!validation.valid) {
    return {
      validation,
      runtimeConversation: [],
      telegramPreview: []
    };
  }

  return {
    validation,
    runtimeConversation: runRuntimePreview(workflow),
    telegramPreview: renderTelegramPreview(workflow)
  };
}

function editNodeText(workflow: WorkflowDefinition, nodeId: string, text: string) {
  const node = workflow.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return;

  if (node.type === "message") {
    node.message = text;
  } else if (node.type === "question") {
    node.prompt = text;
  } else if (node.type === "field_collection") {
    node.completionMessage = text;
  } else if (node.type === "handoff") {
    node.message = text;
  } else if (node.type === "end") {
    node.message = text;
  }
}

function addMessageNode(
  workflow: WorkflowDefinition,
  command: Extract<WorkflowEditorCommand, { type: "add_message_node" }>
) {
  const existingOutgoing = workflow.edges.find((edge) => edge.source === command.sourceNodeId);
  const node: WorkflowNode = {
    id: safeId(command.nodeId),
    type: "message",
    name: command.name.trim() || "Owner review message",
    message: command.message.trim() || "Owner review message."
  };
  workflow.nodes.push(node);
  workflow.edges.push({
    id: safeId(`edge_${command.sourceNodeId}_${node.id}`),
    source: command.sourceNodeId,
    target: node.id,
    label: command.edgeLabel?.trim() || "Added"
  });
  if (existingOutgoing) {
    workflow.edges.push({
      id: safeId(`edge_${node.id}_${existingOutgoing.target}`),
      source: node.id,
      target: existingOutgoing.target,
      label: "Continue"
    });
  }
}

function connectNodes(
  workflow: WorkflowDefinition,
  command: Extract<WorkflowEditorCommand, { type: "connect_nodes" }>
) {
  const edge: WorkflowEdge = {
    id: safeId(command.edgeId || `edge_${command.sourceNodeId}_${command.targetNodeId}`),
    source: command.sourceNodeId,
    target: command.targetNodeId,
    label: command.label?.trim() || undefined
  };
  workflow.edges.push(edge);
}

function runRuntimePreview(workflow: WorkflowDefinition): EditedWorkflowPreview["runtimeConversation"] {
  const runtime = new WorkflowRuntime({
    workflow,
    now: () => new Date("2026-07-01T00:00:00.000Z")
  });
  const started = runtime.start(`editor_${workflow.workflowId}`);
  const transcript: EditedWorkflowPreview["runtimeConversation"] = [
    { from: "bot", messages: started.messages.map(formatRuntimeMessage) }
  ];
  const inputs = workflow.workflowId.includes("clinic")
    ? ["book appointment", "Huda Ali", "+966500000000", "2026-07-01"]
    : ["lead", "Noura", "+966511111111", "Riyadh office"];
  let state = started.state;

  for (const input of inputs) {
    if (state.ended) break;
    transcript.push({ from: "owner", messages: [input] });
    const output = runtime.receive(state, { text: input });
    state = output.state;
    transcript.push({ from: "bot", messages: output.messages.map(formatRuntimeMessage) });
  }

  transcript.push({ from: "state", messages: [`ended=${state.ended}`, `currentNode=${state.currentNodeId}`] });
  return transcript;
}

function renderTelegramPreview(workflow: WorkflowDefinition): EditedWorkflowPreview["telegramPreview"] {
  const runtime = new WorkflowRuntime({
    workflow,
    now: () => new Date("2026-07-01T00:00:00.000Z")
  });
  const output = runtime.start(`editor_telegram_${workflow.workflowId}`);
  return formatRuntimeOutputForTelegram({ output }).map((descriptor) => ({
    text: descriptor.text,
    buttons: descriptor.replyMarkup?.inline_keyboard.flatMap((row) => row.map((button) => button.text)) ?? []
  }));
}

function textForNode(node: WorkflowNode): string {
  if (node.type === "message") return node.message;
  if (node.type === "question") return node.prompt;
  if (node.type === "field_collection") return node.completionMessage ?? node.fields.map((field) => field.label).join(", ");
  if (node.type === "handoff") return node.message;
  if (node.type === "end") return node.message ?? "";
  return node.description ?? node.name;
}

function formatRuntimeMessage(message: RuntimeMessage): string {
  if (message.type === "choices") {
    return `[choices: ${message.choices.map((choice) => choice.label).join(", ")}]`;
  }
  return message.text;
}

function safeId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "editor_node";
}

function cloneWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
  return JSON.parse(JSON.stringify(workflow)) as WorkflowDefinition;
}
