import clinicWorkflow from "../examples/clinic-appointment.workflow.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { validateWorkflow, type WorkflowDefinition } from "../src/index.js";

function cloneWorkflow(): WorkflowDefinition {
  return structuredClone(clinicWorkflow) as WorkflowDefinition;
}

describe("validateWorkflow", () => {
  it("validates the clinic example", () => {
    const result = validateWorkflow(cloneWorkflow());
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("rejects missing start", () => {
    const workflow = cloneWorkflow();
    workflow.nodes = workflow.nodes.filter((node) => node.type !== "start");
    const result = validateWorkflow(workflow);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.message).join("\n")).toContain("exactly one start node");
  });

  it("rejects invalid edge", () => {
    const workflow = cloneWorkflow();
    workflow.edges[0] = { ...workflow.edges[0], target: "missing_node" };
    const result = validateWorkflow(workflow);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.message).toContain("does not exist");
  });

  it("rejects duplicate node id", () => {
    const workflow = cloneWorkflow();
    workflow.nodes.push({ ...workflow.nodes[0] });
    const result = validateWorkflow(workflow);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.message).join("\n")).toContain("duplicate node id");
  });

  it("rejects JavaScript-like condition strings", () => {
    const workflow = cloneWorkflow();
    workflow.edges[2] = { ...workflow.edges[2], condition: "new Function('return true')" as never };
    const result = validateWorkflow(workflow);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.message).join("\n")).toContain("condition must be a safe AST object");
  });

  it("rejects webhook raw URLs and secrets", () => {
    const workflow = cloneWorkflow();
    workflow.nodes.push({
      id: "bad_webhook",
      type: "webhook",
      name: "Bad webhook",
      webhookId: "https://example.com/hook?token=secret"
    });
    workflow.edges.push({ id: "e_bad", source: "done", target: "bad_webhook", priority: 1 });
    const result = validateWorkflow(workflow);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.message).join("\n")).toContain("not a raw URL");
  });

  it("rejects invalid node types", () => {
    const workflow = cloneWorkflow();
    workflow.nodes.push({ id: "bad", type: "javascript" as never, name: "Bad" });
    const result = validateWorkflow(workflow);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.message).join("\n")).toContain("unknown node type");
  });
});

