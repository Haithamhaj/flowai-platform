import clinicWorkflow from "../../workflow-dsl/examples/clinic-appointment.workflow.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { WorkflowRuntime, type RuntimeSessionState } from "../src/index.js";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";

function createRuntime() {
  return new WorkflowRuntime({
    workflow: structuredClone(clinicWorkflow) as WorkflowDefinition,
    now: () => new Date("2026-06-28T00:00:00.000Z")
  });
}

describe("WorkflowRuntime", () => {
  it("runs clinic workflow from start", () => {
    const output = createRuntime().start("session_1");
    expect(output.messages[0]).toEqual({ type: "text", text: "Welcome to Small Clinic. How can I help you today?" });
    expect(output.messages[1]?.type).toBe("choices");
    expect(output.state.currentNodeId).toBe("route_intent");
    expect(output.traceEvents.length).toBeGreaterThan(0);
  });

  it("routes book appointment to field collection", () => {
    const runtime = createRuntime();
    const started = runtime.start("session_2");
    const output = runtime.receive(started.state, { text: "book appointment" });
    expect(output.state.currentNodeId).toBe("collect_appointment");
    expect(output.messages[0]).toEqual({ type: "text", text: "What is the patient's full name?" });
    expect(output.state.pendingField?.fieldKey).toBe("patientName");
  });

  it("collects fields over turns and reaches handoff/end", () => {
    const runtime = createRuntime();
    let state: RuntimeSessionState = runtime.start("session_3").state;
    state = runtime.receive(state, { text: "book" }).state;
    state = runtime.receive(state, { text: "Huda Ali" }).state;
    state = runtime.receive(state, { text: "+966500000000" }).state;
    state = runtime.receive(state, { text: "2026-07-10" }).state;
    const finalOutput = runtime.receive(state, { text: "Annual checkup" });

    expect(finalOutput.state.collectedFields).toMatchObject({
      patientName: "Huda Ali",
      phone: "+966500000000",
      preferredDate: "2026-07-10",
      reason: "Annual checkup"
    });
    expect(finalOutput.state.ended).toBe(true);
    expect(finalOutput.messages.map((message) => (message.type === "text" ? message.text : "")).join("\n")).toContain("clinic staff");
  });

  it("routes FAQ path to RAG placeholder", () => {
    const runtime = createRuntime();
    const started = runtime.start("session_4");
    const output = runtime.receive(started.state, { text: "faq" });
    const text = output.messages.map((message) => (message.type === "text" ? message.text : "")).join("\n");
    expect(text).toContain("knowledge base is connected");
    expect(output.state.ended).toBe(true);
  });

  it("produces trace events", () => {
    const runtime = createRuntime();
    const started = runtime.start("session_5");
    const output = runtime.receive(started.state, { text: "faq" });
    expect(output.state.trace.some((event) => event.type === "node_entered")).toBe(true);
    expect(output.state.trace.some((event) => event.type === "edge_followed")).toBe(true);
    expect(output.state.trace.some((event) => event.type === "session_ended")).toBe(true);
  });

  it("contains no dynamic code execution in runtime source", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/runtime.ts", import.meta.url), "utf8"));
    expect(source).not.toContain("new Function");
    expect(source).not.toContain("eval(");
  });
});

