import clinicWorkflow from "../../workflow-dsl/examples/clinic-appointment.workflow.json" with { type: "json" };
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ConditionEvaluator, WorkflowRuntime, type RuntimeSessionState } from "../src/index.js";
import type { WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowVariable } from "@flowai/workflow-dsl";

function createRuntime(workflow: WorkflowDefinition = structuredClone(clinicWorkflow) as WorkflowDefinition, maxStepsPerTurn?: number) {
  return new WorkflowRuntime({
    workflow,
    maxStepsPerTurn,
    now: () => new Date("2026-06-28T00:00:00.000Z")
  });
}

function textMessages(output: { messages: Array<{ type: string; text?: string }> }): string {
  return output.messages.map((message) => (message.type === "text" ? message.text : "")).join("\n");
}

function workflowWith(overrides: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
  knowledgeSources?: WorkflowDefinition["knowledgeSources"];
}): WorkflowDefinition {
  return {
    version: "0.1",
    workflowId: "wf_runtime_test",
    name: "Runtime Test",
    description: "Runtime test workflow.",
    sourceSummary: {
      businessName: "Runtime Test",
      sources: ["manual"],
      summary: "Runtime test workflow."
    },
    assumptions: [],
    nodes: overrides.nodes,
    edges: overrides.edges,
    variables: overrides.variables ?? [],
    knowledgeSources: overrides.knowledgeSources ?? [],
    tools: [],
    channels: {},
    tests: [],
    publishStatus: "draft",
    createdAt: "2026-06-28T00:00:00.000Z",
    updatedAt: "2026-06-28T00:00:00.000Z"
  };
}

