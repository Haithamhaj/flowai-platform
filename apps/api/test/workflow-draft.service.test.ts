import { HttpException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WorkflowDraftController } from "../src/routes/workflow-draft.controller.js";
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

let service: WorkflowDraftService;
let controller: WorkflowDraftController;

beforeAll(() => {
  for (const key of externalKeyNames) {
    savedExternalKeys.set(key, process.env[key]);
    delete process.env[key];
  }

  service = new WorkflowDraftService();
  controller = new WorkflowDraftController(service);
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

describe("Workflow draft API", () => {
  it("POST /workflow-drafts/from-business-understanding returns a valid clinic workflow draft", () => {
    const response = route(() =>
      controller.createFromBusinessUnderstanding({
        businessUnderstanding: clinicUnderstanding(),
        templateHint: "clinic_booking",
        targetChannel: "telegram_preview"
      })
    );

    expect(response.status).toBe(201);
    expectWorkflowReady(response.body);
    expect(response.body.generationPlan.selectedTemplate).toBe("clinic_booking");
    expect(response.body.generationReport.templateUsed).toBe("clinic_booking");
    expect(response.body.tests.length).toBeGreaterThan(0);
    expect(response.body.runtimePreviewHint).toEqual({
      canStartRuntimeTest: true,
      reason: "Workflow draft is valid and can be sent to /runtime/test/start."
    });
    expect(response.body).not.toHaveProperty("sessionId");
    expect(response.body).not.toHaveProperty("adapterId");
  });

  it("returns a valid service lead workflow draft", () => {
    const response = route(() =>
      service.createDraft({
        businessUnderstanding: serviceUnderstanding(),
        templateHint: "service_lead"
      })
    );

    expect(response.status).toBe(201);
    expectWorkflowReady(response.body);
    expect(response.body.generationPlan.selectedTemplate).toBe("service_lead");
    expect(response.body.generationReport.templateUsed).toBe("service_lead");
  });

  it("returns a safe report for invalid BusinessUnderstanding content", () => {
    const response = route(() =>
      service.createDraft({
        businessUnderstanding: { id: "bu_bad" },
        templateHint: "service_lead"
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.workflow).toBeNull();
    expect(response.body.tests).toEqual([]);
    expect(response.body.generationPlan.businessUnderstandingId).toBe("bu_bad");
    expect(response.body.generationReport.validation.valid).toBe(false);
    expect(response.body.generationReport.validation.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "businessName" })])
    );
    expect(response.body.runtimePreviewHint.canStartRuntimeTest).toBe(false);
  });

  it("returns workflow null and a blocker report for ecommerce_assistant", () => {
    const response = route(() =>
      service.createDraft({
        businessUnderstanding: serviceUnderstanding(),
        templateHint: "ecommerce_assistant",
        strict: true
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.workflow).toBeNull();
    expect(response.body.tests).toEqual([]);
    expect(response.body.generationPlan.selectedTemplate).toBeNull();
    expect(response.body.generationReport.capabilitiesUsed).toEqual([]);
    expect(response.body.generationReport.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "unsupported_ecommerce_assistant_template",
          message: expect.stringMatching(/ProductCatalog|ecommerce/i)
        })
      ])
    );
    expect(JSON.stringify(response.body).toLowerCase()).not.toMatch(/recommend|compare|price|availability/);
    expect(response.body.runtimePreviewHint.canStartRuntimeTest).toBe(false);
  });

  it("returns workflow null and a blocker report for unknown templateHint", () => {
    const response = route(() =>
      service.createDraft({
        businessUnderstanding: serviceUnderstanding(),
        templateHint: "future_template",
        strict: true
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.workflow).toBeNull();
    expect(response.body.generationReport.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "unsupported_template_hint",
          message: expect.stringContaining("Unsupported templateHint")
        })
      ])
    );
    expect(response.body.runtimePreviewHint).toMatchObject({
      canStartRuntimeTest: false,
      reason: expect.stringContaining("Unsupported template hint")
    });
  });

  it("strict blockers make runtimePreviewHint false", () => {
    const blocked = clinicUnderstanding({
      missingQuestions: [
        {
          id: "missing_handoff_rules",
          question: "Where should handoffs go?",
          reason: "Handoff destination must be confirmed before publishing.",
          blocksWorkflow: true,
          category: "handoff"
        }
      ]
    });

    const response = route(() =>
      service.createDraft({
        businessUnderstanding: blocked,
        templateHint: "clinic_booking"
      })
    );

    expect(response.status).toBe(201);
    expect(response.body.workflow).toBeNull();
    expect(response.body.runtimePreviewHint.canStartRuntimeTest).toBe(false);
    expect(response.body.runtimePreviewHint.reason).toContain("blocked");
  });

  it("does not require provider, RAG, crawler, database, or Telegram keys", () => {
    for (const key of externalKeyNames) expect(process.env[key]).toBeUndefined();

    const response = route(() =>
      service.createDraft({
        businessUnderstanding: serviceUnderstanding(),
        templateHint: "service_lead"
      })
    );

    expect(response.status).toBe(201);
    expectWorkflowReady(response.body);
  });

  it("malformed request bodies return safe 400 errors", () => {
    expect(route(() => service.createDraft(null)).body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "Workflow draft request body must be an object."
    });

    expect(route(() => service.createDraft({})).body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "businessUnderstanding is required."
    });

    expect(route(() => service.createDraft({ businessUnderstanding: clinicUnderstanding(), strict: "yes" })).body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "strict must be a boolean when provided."
    });
  });

  it("rejects raw secret-like request fields without echoing secrets", () => {
    const response = route(() =>
      service.createDraft({
        businessUnderstanding: clinicUnderstanding(),
        templateHint: "clinic_booking",
        apiKey: "sk-test-secret-value"
      })
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "INVALID_REQUEST",
      message: "Provider configuration and secrets are not accepted by this endpoint."
    });
    expect(JSON.stringify(response.body)).not.toContain("sk-test-secret-value");
  });
});

