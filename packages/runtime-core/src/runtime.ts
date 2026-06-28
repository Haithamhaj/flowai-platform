import {
  validateWorkflow,
  type FieldCollectionNode,
  type MessageNode,
  type RagAnswerNode,
  type WorkflowDefinition,
  type WorkflowEdge,
  type WorkflowNode
} from "@flowai/workflow-dsl";
import { ConditionEvaluator } from "./condition-evaluator.js";
import type { RuntimeInput, RuntimeMessage, RuntimeOutput, RuntimeSessionState, RuntimeTraceEvent, WorkflowRuntimeOptions } from "./types.js";

export class WorkflowRuntime {
  private readonly workflow: WorkflowDefinition;
  private readonly now: () => Date;
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
    if (input.text) state.transcript.push({ role: "user", text: input.text, at: this.timestamp() });

    const node = this.getNode(state.currentNodeId);
    if (state.pendingField) {
      this.capturePendingField(state, input);
      messages.push(...this.executeFieldCollection(state, this.getNode(state.pendingField?.nodeId ?? node.id) as FieldCollectionNode));
    } else if (node.type === "condition") {
      const edge = this.selectEdge(node.id, input, state);
      this.followEdge(state, edge);
      messages.push(...this.drainAutoNodes(state, input));
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

    while (!state.ended && guard < 50) {
      guard += 1;
      const node = this.getNode(state.currentNodeId);
      this.trace(state, node.id, "node_entered", { type: node.type });

      if (node.type === "start") {
        this.followEdge(state, this.firstEdge(node.id));
        continue;
      }

      if (node.type === "message") {
        const messageNode = node as MessageNode;
        messages.push({ type: "text", text: messageNode.message });
        state.transcript.push({ role: "assistant", text: messageNode.message, at: this.timestamp() });
        this.trace(state, node.id, "message_output", { text: messageNode.message });
        if (messageNode.quickReplies?.length) {
          messages.push({ type: "choices", choices: messageNode.quickReplies });
        }
        this.followEdge(state, this.firstEdge(node.id));
        break;
      }

      if (node.type === "condition") {
        const edge = this.selectEdge(node.id, input, state);
        this.followEdge(state, edge);
        continue;
      }

      if (node.type === "field_collection") {
        messages.push(...this.executeFieldCollection(state, node as FieldCollectionNode));
        break;
      }

      if (node.type === "question") {
        messages.push({ type: "text", text: node.prompt });
        state.transcript.push({ role: "assistant", text: node.prompt, at: this.timestamp() });
        break;
      }

      if (node.type === "rag_answer") {
        const rag = node as RagAnswerNode;
        const text = rag.fallbackMessage ?? "RAG is not implemented in this slice.";
        messages.push({ type: "text", text });
        state.transcript.push({ role: "assistant", text, at: this.timestamp() });
        this.followEdge(state, this.firstEdge(node.id));
        continue;
      }

      if (node.type === "ai_response") {
        const text = "AI response generation is not implemented in this slice.";
        messages.push({ type: "text", text });
        state.transcript.push({ role: "assistant", text, at: this.timestamp() });
        this.followEdge(state, this.firstEdge(node.id));
        continue;
      }

      if (node.type === "handoff") {
        messages.push({ type: "text", text: node.message });
        state.transcript.push({ role: "assistant", text: node.message, at: this.timestamp() });
        this.followEdge(state, this.firstEdge(node.id));
        continue;
      }

      if (node.type === "end") {
        if (node.message) {
          messages.push({ type: "text", text: node.message });
          state.transcript.push({ role: "assistant", text: node.message, at: this.timestamp() });
        }
        state.ended = true;
        this.trace(state, node.id, "session_ended");
        break;
      }

      throw new Error(`Node type '${node.type}' is valid but not executable in this runtime slice.`);
    }

    if (guard >= 50) {
      throw new Error("Runtime exceeded node execution guard. Check workflow cycles.");
    }

    return messages;
  }

  private executeFieldCollection(state: RuntimeSessionState, node: FieldCollectionNode): RuntimeMessage[] {
    const nextField = node.fields.find((field) => state.collectedFields[field.key] === undefined);
    if (!nextField) {
      const messages: RuntimeMessage[] = [];
      if (node.completionMessage) {
        messages.push({ type: "text", text: node.completionMessage });
        state.transcript.push({ role: "assistant", text: node.completionMessage, at: this.timestamp() });
      }
      state.pendingField = undefined;
      this.followEdge(state, this.firstEdge(node.id));
      messages.push(...this.drainAutoNodes(state, {}));
      return messages;
    }

    state.pendingField = { nodeId: node.id, fieldKey: nextField.key };
    const prompt = nextField.prompt ?? nextField.label;
    state.transcript.push({ role: "assistant", text: prompt, at: this.timestamp() });
    return [{ type: "text", text: prompt }];
  }

  private capturePendingField(state: RuntimeSessionState, input: RuntimeInput) {
    if (!state.pendingField) return;
    const value = input.text ?? input.choiceId ?? "";
    state.collectedFields[state.pendingField.fieldKey] = value;
    state.variables[state.pendingField.fieldKey] = value;
    this.trace(state, state.pendingField.nodeId, "variable_set", {
      key: state.pendingField.fieldKey,
      value
    });
  }

  private selectEdge(nodeId: string, input: RuntimeInput, state: RuntimeSessionState): WorkflowEdge {
    const edges = this.outgoing.get(nodeId) ?? [];
    const matching = edges.find((edge) => !edge.fallback && this.evaluator.evaluate(edge.condition, input, state));
    return matching ?? edges.find((edge) => edge.fallback) ?? this.firstEdge(nodeId);
  }

  private firstEdge(nodeId: string): WorkflowEdge {
    const edge = this.outgoing.get(nodeId)?.[0];
    if (!edge) throw new Error(`Node '${nodeId}' has no outgoing edge.`);
    return edge;
  }

  private followEdge(state: RuntimeSessionState, edge: WorkflowEdge) {
    this.trace(state, edge.source, "edge_followed", { edgeId: edge.id, target: edge.target });
    state.currentNodeId = edge.target;
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
      sourceEdges.sort((left, right) => (left.priority ?? 9999) - (right.priority ?? 9999));
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
