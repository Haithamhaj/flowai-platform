import { describe, expect, test } from "vitest";
import {
  buildCrmMappingPlan,
  buildFlowAiExportPackage,
  buildTicketingMappingPlan,
  buildWorkflowIntegrationHub
} from "../src/index.js";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";

const workflow: WorkflowDefinition = {
  version: "1.0.0",
  workflowId: "clinic_booking_demo",
  name: "Clinic Booking Demo",
  description: "Collect appointment requests and route staff handoff.",
  sourceSummary: {
    businessName: "Bright Dental Clinic",
    businessCategory: "clinic",
    sources: ["src_1"],
    summary: "Clinic booking workflow."
  },
  assumptions: ["Staff confirms appointment availability."],
  nodes: [
    { id: "start", type: "start", name: "Start" },
    {
      id: "welcome",
      type: "message",
      name: "Welcome",
      message: "Welcome to Bright Dental Clinic.",
      quickReplies: [{ id: "book", label: "Book appointment", value: "book" }]
    },
    {
      id: "collect_booking",
      type: "field_collection",
      name: "Collect booking details",
      fields: [
        { key: "name", label: "Name", type: "string", required: true },
        { key: "phone", label: "Phone", type: "phone", required: true },
        { key: "preferred_date", label: "Preferred date", type: "date", required: true }
      ],
      completionMessage: "Thanks. Staff will follow up."
    },
    { id: "notify_staff", type: "webhook", name: "Notify staff", webhookId: "future_webhook", inputMapping: { phone: "phone" } },
    { id: "handoff", type: "handoff", name: "Staff handoff", message: "A staff member will help.", queue: "appointments" },
    { id: "end", type: "end", name: "End", message: "Done." }
  ],
  edges: [
    { id: "edge_start_welcome", source: "start", target: "welcome" },
    { id: "edge_welcome_collect", source: "welcome", target: "collect_booking", label: "Book" },
    { id: "edge_collect_notify", source: "collect_booking", target: "notify_staff" },
    { id: "edge_notify_handoff", source: "notify_staff", target: "handoff" },
    { id: "edge_handoff_end", source: "handoff", target: "end" }
  ],
  variables: [
    { key: "name", type: "string", required: true },
    { key: "phone", type: "phone", required: true },
    { key: "preferred_date", type: "date", required: true }
  ],
  knowledgeSources: [],
  tools: [{ id: "staff_crm", type: "crm", name: "Staff CRM" }],
  channels: {
    telegram: { enabled: true, settings: { token: "secret-token", displayName: "Clinic bot" } }
  },
  tests: [],
  publishStatus: "draft",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z"
};

describe("export and integration hub", () => {
  test("builds a deterministic FlowAI JSON export package without secrets", () => {
    const exported = buildFlowAiExportPackage({ workflow });

    expect(exported.format).toBe("flowai.workflow.export.v1");
    expect(exported.workflow.workflowId).toBe("clinic_booking_demo");
    expect(exported.validation.valid).toBe(true);
    expect(exported.warnings).toEqual(expect.arrayContaining([expect.objectContaining({ code: "UNSUPPORTED_WEBHOOK_EXPORT" })]));
    expect(JSON.stringify(exported)).not.toContain("secret-token");
    expect(exported.workflow.channels.telegram?.settings).toEqual({ displayName: "Clinic bot" });
  });

  test("builds CRM and ticketing mapping plans with explicit unsupported fields", () => {
    const crm = buildCrmMappingPlan({ workflow });
    const ticketing = buildTicketingMappingPlan({ workflow });

    expect(crm.target).toBe("crm");
    expect(crm.fieldMappings.map((field) => field.workflowField)).toEqual(["name", "phone", "preferred_date"]);
    expect(crm.fieldMappings[1]).toEqual(expect.objectContaining({ suggestedExternalField: "phone", required: true }));
    expect(crm.unsupported).toEqual(expect.arrayContaining([expect.objectContaining({ nodeId: "notify_staff", reason: "Live webhook export is not configured." })]));

    expect(ticketing.target).toBe("ticketing");
    expect(ticketing.ticketFields).toEqual(expect.arrayContaining([expect.objectContaining({ workflowField: "preferred_date" })]));
    expect(ticketing.routing.queue).toBe("appointments");
    expect(ticketing.unsupported).toEqual(expect.arrayContaining([expect.objectContaining({ nodeId: "notify_staff" })]));
  });

  test("builds the Studio integration hub payload", () => {
    const hub = buildWorkflowIntegrationHub({ workflow });

    expect(hub.flowAiJson.format).toBe("flowai.workflow.export.v1");
    expect(hub.crm.target).toBe("crm");
    expect(hub.ticketing.target).toBe("ticketing");
    expect(hub.copyBlocks.map((block) => block.id)).toEqual(["flowai_json", "crm_mapping", "ticketing_mapping"]);
    expect(hub.summary.unsupportedCount).toBeGreaterThan(0);
  });
});
