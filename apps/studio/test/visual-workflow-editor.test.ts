import { describe, expect, test } from "vitest";
import { buildOwnerFirstPreview } from "../src/index.js";
import {
  applyWorkflowEditorCommand,
  buildWorkflowEditorModel,
  runEditedWorkflowPreview
} from "../src/workflow-editor.js";

const clinicText = [
  "# Bright Dental Clinic",
  "Category: clinic",
  "Goal: book appointments and answer common questions.",
  "",
  "## Services",
  "- Dental checkup: Routine dental examination.",
  "- Teeth whitening: Cosmetic whitening consultation.",
  "",
  "## Required fields",
  "- name",
  "- phone",
  "- preferred date"
].join("\n");

describe("visual workflow editor", () => {
  test("exposes workflow JSON as a visual editor model", () => {
    const preview = buildOwnerFirstPreview({
      filename: "clinic.md",
      mimeType: "text/markdown",
      content: clinicText
    });

    expect(preview.visualWorkflow?.validation.valid).toBe(true);
    expect(preview.visualWorkflow?.nodes.length).toBeGreaterThan(2);
    expect(preview.visualWorkflow?.edges.length).toBeGreaterThan(1);
    expect(preview.visualWorkflow?.nodes[0]).toMatchObject({
      id: "start",
      type: "start",
      x: 80,
      y: 80
    });
  });

  test("edits node text and keeps workflow JSON validator-backed", () => {
    const preview = buildOwnerFirstPreview({
      filename: "clinic.md",
      mimeType: "text/markdown",
      content: clinicText
    });
    const workflow = preview.visualWorkflow?.workflowJson;
    if (!workflow) throw new Error("Expected workflow");

    const messageNode = workflow.nodes.find((node) => node.type === "message");
    if (!messageNode) throw new Error("Expected message node");

    const result = applyWorkflowEditorCommand(workflow, {
      type: "edit_node_text",
      nodeId: messageNode.id,
      text: "Welcome to Bright Dental. How can we help today?"
    });

    expect(result.validation.valid).toBe(true);
    expect(JSON.stringify(result.workflow)).toContain("Welcome to Bright Dental");
  });

  test("adds and connects a review message node", () => {
    const preview = buildOwnerFirstPreview({
      filename: "clinic.md",
      mimeType: "text/markdown",
      content: clinicText
    });
    const workflow = preview.visualWorkflow?.workflowJson;
    if (!workflow) throw new Error("Expected workflow");

    const added = applyWorkflowEditorCommand(workflow, {
      type: "add_message_node",
      nodeId: "owner_review_note",
      sourceNodeId: "start",
      name: "Owner review note",
      message: "This message was added from the visual editor.",
      edgeLabel: "review"
    });

    expect(added.validation.valid).toBe(true);
    expect(added.workflow.nodes.map((node) => node.id)).toContain("owner_review_note");
    expect(added.workflow.edges.some((edge) => edge.source === "start" && edge.target === "owner_review_note")).toBe(true);
  });

  test("deleting a required connected node shows validation errors", () => {
    const preview = buildOwnerFirstPreview({
      filename: "clinic.md",
      mimeType: "text/markdown",
      content: clinicText
    });
    const workflow = preview.visualWorkflow?.workflowJson;
    if (!workflow) throw new Error("Expected workflow");

    const model = buildWorkflowEditorModel(workflow);
    const connectedTarget = model.edges[0]?.target;
    if (!connectedTarget) throw new Error("Expected connected target");

    const deleted = applyWorkflowEditorCommand(workflow, {
      type: "delete_node_only",
      nodeId: connectedTarget
    });

    expect(deleted.validation.valid).toBe(false);
    expect(deleted.validation.issues.map((issue) => issue.message).join("\n")).toContain("does not exist");
  });

  test("runtime and Telegram previews use the edited workflow", () => {
    const preview = buildOwnerFirstPreview({
      filename: "clinic.md",
      mimeType: "text/markdown",
      content: clinicText
    });
    const workflow = preview.visualWorkflow?.workflowJson;
    if (!workflow) throw new Error("Expected workflow");

    const edited = applyWorkflowEditorCommand(workflow, {
      type: "edit_node_text",
      nodeId: "welcome",
      text: "Edited welcome from visual workflow editor."
    });
    const editedPreview = runEditedWorkflowPreview(edited.workflow);

    expect(editedPreview.validation.valid).toBe(true);
    expect(JSON.stringify(editedPreview.runtimeConversation)).toContain("Edited welcome from visual workflow editor.");
    expect(JSON.stringify(editedPreview.telegramPreview)).toContain("Edited welcome from visual workflow editor.");
    expect(JSON.stringify(editedPreview.integrationHub?.flowAiJson.workflow)).toContain("Edited welcome from visual workflow editor.");
  });
});
