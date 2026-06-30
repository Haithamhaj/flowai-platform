import { analyzeBusinessInterview, type BusinessUnderstanding } from "@flowai/business-understanding";
import { validateWorkflow, type WorkflowDefinition } from "@flowai/workflow-dsl";
import { describe, expect, it } from "vitest";
import { generateWorkflowDraft } from "../src/index.js";

const clinicFaqAnswer = "Yes, appointment requests can be collected for staff follow-up.";

function clinicUnderstanding(): BusinessUnderstanding {
  return analyzeBusinessInterview({
    businessDescription:
      "Business name: Bright Dental Clinic. A clinic that offers dental checkups, emergency appointments, and teeth cleaning.",
    targetBotGoal: "Book appointments and answer common questions.",
    knownServices: [
      {
        name: "Dental checkup",
        description: "Routine dental examination.",
        requiredFields: ["name", "phone", "preferred date"]
      },
      {
        name: "Emergency appointment",
        description: "Urgent dental consultation request.",
        requiredFields: ["name", "phone", "symptoms"]
      }
    ],
    knownFaqs: [
      {
        question: "Do you accept emergency appointments?",
        answer: clinicFaqAnswer
      }
    ],
    constraints: ["Do not provide medical diagnosis.", "Escalate severe pain to staff."],
    preferredLanguage: "en",
    businessCategoryHint: "clinic"
  });
}

function serviceUnderstanding(): BusinessUnderstanding {
  return analyzeBusinessInterview({
    businessDescription:
      "Business name: FixFast Services. A service company that offers AC repair, plumbing repair, and electrical maintenance.",
    targetBotGoal: "Collect service leads and route requests to the team.",
    knownServices: [
      {
        name: "AC repair",
        description: "Air conditioning repair service.",
        requiredFields: ["name", "phone", "address", "issue description"]
      },
      {
        name: "Plumbing repair",
        description: "Plumbing repair service.",
        requiredFields: ["name", "phone", "address", "issue description"]
      }
    ],
    knownFaqs: [
      {
        question: "Do you handle emergency repairs?",
        answer: "Emergency repair requests are collected for team follow-up."
      }
    ],
    constraints: ["Do not quote final prices before staff review."],
    preferredLanguage: "en",
    businessCategoryHint: "service_company"
  });
}

function clinicWithoutFaqUnderstanding(): BusinessUnderstanding {
  return analyzeBusinessInterview({
    businessDescription: "Business name: No FAQ Clinic. A clinic for appointment requests.",
    targetBotGoal: "Book appointments.",
    knownServices: [
      {
        name: "Consultation",
        description: "General consultation request.",
        requiredFields: ["name", "phone"]
      }
    ],
    constraints: ["Do not provide medical diagnosis."],
    preferredLanguage: "en",
    businessCategoryHint: "clinic"
  });
}

