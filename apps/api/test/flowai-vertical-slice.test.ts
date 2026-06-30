import { HttpException } from "@nestjs/common";
import { afterAll, beforeEach, beforeAll, describe, expect, it } from "vitest";
import { RuntimeController } from "../src/routes/runtime.controller.js";
import { TelegramPreviewController } from "../src/routes/telegram-preview.controller.js";
import { WorkflowDraftController } from "../src/routes/workflow-draft.controller.js";
import { RuntimeTestService } from "../src/services/runtime-test.service.js";
import { TelegramPreviewService } from "../src/services/telegram-preview.service.js";
import { WorkflowDraftService } from "../src/services/workflow-draft.service.js";
import { validateWorkflow, type WorkflowDefinition } from "@flowai/workflow-dsl";

const externalKeyNames = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "QDRANT_URL",
  "TELEGRAM_BOT_TOKEN",
  "WHATSAPP_TOKEN",
  "DATABASE_URL"
];
const savedExternalKeys = new Map<string, string | undefined>();

beforeAll(() => {
  for (const key of externalKeyNames) {
    savedExternalKeys.set(key, process.env[key]);
    delete process.env[key];
  }
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

let harness: VerticalSliceHarness;

beforeEach(() => {
  harness = createHarness();
});

describe("FlowAI vertical slice smoke", () => {
  it("generates a clinic draft, runs it through the runtime loop, and previews it through Telegram mock", () => {
    expectNoExternalKeys();

    const draft = createClinicDraft();
    const workflow = readWorkflow(draft.body);

    expect(draft.status).toBe(201);
    expect(validateWorkflow(workflow)).toEqual({ valid: true, issues: [] });
    expect(draft.body.generationReport.validation).toEqual({ valid: true, issues: [] });
    expect(draft.body.runtimePreviewHint).toEqual({
      canStartRuntimeTest: true,
      reason: "Workflow draft is valid and can be sent to /runtime/test/start."
    });
    expect(draft.body.tests.length).toBeGreaterThan(0);
    expect(draft.body).not.toHaveProperty("sessionId");
    expect(draft.body).not.toHaveProperty("adapterId");
    expect(harness.runtimeService.startCalls).toBe(0);
    expect(harness.telegramService.connectCalls).toBe(0);

    const started = route(() => harness.runtimeController.start({ workflow, sessionId: "vertical_runtime_happy" }));
    expect(started.status).toBe(201);
    expect(started.body.output.messages[0]).toEqual({
      type: "text",
      text: "Welcome to Bright Dental Clinic. How can I help you today?"
    });
    expect(started.body.stateSummary).toMatchObject({
      workflowId: "wf_bu_clinic_vertical_slice",
      currentNodeId: "route_intent",
      ended: false
    });
    expect(harness.runtimeService.startCalls).toBe(1);

    const booking = route(() => harness.runtimeController.message("vertical_runtime_happy", { message: "book appointment" }));
    expect(booking.body.output.messages[0]).toEqual({ type: "text", text: "What is your name?" });
    expect(booking.body.stateSummary.awaitingInput).toEqual({
      kind: "field_collection",
      nodeId: "collect_appointment",
      fieldKey: "name"
    });

    const name = route(() => harness.runtimeController.message("vertical_runtime_happy", { message: "Huda Ali" }));
    expect(name.body.stateSummary.awaitingInput).toMatchObject({ kind: "field_collection", fieldKey: "phone" });

    const phone = route(() => harness.runtimeController.message("vertical_runtime_happy", { message: "+966500000000" }));
    expect(phone.body.stateSummary.awaitingInput).toMatchObject({ kind: "field_collection", fieldKey: "preferred_date" });

    const preferredDate = route(() => harness.runtimeController.message("vertical_runtime_happy", { message: "2026-07-01" }));
    expect(preferredDate.body.stateSummary).toMatchObject({
      currentNodeId: "handoff_staff",
      ended: true
    });
    expect(preferredDate.body.output.messages.map((message: { text?: string }) => message.text)).toEqual(
      expect.arrayContaining([
        "Thanks. I will pass this appointment request to the team.",
        "A staff member should follow up with you."
      ])
    );

    const runtimeTrace = route(() => harness.runtimeController.trace("vertical_runtime_happy"), 200);
    expect(runtimeTrace.status).toBe(200);
    expect(runtimeTrace.body.trace.map((event: { type: string }) => event.type)).toEqual(
      expect.arrayContaining(["field_value_set", "session_ended"])
    );

    const connected = route(() => harness.telegramController.connect({ workflow, mode: "mock" }));
    expect(connected.status).toBe(201);
    expect(connected.body).toMatchObject({
      mode: "mock",
      status: "ready",
      workflowId: "wf_bu_clinic_vertical_slice"
    });
    expect(harness.telegramService.connectCalls).toBe(1);

    const telegramUpdate = sendTelegramText(connected.body.adapterId as string, "chat-happy", "user-happy", "book appointment");
    expect(telegramUpdate.status).toBe(201);
    expect(telegramUpdate.body).toMatchObject({
      adapterId: connected.body.adapterId,
      chatKey: "chat-happy:user-happy"
    });
    expect(telegramUpdate.body.telegramMessages[0]).toEqual({ type: "text", text: "What is your name?" });
    expect(telegramUpdate.body.stateSummary.awaitingInput).toMatchObject({
      kind: "field_collection",
      fieldKey: "name"
    });
    expect(harness.telegramRuntimeService.startCalls).toBe(1);

    const telegramTrace = route(() => harness.telegramController.trace(connected.body.adapterId as string, telegramUpdate.body.sessionId), 200);
    expect(telegramTrace.status).toBe(200);
    expect(telegramTrace.body).toMatchObject({
      adapterId: connected.body.adapterId,
      chatKey: "chat-happy:user-happy",
      sessionId: telegramUpdate.body.sessionId,
      workflowId: "wf_bu_clinic_vertical_slice"
    });
    expect(telegramTrace.body.trace.length).toBeGreaterThan(0);
  });

  it("keeps blocked generation from starting runtime or connecting Telegram", () => {
    const blocked = route(() =>
      harness.workflowDraftController.createFromBusinessUnderstanding({
        businessUnderstanding: clinicUnderstanding(),
        templateHint: "ecommerce_assistant",
        strict: true
      })
    );

    expect(blocked.status).toBe(201);
    expect(blocked.body.workflow).toBeNull();
    expect(blocked.body.tests).toEqual([]);
    expect(blocked.body.runtimePreviewHint.canStartRuntimeTest).toBe(false);
    expect(blocked.body.generationReport.capabilitiesUsed).toEqual([]);
    expect(blocked.body.generationReport.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "unsupported_ecommerce_assistant_template",
          message: expect.stringMatching(/ProductCatalog|ecommerce/i)
        })
      ])
    );
    expect(blocked.body).not.toHaveProperty("sessionId");
    expect(blocked.body).not.toHaveProperty("adapterId");
    expect(harness.runtimeService.startCalls).toBe(0);
    expect(harness.telegramService.connectCalls).toBe(0);
    expect(harness.telegramRuntimeService.startCalls).toBe(0);
  });

  it("keeps Telegram runtime sessions isolated by chat and user while reusing the same pair", () => {
    const workflow = readWorkflow(createClinicDraft().body);
    const connected = route(() => harness.telegramController.connect({ workflow, mode: "mock" }));
    const adapterId = connected.body.adapterId as string;

    const first = sendTelegramText(adapterId, "chat-isolated", "user-a", "book appointment");
    const samePair = sendTelegramText(adapterId, "chat-isolated", "user-a", "Huda Ali");
    const differentUser = sendTelegramText(adapterId, "chat-isolated", "user-b", "book appointment");

    expect(first.status).toBe(201);
    expect(samePair.status).toBe(201);
    expect(differentUser.status).toBe(201);
    expect(samePair.body.sessionId).toBe(first.body.sessionId);
    expect(differentUser.body.sessionId).not.toBe(first.body.sessionId);
    expect(first.body.chatKey).toBe("chat-isolated:user-a");
    expect(differentUser.body.chatKey).toBe("chat-isolated:user-b");
    expect(samePair.body.telegramMessages[0]).toEqual({ type: "text", text: "What phone number should the team use?" });
    expect(harness.telegramRuntimeService.startCalls).toBe(2);
  });

  it("requires no provider, RAG, Telegram token, or database keys for the accepted slice", () => {
    expectNoExternalKeys();

    const workflow = readWorkflow(createClinicDraft().body);
    const runtime = route(() => harness.runtimeController.start({ workflow, sessionId: "vertical_no_keys" }));
    const connected = route(() => harness.telegramController.connect({ workflow, mode: "mock" }));
    const telegramUpdate = sendTelegramText(connected.body.adapterId as string, "chat-no-keys", "user-no-keys", "book appointment");

    expect(runtime.status).toBe(201);
    expect(connected.status).toBe(201);
    expect(telegramUpdate.status).toBe(201);
    expect(telegramUpdate.body.telegramMessages.length).toBeGreaterThan(0);
  });

  it("does not auto-chain workflow draft generation into runtime or Telegram services", () => {
    const draft = createClinicDraft();

    expect(draft.status).toBe(201);
    expect(draft.body.workflow).not.toBeNull();
    expect(draft.body.runtimePreviewHint.canStartRuntimeTest).toBe(true);
    expect(draft.body).not.toHaveProperty("sessionId");
    expect(draft.body).not.toHaveProperty("adapterId");
    expect(harness.runtimeService.startCalls).toBe(0);
    expect(harness.telegramService.connectCalls).toBe(0);
    expect(harness.telegramRuntimeService.startCalls).toBe(0);

    const runtimeTrace = route(() => harness.runtimeController.trace("draft_did_not_start_runtime"), 200);
    const telegramTrace = route(() => harness.telegramController.trace("draft_did_not_create_adapter", "any-session"), 200);

    expect(runtimeTrace.status).toBe(404);
    expect(runtimeTrace.body.error.code).toBe("UNKNOWN_SESSION");
    expect(telegramTrace.status).toBe(404);
    expect(telegramTrace.body.error.code).toBe("UNKNOWN_TELEGRAM_ADAPTER");
  });
});

