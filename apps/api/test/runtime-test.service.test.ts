import clinicWorkflow from "../../../packages/workflow-dsl/examples/clinic-appointment.workflow.json" with { type: "json" };
import { HttpException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HealthController } from "../src/routes/health.controller.js";
import { RuntimeController } from "../src/routes/runtime.controller.js";
import { WorkflowController } from "../src/routes/workflow.controller.js";
import { RuntimeTestService } from "../src/services/runtime-test.service.js";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";

const externalKeyNames = ["OPENAI_API_KEY", "GEMINI_API_KEY", "QDRANT_URL", "TELEGRAM_BOT_TOKEN", "WHATSAPP_TOKEN"];
const savedExternalKeys = new Map<string, string | undefined>();

let healthController: HealthController;
let workflowController: WorkflowController;
let runtimeController: RuntimeController;
let runtimeService: RuntimeTestService;

beforeAll(() => {
  for (const key of externalKeyNames) {
    savedExternalKeys.set(key, process.env[key]);
    delete process.env[key];
  }

  healthController = new HealthController();
  workflowController = new WorkflowController();
  runtimeService = new RuntimeTestService();
  runtimeController = new RuntimeController(runtimeService);
});

afterAll(() => {
  for (const [key, value] of savedExternalKeys) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("FlowAI API test loop controllers", () => {
  it("GET /health returns deterministic status", () => {
    const response = route(() => healthController.health(), 200);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "flowai-api",
      phase: "greenfield-runtime-slice"
    });
  });

  it("POST /workflows/validate returns valid true for clinic workflow", () => {
    const response = route(() => workflowController.validate(structuredClone(clinicWorkflow) as WorkflowDefinition));
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ valid: true, issues: [] });
  });

  it("POST /workflows/validate returns valid false and issues for invalid workflow", () => {
    const response = route(() => workflowController.validate(invalidWorkflow()));
    expect(response.status).toBe(201);
    expect(response.body.valid).toBe(false);
    expect(response.body.issues.length).toBeGreaterThan(0);
  });

  it("POST /runtime/test/start rejects invalid workflow before runtime", () => {
    const response = route(() => runtimeController.start({ workflow: invalidWorkflow() }));
    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "INVALID_WORKFLOW",
      message: "Workflow is invalid."
    });
    expect(response.body.error.details.issues.length).toBeGreaterThan(0);
  });

  it("POST /runtime/test/start starts a valid workflow and returns session output", () => {
    const response = startSession("api_controller_start");
    expect(response.status).toBe(201);
    expect(response.body.sessionId).toBe("api_controller_start");
    expect(response.body.output.messages[0]).toEqual({ type: "text", text: "Welcome to Small Clinic. How can I help you today?" });
    expect(response.body.stateSummary).toMatchObject({
      workflowId: "wf_clinic_appointment_demo",
      currentNodeId: "route_intent",
      ended: false
    });
    expect(response.body).not.toHaveProperty("state");
    expect(response.body.traceDelta.length).toBeGreaterThan(0);
  });

  it("POST /runtime/test/:sessionId/message sends a message to an existing session", () => {
    startSession("api_controller_message");
    const response = route(() => runtimeController.message("api_controller_message", { message: "book appointment" }));
    expect(response.status).toBe(201);
    expect(response.body.sessionId).toBe("api_controller_message");
    expect(response.body.output.messages[0]).toEqual({ type: "text", text: "What is the patient's full name?" });
    expect(response.body.stateSummary.awaitingInput).toEqual({
      kind: "field_collection",
      nodeId: "collect_appointment",
      fieldKey: "patientName"
    });
  });

  it("unknown runtime message session returns safe 404", () => {
    const response = route(() => runtimeController.message("missing_session", { message: "hello" }));
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "UNKNOWN_SESSION",
      message: "Runtime test session was not found."
    });
    expect(response.body.error.details).toEqual({ sessionId: "missing_session" });
  });

  it("ended session message returns 409 SESSION_ENDED without mutating state", () => {
    startSession("api_controller_ended");
    const ended = route(() => runtimeController.message("api_controller_ended", { message: "faq" }));
    expect(ended.body.stateSummary.ended).toBe(true);
    const traceBefore = route(() => runtimeController.trace("api_controller_ended"), 200);

    const response = route(() => runtimeController.message("api_controller_ended", { message: "another message" }));
    const traceAfter = route(() => runtimeController.trace("api_controller_ended"), 200);

    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({
      code: "SESSION_ENDED",
      message: "Runtime test session has ended.",
      details: { sessionId: "api_controller_ended" }
    });
    expect(traceAfter.body.trace).toEqual(traceBefore.body.trace);
  });

  it("GET /runtime/test/:sessionId/trace returns ordered trace", () => {
    startSession("api_controller_trace");
    route(() => runtimeController.message("api_controller_trace", { message: "book appointment" }));

    const response = route(() => runtimeController.trace("api_controller_trace"), 200);
    expect(response.status).toBe(200);
    expect(response.body.sessionId).toBe("api_controller_trace");
    expect(response.body.workflowId).toBe("wf_clinic_appointment_demo");
    expect(response.body.trace.length).toBeGreaterThan(0);
    expect(response.body.trace.map((event: { at: string }) => event.at)).toEqual(
      [...response.body.trace.map((event: { at: string }) => event.at)].sort()
    );
  });

  it("unknown trace session returns safe 404", () => {
    const response = route(() => runtimeController.trace("missing_trace"), 200);
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "UNKNOWN_SESSION",
      message: "Runtime test session was not found."
    });
  });

  it("malformed message body returns safe 400", () => {
    startSession("api_controller_bad_message");
    const response = route(() => runtimeController.message("api_controller_bad_message", { text: "wrong shape" } as never));
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "Message body must include a string 'message' field."
    });
  });

  it("blank message returns safe 400", () => {
    startSession("api_controller_blank_message");
    const response = route(() => runtimeController.message("api_controller_blank_message", { message: "   " }));
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "Message must not be empty."
    });
  });

  it("does not require external AI, RAG, or channel keys", () => {
    for (const key of externalKeyNames) expect(process.env[key]).toBeUndefined();
    const response = startSession("api_controller_no_keys");
    expect(response.status).toBe(201);
  });

  it("POST /runtime/test/:sessionId/reset deletes only that test session", () => {
    startSession("api_controller_reset");
    const response = route(() => runtimeController.reset("api_controller_reset"));
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ status: "reset", sessionId: "api_controller_reset" });

    const traceAfterReset = route(() => runtimeController.trace("api_controller_reset"), 200);
    expect(traceAfterReset.status).toBe(404);
    expect(traceAfterReset.body.error.code).toBe("UNKNOWN_SESSION");
  });

  it("unknown reset session returns safe 404", () => {
    const response = route(() => runtimeController.reset("missing_reset"));
    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: "UNKNOWN_SESSION",
      message: "Runtime test session was not found."
    });
  });
});

