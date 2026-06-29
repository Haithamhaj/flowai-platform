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

  it("rejects malformed workflow input without throwing", () => {
    const result = validateWorkflow(null);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.message).toContain("workflow must be an object");
  });

  it("rejects missing required node fields", () => {
    const workflow = cloneWorkflow();
    const welcome = workflow.nodes.find((node) => node.id === "welcome");
    if (welcome?.type === "message") {
      welcome.message = "" as never;
    }

    const result = validateWorkflow(workflow);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path).join("\n")).toContain("message");
  });

  it("rejects condition operands that are missing or malformed", () => {
    const workflow = cloneWorkflow();
    workflow.edges[2] = {
      ...workflow.edges[2],
      condition: { op: "equals", left: { var: "missingVariable" } } as never
    };

    const result = validateWorkflow(workflow);
    const messages = result.issues.map((issue) => issue.message).join("\n");
    expect(result.valid).toBe(false);
    expect(messages).toContain("condition variable 'missingVariable' is not declared");
    expect(messages).toContain("condition value is required");
  });

  it("rejects duplicate variable, tool, and knowledge source ids", () => {
    const workflow = cloneWorkflow();
    workflow.variables.push({ ...workflow.variables[0] });
    workflow.tools.push({ ...workflow.tools[0] });
    workflow.knowledgeSources.push({ ...workflow.knowledgeSources[0] });

    const result = validateWorkflow(workflow);
    const messages = result.issues.map((issue) => issue.message).join("\n");
    expect(result.valid).toBe(false);
    expect(messages).toContain("duplicate variable key");
    expect(messages).toContain("duplicate tool id");
    expect(messages).toContain("duplicate knowledge source id");
  });

  it("rejects duplicate outgoing fallback edges and priorities", () => {
    const workflow = cloneWorkflow();
    workflow.edges.push({
      id: "e_route_second_fallback",
      source: "route_intent",
      target: "done",
      priority: 3,
      fallback: true
    });

    const result = validateWorkflow(workflow);
    const messages = result.issues.map((issue) => issue.message).join("\n");
    expect(result.valid).toBe(false);
    expect(messages).toContain("must not have more than one fallback edge");
    expect(messages).toContain("duplicate outgoing priority");
  });

  it("rejects channel secrets and raw URLs", () => {
    const workflow = cloneWorkflow();
    workflow.channels.telegram.settings = {
      tokenSecret: "abc",
      webhookUrl: "https://example.com/telegram"
    };

    const result = validateWorkflow(workflow);
    const messages = result.issues.map((issue) => issue.message).join("\n");
    expect(result.valid).toBe(false);
    expect(messages).toContain("channel settings must not include secrets");
    expect(messages).toContain("channel settings must not include raw URLs");
  });
});
