import clinicWorkflow from "../../../packages/workflow-dsl/examples/clinic-appointment.workflow.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { RuntimeTestService } from "../src/services/runtime-test.service.js";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";

describe("RuntimeTestService", () => {
  it("starts a runtime session and handles a message", () => {
    const service = new RuntimeTestService();
    const started = service.start(structuredClone(clinicWorkflow) as WorkflowDefinition, "api_session_1");
    expect(started.sessionId).toBe("api_session_1");
    expect(started.messages.length).toBeGreaterThan(0);

    const response = service.message("api_session_1", { text: "faq" });
    expect(response.state.ended).toBe(true);
    expect(service.trace("api_session_1").trace.length).toBeGreaterThan(0);
  });
});