describe("RuntimeTestService", () => {
  it("keeps service-level runtime delegation usable", () => {
    const service = new RuntimeTestService();
    const started = service.start(structuredClone(clinicWorkflow) as WorkflowDefinition, "api_service_1");
    expect(started.sessionId).toBe("api_service_1");
    expect(started.output.messages.length).toBeGreaterThan(0);

    const response = service.message("api_service_1", { message: "faq" });
    expect(response.stateSummary.ended).toBe(true);
    expect(service.trace("api_service_1").trace.length).toBeGreaterThan(0);
  });
});

function startSession(sessionId: string) {
  return route(() =>
    runtimeController.start({
      sessionId,
      workflow: structuredClone(clinicWorkflow) as WorkflowDefinition
    })
  );
}

function invalidWorkflow(): WorkflowDefinition {
  const workflow = structuredClone(clinicWorkflow) as WorkflowDefinition;
  workflow.nodes = workflow.nodes.filter((node) => node.type !== "start");
  return workflow;
}

function route(handler: () => unknown, successStatus = 201) {
  try {
    return {
      status: successStatus,
      body: handler()
    };
  } catch (error) {
    if (error instanceof HttpException) {
      return {
        status: error.getStatus(),
        body: error.getResponse()
      };
    }
    throw error;
  }
}
