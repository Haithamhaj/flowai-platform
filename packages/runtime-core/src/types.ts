import type { WorkflowDefinition } from "@flowai/workflow-dsl";

export interface RuntimeSessionState {
  sessionId: string;
  workflowId: string;
  currentNodeId: string;
  variables: Record<string, unknown>;
  collectedFields: Record<string, unknown>;
  pendingField?: {
    nodeId: string;
    fieldKey: string;
  };
  transcript: Array<{
    role: "user" | "assistant" | "system";
    text: string;
    at: string;
  }>;
  trace: RuntimeTraceEvent[];
  ended: boolean;
}

export interface RuntimeTraceEvent {
  id: string;
  sessionId: string;
  nodeId: string;
  type: "node_entered" | "message_output" | "input_received" | "variable_set" | "edge_followed" | "session_ended";
  detail?: Record<string, unknown>;
  at: string;
}

export interface RuntimeInput {
  text?: string;
  choiceId?: string;
  intent?: string;
}

export type RuntimeMessage =
  | { type: "text"; text: string }
  | { type: "choices"; choices: Array<{ id: string; label: string; value?: string }> };

export interface RuntimeOutput {
  sessionId: string;
  messages: RuntimeMessage[];
  state: RuntimeSessionState;
  statePatch: Record<string, unknown>;
  traceEvents: RuntimeTraceEvent[];
}

export interface WorkflowRuntimeOptions {
  workflow: WorkflowDefinition;
  sessionId?: string;
  now?: () => Date;
}