class CountingRuntimeTestService extends RuntimeTestService {
  startCalls = 0;

  override start(workflow: WorkflowDefinition, sessionId?: string) {
    this.startCalls += 1;
    return super.start(workflow, sessionId);
  }
}

class CountingTelegramPreviewService extends TelegramPreviewService {
  connectCalls = 0;

  override connect(request: Parameters<TelegramPreviewService["connect"]>[0]) {
    this.connectCalls += 1;
    return super.connect(request);
  }
}

interface VerticalSliceHarness {
  workflowDraftController: WorkflowDraftController;
  runtimeController: RuntimeController;
  telegramController: TelegramPreviewController;
  runtimeService: CountingRuntimeTestService;
  telegramRuntimeService: CountingRuntimeTestService;
  telegramService: CountingTelegramPreviewService;
}

function createHarness(): VerticalSliceHarness {
  const workflowDraftController = new WorkflowDraftController(new WorkflowDraftService());
  const runtimeService = new CountingRuntimeTestService();
  const runtimeController = new RuntimeController(runtimeService);
  const telegramRuntimeService = new CountingRuntimeTestService();
  const telegramService = new CountingTelegramPreviewService(telegramRuntimeService);
  const telegramController = new TelegramPreviewController(telegramService);

  return {
    workflowDraftController,
    runtimeController,
    telegramController,
    runtimeService,
    telegramRuntimeService,
    telegramService
  };
}