function expectWorkflowReady(body: Record<string, unknown>) {
  expect(body.workflow).not.toBeNull();
  const workflow = body.workflow as WorkflowDefinition;
  expect(validateWorkflow(workflow)).toEqual({ valid: true, issues: [] });
  expect(body.generationReport).toMatchObject({ validation: { valid: true, issues: [] } });
  expect(body.runtimePreviewHint).toMatchObject({ canStartRuntimeTest: true });
}

function clinicUnderstanding(overrides: Record<string, unknown> = {}) {
  return {
    id: "bu_clinic_api_test",
    businessName: "Bright Dental Clinic",
    category: "clinic",
    summary: "Bright Dental Clinic collects appointment requests and answers approved questions.",
    sources: [source()],
    services: [
      {
        id: "service_dental_checkup",
        name: "Dental checkup",
        description: "Routine dental examination.",
        requiredFields: ["name", "phone", "preferred date"],
        sourceRefs: ["source_api_test"],
        confidence: 0.9
      }
    ],
    faqs: [
      {
        id: "faq_1",
        question: "Do you accept emergency appointments?",
        answer: "Emergency appointment requests are collected for staff follow-up.",
        sourceRefs: ["source_api_test"],
        confidence: 0.9
      }
    ],
    policies: [
      {
        id: "policy_1",
        title: "No diagnosis",
        description: "Do not provide medical diagnosis.",
        sourceRefs: ["source_api_test"],
        confidence: 0.82
      }
    ],
    forms: [customerRequestForm(["name", "phone", "preferred date"])],
    scenarios: [
      {
        id: "scenario_booking_or_reservation",
        name: "booking_or_reservation",
        triggerPhrases: ["book", "appointment", "schedule"],
        steps: ["Identify service.", "Collect required fields.", "Hand off to staff."],
        requiredFields: ["name", "phone", "preferred date"],
        handoffRule: "Send appointment requests to staff.",
        sourceRefs: ["source_api_test"],
        confidence: 0.86
      }
    ],
    missingQuestions: [],
    assumptions: [],
    unknowns: [],
    conflicts: [],
    confidence: 0.88,
    createdAt: "1970-01-01T00:00:00.000Z",
    ...overrides
  };
}

function serviceUnderstanding(overrides: Record<string, unknown> = {}) {
  return {
    id: "bu_service_api_test",
    businessName: "FixFast Services",
    category: "service_company",
    summary: "FixFast Services collects service requests for AC repair and plumbing.",
    sources: [source()],
    services: [
      {
        id: "service_ac_repair",
        name: "AC repair",
        description: "Air conditioning repair service.",
        requiredFields: ["name", "phone", "address", "issue description"],
        sourceRefs: ["source_api_test"],
        confidence: 0.9
      }
    ],
    faqs: [],
    policies: [],
    forms: [customerRequestForm(["name", "phone", "address", "issue description"])],
    scenarios: [
      {
        id: "scenario_lead_qualification",
        name: "lead_qualification",
        triggerPhrases: ["lead", "quote", "interested"],
        steps: ["Understand customer interest.", "Collect fields.", "Send to staff."],
        requiredFields: ["name", "phone", "address", "issue description"],
        handoffRule: "Send service leads to staff.",
        sourceRefs: ["source_api_test"],
        confidence: 0.84
      }
    ],
    missingQuestions: [],
    assumptions: [],
    unknowns: [],
    conflicts: [],
    confidence: 0.87,
    createdAt: "1970-01-01T00:00:00.000Z",
    ...overrides
  };
}

function source() {
  return {
    sourceId: "source_api_test",
    sourceType: "business_interview",
    label: "API test source",
    confidence: 0.9
  };
}

function customerRequestForm(fields: string[]) {
  return {
    id: "form_customer_request",
    name: "Customer request",
    fields: fields.map((field) => ({
      key: normalizeId(field),
      label: field,
      type: field.includes("phone") ? "phone" : field.includes("date") ? "date" : "text",
      required: true
    })),
    sourceRefs: ["source_api_test"],
    confidence: 0.78
  };
}

function normalizeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function route(handler: () => unknown, successStatus = 201) {
  try {
    return {
      status: successStatus,
      body: handler() as Record<string, unknown>
    };
  } catch (error) {
    if (error instanceof HttpException) {
      return {
        status: error.getStatus(),
        body: error.getResponse() as Record<string, unknown>
      };
    }
    throw error;
  }
}
