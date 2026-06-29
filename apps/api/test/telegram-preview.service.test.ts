import clinicWorkflow from "../../../packages/workflow-dsl/examples/clinic-appointment.workflow.json" with { type: "json" };
import { HttpException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TelegramPreviewController } from "../src/routes/telegram-preview.controller.js";
import { RuntimeTestService } from "../src/services/runtime-test.service.js";
import { TelegramPreviewService } from "../src/services/telegram-preview.service.js";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";

const externalKeyNames = ["OPENAI_API_KEY", "GEMINI_API_KEY", "QDRANT_URL", "TELEGRAM_BOT_TOKEN", "WHATSAPP_TOKEN"];
const savedExternalKeys = new Map<string, string | undefined>();

let controller: TelegramPreviewController;

beforeAll(() => {
  for (const key of externalKeyNames) {
    savedExternalKeys.set(key, process.env[key]);
    delete process.env[key];
  }

  const runtimeService = new RuntimeTestService();
  controller = new TelegramPreviewController(new TelegramPreviewService(runtimeService));
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

describe("Telegram preview API", () => {
  it("connect-preview accepts a valid workflow in mock mode", () => {
    const response = connectPreview();

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      mode: "mock",
      status: "ready",
      workflowId: "wf_clinic_appointment_demo"
    });
    expect(typeof response.body.adapterId).toBe("string");
  });

  it("connect-preview rejects invalid workflow", () => {
    const workflow = structuredClone(clinicWorkflow) as WorkflowDefinition;
    workflow.nodes = workflow.nodes.filter((node) => node.type !== "start");

    const response = route(() => controller.connect({ workflow, mode: "mock" }));

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "INVALID_WORKFLOW",
      message: "Workflow is invalid."
    });
  });

  it("connect-preview rejects raw token fields", () => {
    const response = route(() =>
      controller.connect({
        workflow: structuredClone(clinicWorkflow) as WorkflowDefinition,
        mode: "mock",
        token: "raw-token-value"
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "Raw Telegram tokens are not accepted. Use tokenSecretRef."
    });
  });

  it("connect-preview rejects polling mode without tokenSecretRef", () => {
    const response = route(() =>
      controller.connect({
        workflow: structuredClone(clinicWorkflow) as WorkflowDefinition,
        mode: "polling"
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "TELEGRAM_TOKEN_REQUIRED",
      message: "tokenSecretRef is required for Telegram polling mode."
    });
  });

  it("polling remains disabled even with tokenSecretRef", () => {
    const response = route(() =>
      controller.connect({
        workflow: structuredClone(clinicWorkflow) as WorkflowDefinition,
        mode: "polling",
        tokenSecretRef: "env:TELEGRAM_BOT_TOKEN"
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "TELEGRAM_POLLING_DISABLED",
      message: "Telegram polling is disabled in TASK-004 preview. Use mock mode."
    });
  });

  it("update endpoint creates a runtime session for the first chat update", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const response = sendTelegramText(adapterId, "chat-1", "user-1", "book appointment");

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      adapterId,
      chatKey: "chat-1:user-1"
    });
    expect(typeof response.body.sessionId).toBe("string");
    expect(response.body.telegramMessages[0]).toEqual({
      type: "text",
      text: "What is the patient's full name?"
    });
    expect(response.body.stateSummary.awaitingInput).toMatchObject({
      kind: "field_collection",
      fieldKey: "patientName"
    });
    expect(response.body.traceDelta.length).toBeGreaterThan(0);
  });

  it("second update for same chat reuses the same runtime session", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const first = sendTelegramText(adapterId, "chat-2", "user-1", "book appointment");
    const second = sendTelegramText(adapterId, "chat-2", "user-1", "Huda Ali");

    expect(second.status).toBe(201);
    expect(second.body.sessionId).toBe(first.body.sessionId);
    expect(second.body.telegramMessages[0].text).toBe("What phone number should we use?");
  });

  it("different chat/user gets an isolated runtime session", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const first = sendTelegramText(adapterId, "chat-3", "user-1", "book appointment");
    const second = sendTelegramText(adapterId, "chat-3", "user-2", "book appointment");

    expect(first.body.sessionId).not.toBe(second.body.sessionId);
    expect(first.body.chatKey).toBe("chat-3:user-1");
    expect(second.body.chatKey).toBe("chat-3:user-2");
  });

  it("maps callback query updates through the preview flow", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const response = route(() =>
      controller.update(adapterId, {
        callback_query: {
          from: { id: "user-callback" },
          message: { chat: { id: "chat-callback" } },
          data: "flowai_choice:faq"
        }
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.telegramMessages[0].text).toContain("knowledge base is connected");
    expect(response.body.stateSummary.ended).toBe(true);
  });

  it("reset-session clears mapping and runtime session", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const updated = sendTelegramText(adapterId, "chat-reset", "user-reset", "book appointment");

    const reset = route(() =>
      controller.resetSession(adapterId, {
        chatId: "chat-reset",
        telegramUserId: "user-reset"
      })
    );
    const traceAfterReset = route(() => controller.trace(adapterId, updated.body.sessionId));

    expect(reset.status).toBe(201);
    expect(reset.body).toMatchObject({
      status: "reset",
      adapterId,
      chatKey: "chat-reset:user-reset",
      sessionId: updated.body.sessionId
    });
    expect(traceAfterReset.status).toBe(404);
    expect(traceAfterReset.body.error.code).toBe("UNKNOWN_TELEGRAM_SESSION");
  });

  it("trace endpoint returns trace for a Telegram preview session", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const updated = sendTelegramText(adapterId, "chat-trace", "user-trace", "book appointment");

    const response = route(() => controller.trace(adapterId, updated.body.sessionId), 200);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      adapterId,
      chatKey: "chat-trace:user-trace",
      sessionId: updated.body.sessionId,
      workflowId: "wf_clinic_appointment_demo"
    });
    expect(response.body.trace.length).toBeGreaterThan(0);
  });

  it("unknown adapterId returns safe 404", () => {
    const response = sendTelegramText("missing-adapter", "chat-x", "user-x", "hello");

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "UNKNOWN_TELEGRAM_ADAPTER",
      message: "Telegram preview adapter was not found.",
      details: { adapterId: "missing-adapter" }
    });
  });

  it("unknown session trace returns safe 404", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const response = route(() => controller.trace(adapterId, "missing-session"));

    expect(response.status).toBe(404);
    expect(response.body.error).toEqual({
      code: "UNKNOWN_TELEGRAM_SESSION",
      message: "Telegram preview session was not found.",
      details: { sessionId: "missing-session" }
    });
  });

  it("malformed update returns safe 400", () => {
    const adapterId = connectPreview().body.adapterId as string;
    const response = route(() => controller.update(adapterId, { message: { text: "missing ids" } }));

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "UNSUPPORTED_TELEGRAM_UPDATE",
      message: "Telegram text update must include chat id, user id, and non-empty text.",
      details: { reason: "malformed" }
    });
  });

  it("does not require external AI, RAG, channel, or database keys", () => {
    for (const key of externalKeyNames) expect(process.env[key]).toBeUndefined();
    const adapterId = connectPreview().body.adapterId as string;
    const response = sendTelegramText(adapterId, "chat-no-keys", "user-no-keys", "faq");

    expect(response.status).toBe(201);
    expect(response.body.stateSummary.ended).toBe(true);
  });
});

function connectPreview() {
  return route(() =>
    controller.connect({
      workflow: structuredClone(clinicWorkflow) as WorkflowDefinition,
      mode: "mock"
    })
  );
}

function sendTelegramText(adapterId: string, chatId: string, telegramUserId: string, text: string) {
  return route(() =>
    controller.update(adapterId, {
      message: {
        chat: { id: chatId },
        from: { id: telegramUserId },
        text
      }
    })
  );
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
