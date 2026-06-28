import {
  validateWorkflow,
  type AiResponseNode,
  type FieldCollectionNode,
  type MessageNode,
  type QuestionNode,
  type RagAnswerNode,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowNode
} from "@flowai/workflow-dsl";
import { ConditionEvaluator } from "./condition-evaluator.js";
import type { RuntimeInput, RuntimeMessage, RuntimeOutput, RuntimeSessionState, RuntimeTraceEvent, WorkflowRuntimeOptions } from "./types.js";

const DEFAULT_MAX_STEPS_PER_TURN = 50;

export class WorkflowRuntime {
  private readonly workflow: WorkflowDefinition;
  private readonly now: () => Date;
  private readonly maxStepsPerTurn: number;
  private readonly evaluator = new ConditionEvaluator();
  private readonly nodes: Map<string, WorkflowNode>;
  private readonly outgoing: Map<string, WorkflowEdge[]>;

  constructor(options: WorkflowRuntimeOptions) {
    const validation = validateWorkflow(options.workflow);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
    }

    this.workflow = options.workflow;
    this.now = options.now ?? (() => new Date());
    this.maxStepsPerTurn = options.maxStepsPerTurn ?? DEFAULT_MAX_STEPS_PER_TURN;
    this.nodes = new Map(this.workflow.nodes.map((node) => [node.id, node]));
    this.outgoing = this.groupEdges(this.workflow.edges);
  }

  start(sessionId: string = crypto.randomUUID()): RuntimeOutput {
    const start = this.workflow.nodes.find((node) => node.type === "start");
    if (!start) throw new Error("validated workflow unexpectedly has no start node");

    const state: RuntimeSessionState = {
      sessionId,
      workflowId: this.workflow.workflowId,
      currentNodeId: start.id,
      variables: {},
      collectedFields: {},
      transcript: [],
      trace: [],
      ended: false
    };

    return this.continueFromCurrent(state, {});
  }

  receive(state: RuntimeSessionState, input: RuntimeInput): RuntimeOutput {
    const traceStart = state.trace.length;
    const messages: RuntimeMessage[] = [];
    this.trace(state, state.currentNodeId, "input_received", { input });
    this.appendUserInput(state, input);

    if (state.ended) return this.output(state, messages, traceStart);

    if (state.awaitingInput?.kind === "question") {
      messages.push(...this.captureQuestionAnswer(state, input));
    } else if (state.awaitingInput?.kind === "field_collection") {
      messages.push(...this.captureFieldValue(state, input));
    } else {
      messages.push(...this.drainAutoNodes(state, input));
    }

    return this.output(state, messages, traceStart);
  }

  private continueFromCurrent(state: RuntimeSessionState, input: RuntimeInput): RuntimeOutput {
    const traceStart = state.trace.length;
    const messages = this.drainAutoNodes(state, input);
    return this.output(state, messages, traceStart);
  }

  private drainAutoNodes(state: RuntimeSessionState, input: RuntimeInput): RuntimeMessage[] {
    const messages: RuntimeMessage[] = [];
    let guard = 0;

    while (!state.ended && !state.awaitingInput) {
      guard += 1;
      if (guard > this.maxStepsPerTurn) {
        messages.push(...this.runtimeError(state, state.currentNodeId, "Runtime exceeded node execution guard. Check workflow cycles."));
        break;
      }

      const node = this.getNode(state.currentNodeId);
      this.trace(state, node.id, "node_entered", { type: node.type });

      if (node.type === "start") {
        if (!this.advanceFromNode(state, node.id, input)) {
          messages.push(...this.runtimeError(state, node.id, `Node '${node.id}' has no outgoing edge.`));
        }
        continue;
      }

      if (node.type === "message") {
        messages.push(...this.emitMessageNode(state, node as MessageNode));
        if (!this.advanceFromNode(state, node.id, input)) {
          messages.push(...this.runtimeError(state, node.id, `Node '${node.id}' has no outgoing edge.`));
        }
        break;
      }

      if (node.type === "condition") {
        if (!this.advanceFromCondition(state, node.id, input)) {
          messages.push(...this.runtimeError(state, node.id, `Condition node '${node.id}' has no selectable outgoing edge.`));
        }
        continue;
      }

      if (node.type === "field_collection") {
        messages.push(...this.promptNextRequiredField(state, node as FieldCollectionNode));
        break;
      }

      if (node.type === "question") {
        messages.push(...this.promptQuestion(state, node as QuestionNode));
        break;
      }

      if (node.type === "rag_answer") {
        messages.push(...this.emitRagPlaceholder(state, node as RagAnswerNode));
        if (!this.advanceFromNode(state, node.id, input)) {
          this.endSession(state, node.id, "placeholder_without_outgoing");
        }
        continue;
      }

      if (node.type === "ai_response") {
        messages.push(...this.emitAiPlaceholder(state, node as AiResponseNode));
        if (!this.advanceFromNode(state, node.id, input)) {
          this.endSession(state, node.id, "placeholder_without_outgoing");
        }
        continue;
      }

      if (node.type === "handoff") {
        messages.push(...this.emitText(state, node.id, node.message));
        this.endSession(state, node.id, "handoff");
        break;
      }

      if (node.type === "end") {
        if (node.message) messages.push(...this.emitText(state, node.id, node.message));
        this.endSession(state, node.id, "end");
        break;
      }

      messages.push(...this.runtimeError(state, node.id, `Node type '${node.type}' is valid but not executable in runtime-core v0.1.`));
      break;
    }

    return messages;
  }

  private captureQuestionAnswer(state: RuntimeSessionState, input: RuntimeInput): RuntimeMessage[] {
    const awaiting = state.awaitingInput;
    if (!awaiting || awaiting.kind !== "question") return [];

    const node = this.getNode(awaiting.nodeId) as QuestionNode;
    const value = this.readInputValue(input);
    if (!value) {
      const retry = node.retryMessage ?? "Please provide an answer.";
      return [...this.emitText(state, node.id, retry), ...this.promptQuestion(state, node, false)];
    }

    state.variables[awaiting.variableKey] = value;
    state.awaitingInput = undefined;
    this.trace(state, node.id, "variable_set", { key: awaiting.variableKey, value });
    const messages = this.drainAfterAdvance(state, node.id, input);
    return messages;
  }

  private captureFieldValue(state: RuntimeSessionState, input: RuntimeInput): RuntimeMessage[] {
    const awaiting = state.awaitingInput;
    if (!awaiting || awaiting.kind !== "field_collection") return [];

    const node = this.getNode(awaiting.nodeId) as FieldCollectionNode;
    const field = node.fields.find((candidate) => candidate.key === awaiting.fieldKey);
    if (!field) return this.runtimeError(state, node.id, `Pending field '${awaiting.fieldKey}' no longer exists.`);

    const value = this.readInputValue(input);
    if (!value) {
      const prompt = field.prompt ?? field.label;
      return [...this.emitText(state, node.id, `Please provide ${field.label}.`), ...this.promptField(state, node.id, field.key, prompt)];
    }

    state.collectedFields[field.key] = value;
    state.variables[field.key] = value;
    state.awaitingInput = undefined;
    this.trace(state, node.id, "field_value_set", { key: field.key, value });
    this.trace(state, node.id, "variable_set", { key: field.key, value });

    const messages = this.promptNextRequiredField(state, node);
    return messages;
  }

  private promptNextRequiredField(state: RuntimeSessionState, node: FieldCollectionNode): RuntimeMessage[] {
    const nextField = node.fields.filter((field) => field.required).find((field) => state.collectedFields[field.key] === undefined);
    if (nextField) {
      return this.promptField(state, node.id, nextField.key, nextField.prompt ?? nextField.label);
    }

    const messages: RuntimeMessage[] = [];
    if (node.completionMessage) {
      messages.push(...this.emitText(state, node.id, node.completionMessage));
    }

    if (!this.advanceFromNode(state, node.id, {})) {
      messages.push(...this.runtimeError(state, node.id, `Node '${node.id}' has no outgoing edge.`));
      return messages;
    }

    messages.push(...this.drainAutoNodes(state, {}));
    return messages;
  }

  private promptQuestion(state: RuntimeSessionState, node: QuestionNode, setAwaiting = true): RuntimeMessage[] {
    const messages = this.emitText(state, node.id, node.prompt);
    if (node.choices?.length) messages.push({ type: "choices", choices: node.choices });
    if (setAwaiting) state.awaitingInput = { kind: "question", nodeId: node.id, variableKey: node.variable };
    this.trace(state, node.id, "question_prompted", { variableKey: node.variable });
    return messages;
  }

  private promptField(state: RuntimeSessionState, nodeId: string, fieldKey: string, prompt: string): RuntimeMessage[] {
    state.awaitingInput = { kind: "field_collection", nodeId, fieldKey };
    this.trace(state, nodeId, "field_prompted", { fieldKey });
    return this.emitText(state, nodeId, prompt);
  }

  private drainAfterAdvance(state: RuntimeSessionState, nodeId: string, input: RuntimeInput): RuntimeMessage[] {
    if (!this.advanceFromNode(state, nodeId, input)) {
      return this.runtimeError(state, nodeId, `Node '${nodeId}' has no outgoing edge.`);
    }
    return this.drainAutoNodes(state, input);
  }

  private emitMessageNode(state: RuntimeSessionState, node: MessageNode): RuntimeMessage[] {
    const messages = this.emitText(state, node.id, node.message);
    if (node.quickReplies?.length) {
      messages.push({ type: "choices", choices: node.quickReplies });
    }
    return messages;
  }

  private emitRagPlaceholder(state: RuntimeSessionState, node: RagAnswerNode): RuntimeMessage[] {
    const text = node.fallbackMessage ?? "RAG is not implemented in runtime-core v0.1.";
    return this.emitText(state, node.id, text);
  }

  private emitAiPlaceholder(state: RuntimeSessionState, node: AiResponseNode): RuntimeMessage[] {
    const text = `AI response generation is not implemented in runtime-core v0.1.${node.promptTemplateId ? "" : ""}`;
    return this.emitText(state, node.id, text);
  }

  private emitText(state: RuntimeSessionState, nodeId: string, text: string): RuntimeMessage[] {
    state.transcript.push({ role: "assistant", text, at: this.timestamp() });
    this.trace(state, nodeId, "message_output", { text });
    return [{ type: "text", text }];
  }

  private advanceFromNode(state: RuntimeSessionState, nodeId: string, input: RuntimeInput): boolean {
    const edge = this.selectEdge(nodeId, input, state, "first_unconditional");
    if (!edge) return false;
    this.followEdge(state, edge, false);
    return true;
  }

  private advanceFromCondition(state: RuntimeSessionState, nodeId: string, input: RuntimeInput): boolean {
    const edge = this.selectEdge(nodeId, input, state, "condition");
    if (!edge) return false;
    this.followEdge(state, edge, Boolean(edge.fallback));
    return true;
  }

  private selectEdge(
    nodeId: string,
    input: RuntimeInput,
    state: RuntimeSessionState,
    mode: "condition" | "first_unconditional"
  ): WorkflowEdge | undefined {
    const edges = this.outgoing.get(nodeId) ?? [];
    if (mode === "first_unconditional") {
      return edges.find((edge) => !edge.condition && !edge.fallback);
    }

    for (const edge of edges.filter((candidate) => candidate.condition && !candidate.fallback)) {
      const result = this.evaluator.evaluate(edge.condition, input, state);
      this.trace(state, nodeId, "condition_evaluated", { edgeId: edge.id, result });
      if (result) return edge;
    }

    const fallback = edges.find((edge) => edge.fallback);
    if (fallback) return fallback;
    return edges.find((edge) => !edge.condition && !edge.fallback);
  }

  private followEdge(state: RuntimeSessionState, edge: WorkflowEdge, fallbackUsed: boolean) {
    this.trace(state, edge.source, "edge_selected", { edgeId: edge.id, target: edge.target, fallback: fallbackUsed });
    if (fallbackUsed) this.trace(state, edge.source, "fallback_used", { edgeId: edge.id, target: edge.target });
    state.currentNodeId = edge.target;
  }

  private runtimeError(state: RuntimeSessionState, nodeId: string, message: string): RuntimeMessage[] {
    this.trace(state, nodeId, "runtime_error", { message });
    const messages = this.emitText(state, nodeId, `Runtime error: ${message}`);
    this.endSession(state, nodeId, "runtime_error");
    return messages;
  }

  private endSession(state: RuntimeSessionState, nodeId: string, reason: string) {
    state.awaitingInput = undefined;
    state.ended = true;
    this.trace(state, nodeId, "session_ended", { reason });
  }

  private appendUserInput(state: RuntimeSessionState, input: RuntimeInput) {
    const text = this.readInputValue(input);
    if (text) state.transcript.push({ role: "user", text, at: this.timestamp() });
  }

  private readInputValue(input: RuntimeInput): string {
    return (input.text ?? input.choiceId ?? "").trim();
  }

  private getNode(nodeId: string): WorkflowNode {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error(`Unknown current node '${nodeId}'.`);
    return node;
  }

  private groupEdges(edges: WorkflowEdge[]): Map<string, WorkflowEdge[]> {
    const grouped = new Map<string, WorkflowEdge[]>();
    for (const edge of edges) {
      const sourceEdges = grouped.get(edge.source) ?? [];
      sourceEdges.push(edge);
      sourceEdges.sort((left, right) => {
        const priorityDelta = (left.priority ?? 9999) - (right.priority ?? 9999);
        return priorityDelta === 0 ? left.id.localeCompare(right.id) : priorityDelta;
      });
      grouped.set(edge.source, sourceEdges);
    }
    return grouped;
  }

  private output(state: RuntimeSessionState, messages: RuntimeMessage[], traceStart: number): RuntimeOutput {
    return {
      sessionId: state.sessionId,
      messages,
      state,
      statePatch: {
        currentNodeId: state.currentNodeId,
        variables: state.variables,
        collectedFields: state.collectedFields,
        awaitingInput: state.awaitingInput,
        ended: state.ended
      },
      traceEvents: state.trace.slice(traceStart)
    };
  }

  private trace(
    state: RuntimeSessionState,
    nodeId: string,
    type: RuntimeTraceEvent["type"],
    detail: Record<string, unknown> = {}
  ) {
    state.trace.push({
      id: crypto.randomUUID(),
      sessionId: state.sessionId,
      nodeId,
      type,
      detail,
      at: this.timestamp()
    });
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