function createClinicDraft() {
  return route(() =>
    harness.workflowDraftController.createFromBusinessUnderstanding({
      businessUnderstanding: clinicUnderstanding(),
      templateHint: "clinic_booking",
      targetChannel: "telegram_preview"
    })
  );
}

function readWorkflow(body: Record<string, unknown>): WorkflowDefinition {
  expect(body.workflow).not.toBeNull();
  return body.workflow as WorkflowDefinition;
}

function sendTelegramText(adapterId: string, chatId: string, telegramUserId: string, text: string) {
  return route(() =>
    harness.telegramController.update(adapterId, {
      message: {
        chat: { id: chatId },
        from: { id: telegramUserId },
        text
      }
    })
  );
}

function clinicUnderstanding() {
  return {
    id: "bu_clinic_vertical_slice",
    businessName: "Bright Dental Clinic",
    category: "clinic",
    summary: "Bright Dental Clinic collects appointment requests and answers approved questions.",
    sources: [
      {
        sourceId: "source_vertical_slice",
        sourceType: "business_interview",
        label: "TASK-005D vertical slice fixture",
        confidence: 0.92
      }
    ],
    services: [
      {
        id: "service_dental_checkup",
        name: "Dental checkup",
        description: "Routine dental examination.",
        requiredFields: ["name", "phone", "preferred date"],
        sourceRefs: ["source_vertical_slice"],
        confidence: 0.9
      }
    ],
    faqs: [
      {
        id: "faq_emergency",
        question: "Do you accept emergency appointments?",
        answer: "Emergency appointment requests are collected for staff follow-up.",
        sourceRefs: ["source_vertical_slice"],
        confidence: 0.88
      }
    ],
    policies: [
      {
        id: "policy_no_diagnosis",
        title: "No diagnosis",
        description: "Do not provide medical diagnosis.",
        sourceRefs: ["source_vertical_slice"],
        confidence: 0.84
      }
    ],
    forms: [
      {
        id: "form_appointment_request",
        name: "Appointment request",
        fields: [
          { key: "name", label: "name", type: "text", required: true },
          { key: "phone", label: "phone", type: "phone", required: true },
          { key: "preferred_date", label: "preferred date", type: "date", required: true }
        ],
        sourceRefs: ["source_vertical_slice"],
        confidence: 0.86
      }
    ],
    scenarios: [
      {
        id: "scenario_booking_or_reservation",
        name: "booking_or_reservation",
        triggerPhrases: ["book", "appointment", "schedule"],
        steps: ["Identify service.", "Collect required fields.", "Hand off to staff."],
        requiredFields: ["name", "phone", "preferred date"],
        handoffRule: "Send appointment requests to staff.",
        sourceRefs: ["source_vertical_slice"],
        confidence: 0.87
      }
    ],
    missingQuestions: [],
    assumptions: [],
    unknowns: [],
    conflicts: [],
    confidence: 0.9,
    createdAt: "1970-01-01T00:00:00.000Z"
  };
}

function expectNoExternalKeys() {
  for (const key of externalKeyNames) {
    expect(process.env[key]).toBeUndefined();
  }
}

function route(handler: () => unknown, successStatus = 201) {
  try {
    return {
      status: successStatus,
      body: handler() as Record<string, any>
    };
  } catch (error) {
    if (error instanceof HttpException) {
      return {
        status: error.getStatus(),
        body: error.getResponse() as Record<string, any>
      };
    }
    throw error;
  }
}
