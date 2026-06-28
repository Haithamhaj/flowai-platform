import type { WorkflowDefinition } from "@flowai/workflow-dsl";

export interface RuntimeSessionState {
  sessionId: string;
  workflowId: string;
  currentNodeId: string;
  variables: Record<string, unknown>;
  collectedFields: Record<string, unknown>;
  awaitingInput?: RuntimeAwaitingInput;
  transcript: Array<{
    role: "user" | "assistant" | "system";
    text: string;
    at: string;
  }>;
  trace: RuntimeTraceEvent[];
  ended: boolean;
}

export type RuntimeAwaitingInput =
  | { kind: "question"; nodeId: string; variableKey: string }
  | { kind: "field_collection"; nodeId: string; fieldKey: string };

export interface RuntimeTraceEvent {
  id: string;
  sessionId: string;
  nodeId: string;
  type:
    | "node_entered"
    | "input_received"
    | "message_output"
    | "question_prompted"
    | "field_prompted"
    | "variable_set"
    | "field_value_set"
    | "condition_evaluated"
    | "edge_selected"
    | "fallback_used"
    | "session_ended"
    | "runtime_error";
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
  maxStepsPerTurn?: number;
}