describe("WorkflowRuntime", () => {
  it("starts the clinic workflow and emits the welcome message", () => {
    const output = createRuntime().start("session_1");
    expect(output.messages[0]).toEqual({ type: "text", text: "Welcome to Small Clinic. How can I help you today?" });
    expect(output.messages[1]?.type).toBe("choices");
    expect(output.state.currentNodeId).toBe("route_intent");
    expect(output.state.ended).toBe(false);
  });

  it("prompts, waits, captures a question answer, and advances", () => {
    const workflow = workflowWith({
      nodes: [
        { id: "start", type: "start", name: "Start" },
        { id: "ask_name", type: "question", name: "Ask name", prompt: "What is your name?", variable: "name" },
        { id: "done", type: "end", name: "Done", message: "Thanks." }
      ],
      edges: [
        { id: "e_start_ask", source: "start", target: "ask_name" },
        { id: "e_ask_done", source: "ask_name", target: "done" }
      ],
      variables: [{ key: "name", type: "string" }]
    });

    const runtime = createRuntime(workflow);
    const started = runtime.start("session_question");
    expect(started.messages[0]).toEqual({ type: "text", text: "What is your name?" });
    expect(started.state.awaitingInput).toEqual({ kind: "question", nodeId: "ask_name", variableKey: "name" });

    const answered = runtime.receive(started.state, { text: "Huda" });
    expect(answered.state.variables.name).toBe("Huda");
    expect(answered.state.awaitingInput).toBeUndefined();
    expect(answered.state.ended).toBe(true);
    expect(textMessages(answered)).toContain("Thanks.");
    expect(answered.traceEvents.some((event) => event.type === "variable_set")).toBe(true);
  });

  it("collects required fields one by one", () => {
    const runtime = createRuntime();
    let state: RuntimeSessionState = runtime.start("session_fields").state;
    state = runtime.receive(state, { text: "book" }).state;
    expect(state.awaitingInput).toEqual({ kind: "field_collection", nodeId: "collect_appointment", fieldKey: "patientName" });

    state = runtime.receive(state, { text: "Huda Ali" }).state;
    expect(state.collectedFields.patientName).toBe("Huda Ali");
    expect(state.awaitingInput).toEqual({ kind: "field_collection", nodeId: "collect_appointment", fieldKey: "phone" });

    state = runtime.receive(state, { text: "+966500000000" }).state;
    expect(state.awaitingInput).toEqual({ kind: "field_collection", nodeId: "collect_appointment", fieldKey: "preferredDate" });
  });

  it("ignores optional fields by default in field collection", () => {
    const workflow = workflowWith({
      nodes: [
        { id: "start", type: "start", name: "Start" },
        {
          id: "collect",
          type: "field_collection",
          name: "Collect",
          fields: [
            { key: "requiredName", label: "Name", type: "string", required: true, prompt: "Name?" },
            { key: "optionalNote", label: "Note", type: "string", required: false, prompt: "Note?" }
          ],
          completionMessage: "Collected."
        },
        { id: "done", type: "end", name: "Done", message: "Done." }
      ],
      edges: [
        { id: "e_start_collect", source: "start", target: "collect" },
        { id: "e_collect_done", source: "collect", target: "done" }
      ],
      variables: [
        { key: "requiredName", type: "string", required: true },
        { key: "optionalNote", type: "string" }
      ]
    });

    const runtime = createRuntime(workflow);
    const started = runtime.start("session_optional");
    const output = runtime.receive(started.state, { text: "Huda" });
    expect(output.state.collectedFields.optionalNote).toBeUndefined();
    expect(output.state.ended).toBe(true);
    expect(textMessages(output)).toContain("Collected.");
    expect(textMessages(output)).not.toContain("Note?");
  });

  it("does not store empty field input and re-prompts the same field", () => {
    const runtime = createRuntime();
    let state: RuntimeSessionState = runtime.start("session_empty_field").state;
    state = runtime.receive(state, { text: "book" }).state;
    const output = runtime.receive(state, { text: "   " });

    expect(output.state.collectedFields.patientName).toBeUndefined();
    expect(output.state.awaitingInput).toEqual({ kind: "field_collection", nodeId: "collect_appointment", fieldKey: "patientName" });
    expect(textMessages(output)).toContain("What is the patient's full name?");
  });

  it("treats handoff as a terminal node even when outgoing edges exist", () => {
    const runtime = createRuntime();
    let state: RuntimeSessionState = runtime.start("session_handoff").state;
    state = runtime.receive(state, { text: "staff" }).state;

    expect(state.currentNodeId).toBe("handoff_staff");
    expect(state.ended).toBe(true);
    expect(state.trace.some((event) => event.type === "session_ended" && event.detail?.reason === "handoff")).toBe(true);
  });

  it("treats end as a terminal node", () => {
    const runtime = createRuntime();
    const started = runtime.start("session_end");
    const output = runtime.receive(started.state, { text: "faq" });

    expect(output.state.currentNodeId).toBe("done");
    expect(output.state.ended).toBe(true);
    expect(textMessages(output)).toContain("Thank you. The clinic team will follow up.");
  });

  it("uses fallback deterministically when conditions fail", () => {
    const runtime = createRuntime();
    const started = runtime.start("session_fallback");
    const output = runtime.receive(started.state, { text: "unknown request" });

    expect(output.state.currentNodeId).toBe("handoff_staff");
    expect(output.state.ended).toBe(true);
    expect(output.traceEvents.some((event) => event.type === "fallback_used")).toBe(true);
  });

  it("breaks equal edge priority ties by edge id", () => {
    const workflow = workflowWith({
      nodes: [
        { id: "start", type: "start", name: "Start" },
        { id: "message", type: "message", name: "Message", message: "Choose route." },
        { id: "a_done", type: "end", name: "A", message: "A" },
        { id: "b_done", type: "end", name: "B", message: "B" }
      ],
      edges: [
        { id: "z_edge", source: "start", target: "b_done" },
        { id: "a_edge", source: "start", target: "message" },
        { id: "e_message_done", source: "message", target: "a_done" }
      ]
    });

    const output = createRuntime(workflow).start("session_tie");
    expect(output.state.currentNodeId).toBe("a_done");
    expect(textMessages(output)).toContain("Choose route.");
  });

  it("rejects invalid workflows before execution", () => {
    const invalidWorkflow = structuredClone(clinicWorkflow) as WorkflowDefinition;
    invalidWorkflow.nodes = invalidWorkflow.nodes.filter((node) => node.type !== "start");
    expect(() => createRuntime(invalidWorkflow)).toThrow("Invalid workflow");
  });

  it("returns false for direct malformed condition evaluator calls", () => {
    const runtime = createRuntime();
    const state = runtime.start("session_malformed_condition").state;
    const evaluator = new ConditionEvaluator();
    expect(evaluator.evaluate({ op: "equals", left: { input: "text" } }, { text: "x" }, state)).toBe(false);
    expect(evaluator.evaluate("input.text === 'x'", { text: "x" }, state)).toBe(false);
  });

  it("stops runaway workflows with the loop guard", () => {
    const workflow = workflowWith({
      nodes: [
        { id: "start", type: "start", name: "Start" },
        { id: "loop", type: "condition", name: "Loop" },
        { id: "handoff", type: "handoff", name: "Handoff", message: "Fallback." }
      ],
      edges: [
        { id: "e_start_loop", source: "start", target: "loop" },
        { id: "e_loop_loop", source: "loop", target: "loop", fallback: true }
      ]
    });

    const output = createRuntime(workflow, 5).start("session_loop");
    expect(output.state.ended).toBe(true);
    expect(output.traceEvents.some((event) => event.type === "runtime_error")).toBe(true);
    expect(textMessages(output)).toContain("Runtime error:");
  });

  it("traces normal node entry, message output, edge selection, and session end", () => {
    const runtime = createRuntime();
    const started = runtime.start("session_trace_normal");
    const output = runtime.receive(started.state, { text: "faq" });

    expect(output.state.trace.some((event) => event.type === "node_entered")).toBe(true);
    expect(output.state.trace.some((event) => event.type === "message_output")).toBe(true);
    expect(output.state.trace.some((event) => event.type === "edge_selected")).toBe(true);
    expect(output.state.trace.some((event) => event.type === "session_ended")).toBe(true);
  });

  it("traces condition evaluation and fallback use", () => {
    const runtime = createRuntime();
    const started = runtime.start("session_trace_fallback");
    const output = runtime.receive(started.state, { text: "unknown request" });

    expect(output.traceEvents.some((event) => event.type === "condition_evaluated")).toBe(true);
    expect(output.traceEvents.some((event) => event.type === "fallback_used")).toBe(true);
  });

  it("contains no dynamic code execution patterns in runtime-core code or tests", async () => {
    const files = ["../src/runtime.ts", "../src/condition-evaluator.ts", "./runtime.test.ts"];
    const forbidden = [["new", "Function"].join(" "), ["eval", "("].join("")];

    for (const file of files) {
      const source = await readFile(new URL(file, import.meta.url), "utf8");
      for (const pattern of forbidden) {
        expect(source.includes(pattern), `${file} must not include ${pattern}`).toBe(false);
      }
    }
  });
});