describe("Workflow draft generator", () => {
  it("generates a valid channel-neutral clinic booking workflow draft", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: clinicUnderstanding(),
      templateHint: "clinic_booking",
      targetChannel: "telegram_preview"
    });

    const workflow = expectWorkflow(result.workflow);
    expect(result.generationPlan.selectedTemplate).toBe("clinic_booking");
    expect(result.generationReport.templateUsed).toBe("clinic_booking");
    expect(result.generationReport.validation).toEqual({ valid: true, issues: [] });
    expect(validateWorkflow(workflow)).toEqual({ valid: true, issues: [] });

    expect(workflow.publishStatus).toBe("draft");
    expect(workflow.channels).toEqual({});
    expect(JSON.stringify(workflow).toLowerCase()).not.toContain("telegram");
    expect(JSON.stringify(workflow).toLowerCase()).not.toContain("whatsapp");
    expect(workflow.tests.length).toBeGreaterThanOrEqual(2);
    expect(result.tests).toEqual(workflow.tests);
  });

  it("generates a valid service lead workflow draft from source-backed services and fields", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: serviceUnderstanding(),
      templateHint: "service_lead"
    });

    const workflow = expectWorkflow(result.workflow);
    expect(result.generationPlan.selectedTemplate).toBe("service_lead");
    expect(result.generationReport.validation.valid).toBe(true);
    expect(validateWorkflow(workflow).valid).toBe(true);

    const collectNode = workflow.nodes.find((node) => node.id === "collect_lead");
    expect(collectNode).toEqual(
      expect.objectContaining({
        type: "field_collection",
        fields: expect.arrayContaining([expect.objectContaining({ key: "phone", type: "phone" })])
      })
    );
    expect(workflow.variables).toEqual(expect.arrayContaining([expect.objectContaining({ key: "service_interest", type: "choice" })]));
  });

  it("reports publish blockers while still allowing a non-strict draft", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: clinicUnderstanding(),
      templateHint: "clinic_booking"
    });

    expect(result.workflow).toBeDefined();
    expect(result.generationReport.missingQuestionsBlockingPublish).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "missing_handoff_rules" }),
        expect.objectContaining({ id: "missing_refusal_rules" })
      ])
    );
    expect(result.generationPlan.missingBlockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "missing_handoff_rules" })]));
  });

  it("does not generate a strict workflow when blocking approvals are unresolved", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: clinicUnderstanding(),
      templateHint: "clinic_booking",
      strict: true
    });

    expect(result.workflow).toBeUndefined();
    expect(result.tests).toEqual([]);
    expect(result.generationReport.validation.valid).toBe(false);
    expect(result.generationReport.validation.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: "missing_handoff_rules" })]));
  });

  it("returns a blocking report instead of a workflow when the bot goal is missing", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: analyzeBusinessInterview({
        businessDescription: "Business name: Quiet Clinic. A clinic for routine appointments.",
        knownServices: [{ name: "Consultation", requiredFields: ["name", "phone"] }],
        businessCategoryHint: "clinic"
      }),
      templateHint: "clinic_booking"
    });

    expect(result.workflow).toBeUndefined();
    expect(result.generationReport.validation.valid).toBe(false);
    expect(result.generationPlan.missingBlockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "missing_bot_goal" })]));
  });

  it("blocks unresolved conflicts", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: analyzeBusinessInterview({
        businessDescription: "Business name: Booking Test Clinic. A clinic for consultations.",
        targetBotGoal: "Book appointments.",
        knownServices: [{ name: "Consultation", requiredFields: ["name", "phone"] }],
        constraints: ["No appointments are accepted through the bot."],
        preferredLanguage: "en",
        businessCategoryHint: "clinic"
      }),
      templateHint: "clinic_booking"
    });

    expect(result.workflow).toBeUndefined();
    expect(result.generationReport.validation.valid).toBe(false);
    expect(result.generationReport.validation.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "conflict_booking_goal_vs_constraint" })])
    );
  });

  it("does not invent lead fields when service evidence lacks required fields", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: analyzeBusinessInterview({
        businessDescription: "Business name: Thin Services. A service company that offers maintenance.",
        targetBotGoal: "Collect service leads.",
        knownServices: ["Maintenance"],
        preferredLanguage: "en",
        businessCategoryHint: "service_company"
      }),
      templateHint: "service_lead"
    });

    expect(result.workflow).toBeUndefined();
    expect(result.generationReport.validation.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: "missing_lead_fields" })]));
  });

  it("uses exact known FAQ answers and sends unsupported requests to handoff", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: clinicUnderstanding(),
      templateHint: "clinic_booking"
    });
    const workflow = expectWorkflow(result.workflow);

    expect(workflow.nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "answer_faq", type: "message", message: clinicFaqAnswer })])
    );
    expect(workflow.edges).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "edge_route_unsupported", fallback: true, target: "unsupported" })])
    );
    expect(result.generationReport.capabilitiesUsed).toContain("answer_faq");
  });

  it("does not report answer_faq when no deterministic FAQ node is generated", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: clinicWithoutFaqUnderstanding(),
      templateHint: "clinic_booking"
    });
    const workflow = expectWorkflow(result.workflow);

    expect(workflow.nodes.some((node) => node.id === "answer_faq")).toBe(false);
    expect(result.generationReport.capabilitiesUsed).toEqual(["book_appointments", "handoff_to_human"]);
    expect(result.generationPlan.selectedCapabilities).toEqual(["book_appointments", "handoff_to_human"]);
    expect(result.generationPlan.knowledgeNeeds).toEqual([]);
  });

  it("returns a safe blocking report for malformed BusinessUnderstanding input", () => {
    const malformed = { id: "bu_bad" } as unknown as BusinessUnderstanding;

    expect(() => generateWorkflowDraft({ businessUnderstanding: malformed, templateHint: "service_lead" })).not.toThrow();

    const result = generateWorkflowDraft({ businessUnderstanding: malformed, templateHint: "service_lead" });
    expect(result.workflow).toBeUndefined();
    expect(result.tests).toEqual([]);
    expect(result.generationPlan.businessUnderstandingId).toBe("bu_bad");
    expect(result.generationPlan.selectedTemplate).toBeNull();
    expect(result.generationPlan.missingBlockers.length).toBeGreaterThan(0);
    expect(result.generationReport.validation.valid).toBe(false);
    expect(result.generationReport.validation.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: "businessName" })]));
    expect(result.generationReport.capabilitiesUsed).toEqual([]);
  });

  it("preserves assumptions, source refs, confidence metadata, and generated tests", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: serviceUnderstanding(),
      templateHint: "service_lead"
    });
    const workflow = expectWorkflow(result.workflow);

    expect(workflow.assumptions).toEqual(expect.arrayContaining([expect.stringContaining("channel-neutral")]));
    expect(workflow.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "welcome",
          metadata: expect.objectContaining({ sourceRefs: ["source_business_interview"], confidence: expect.any(Number) })
        })
      ])
    );
    expect(result.generationPlan.nodePlan.length).toBeGreaterThan(0);
    expect(result.generationPlan.edgePlan.length).toBeGreaterThan(0);
    expect(result.generationReport.sourceCoverage).toHaveProperty("source_business_interview");
    expect(result.tests.length).toBeGreaterThan(0);
  });

  it("generates stable missing-field retry test cases for field collection workflows", () => {
    const clinicResult = generateWorkflowDraft({
      businessUnderstanding: clinicUnderstanding(),
      templateHint: "clinic_booking"
    });
    const serviceResult = generateWorkflowDraft({
      businessUnderstanding: serviceUnderstanding(),
      templateHint: "service_lead"
    });

    expect(clinicResult.tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "test_clinic_missing_field_retry",
          name: "Clinic booking missing field retry",
          input: ["book", ""],
          expectedPath: expect.arrayContaining(["collect_appointment"])
        })
      ])
    );
    expect(clinicResult.tests.find((test) => test.id === "test_clinic_missing_field_retry")?.expectedPath).toEqual([
      "start",
      "welcome",
      "route_intent",
      "collect_appointment",
      "collect_appointment"
    ]);

    expect(serviceResult.tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "test_service_missing_field_retry",
          name: "Service lead missing field retry",
          input: ["lead", serviceUnderstanding().services[0]?.id ?? "service", ""],
          expectedPath: expect.arrayContaining(["collect_lead"])
        })
      ])
    );
    expect(serviceResult.tests.find((test) => test.id === "test_service_missing_field_retry")?.expectedPath).toEqual([
      "start",
      "welcome",
      "route_intent",
      "ask_service_interest",
      "collect_lead",
      "collect_lead"
    ]);
  });

  it("declares variables referenced by question and field nodes", () => {
    const workflow = expectWorkflow(
      generateWorkflowDraft({
        businessUnderstanding: serviceUnderstanding(),
        templateHint: "service_lead"
      }).workflow
    );
    const variableKeys = new Set(workflow.variables.map((variable) => variable.key));

    for (const node of workflow.nodes) {
      if (node.type === "question") {
        expect(variableKeys.has(node.variable)).toBe(true);
      }
      if (node.type === "field_collection") {
        for (const field of node.fields) {
          expect(variableKeys.has(field.key)).toBe(true);
        }
      }
    }
  });

  it("uses safe AST conditions and does not emit executable workflow strings", () => {
    const workflow = expectWorkflow(
      generateWorkflowDraft({
        businessUnderstanding: clinicUnderstanding(),
        templateHint: "clinic_booking"
      }).workflow
    );

    for (const edge of workflow.edges) {
      if (edge.condition !== undefined) {
        expect(typeof edge.condition).toBe("object");
        expect(edge.condition).not.toEqual(expect.any(String));
      }
    }
    expect(JSON.stringify(workflow)).not.toMatch(/\b(eval|new Function|=>|require\(|process\.|globalThis|window\.)\b/);
  });

  it("defers unsupported FAQ-only generation instead of creating RAG behavior", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: clinicUnderstanding(),
      templateHint: "faq_support"
    });

    expect(result.workflow).toBeUndefined();
    expect(result.generationPlan.selectedTemplate).toBeNull();
    expect(result.generationReport.validation.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "unsupported_faq_support_template" })])
    );
    expect(JSON.stringify(result).toLowerCase()).not.toContain("rag_answer");
  });

  it("blocks explicit ecommerce_assistant hint instead of inferring service lead", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: serviceUnderstanding(),
      templateHint: "ecommerce_assistant",
      strict: true
    });
    const serializedWorkflow = JSON.stringify(result.workflow ?? {}).toLowerCase();

    expect(result.workflow).toBeUndefined();
    expect(result.tests).toEqual([]);
    expect(result.generationPlan.selectedTemplate).toBeNull();
    expect(result.generationReport.templateUsed).toBeNull();
    expect(result.generationReport.capabilitiesUsed).toEqual([]);
    expect(result.generationReport.validation.valid).toBe(false);
    expect(result.generationReport.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "unsupported_ecommerce_assistant_template",
          message: expect.stringMatching(/ProductCatalog|ecommerce/i)
        })
      ])
    );
    expect(serializedWorkflow).not.toContain("recommend");
    expect(serializedWorkflow).not.toContain("compare");
    expect(serializedWorkflow).not.toContain("price");
    expect(serializedWorkflow).not.toContain("availability");
  });

  it("blocks explicit restaurant_inquiry hint in TASK-005B", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: serviceUnderstanding(),
      templateHint: "restaurant_inquiry",
      strict: true
    });

    expect(result.workflow).toBeUndefined();
    expect(result.tests).toEqual([]);
    expect(result.generationPlan.selectedTemplate).toBeNull();
    expect(result.generationReport.capabilitiesUsed).toEqual([]);
    expect(result.generationReport.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "unsupported_restaurant_inquiry_template",
          message: expect.stringContaining("not implemented in TASK-005B")
        })
      ])
    );
  });

  it("blocks unknown explicit template hints", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: serviceUnderstanding(),
      templateHint: "custom_future_template",
      strict: true
    });

    expect(result.workflow).toBeUndefined();
    expect(result.tests).toEqual([]);
    expect(result.generationPlan.selectedTemplate).toBeNull();
    expect(result.generationReport.capabilitiesUsed).toEqual([]);
    expect(result.generationReport.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "unsupported_template_hint",
          message: expect.stringContaining("Unsupported templateHint")
        })
      ])
    );
  });

  it("still infers a safe supported template when templateHint is absent", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: serviceUnderstanding()
    });

    expect(result.workflow).toBeDefined();
    expect(result.generationPlan.selectedTemplate).toBe("service_lead");
    expect(result.generationReport.templateUsed).toBe("service_lead");
  });

  it("does not include product recommendations, provider keys, raw secrets, or network configuration", () => {
    const result = generateWorkflowDraft({
      businessUnderstanding: analyzeBusinessInterview({
        businessDescription: "Business name: Secure Services. A service company. api_key=sk-test-secret-value",
        targetBotGoal: "Collect service leads.",
        knownServices: [{ name: "Maintenance", requiredFields: ["name", "phone"] }],
        preferredLanguage: "en",
        businessCategoryHint: "service_company"
      }),
      templateHint: "service_lead"
    });

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("recommend");
    expect(serialized).not.toContain("openai");
    expect(serialized).not.toContain("gemini");
    expect(serialized).not.toContain("api_key");
    expect(serialized).not.toContain("apikey");
    expect(serialized).not.toContain("sk-test-secret-value");
    expect(serialized).not.toContain("http://");
    expect(serialized).not.toContain("https://");
  });
});

function expectWorkflow(workflow: WorkflowDefinition | undefined): WorkflowDefinition {
  expect(workflow).toBeDefined();
  const definedWorkflow = workflow as WorkflowDefinition;

  expect(definedWorkflow.nodes.filter((node) => node.type === "start")).toHaveLength(1);
  expect(definedWorkflow.nodes.some((node) => node.type === "end" || node.type === "handoff")).toBe(true);

  return definedWorkflow;
}
