import { describe, expect, it } from "vitest";
import {
  analyzeBusinessInterview,
  REDACTED_SECRET,
  validateBusinessInterviewInput,
  validateBusinessUnderstanding,
  type BusinessInterviewInput
} from "../src/index.js";

const clinicInput: BusinessInterviewInput = {
  businessDescription:
    "Business name: Bright Dental Clinic. A clinic that offers dental checkups, emergency appointments, and teeth cleaning for families.",
  targetBotGoal: "Answer common questions and collect appointment requests.",
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
      answer: "Yes, emergency appointment requests can be collected for staff follow-up."
    }
  ],
  constraints: ["Do not provide medical diagnosis.", "Escalate severe pain to staff."],
  preferredLanguage: "en",
  businessCategoryHint: "clinic"
};

describe("BusinessUnderstanding analyzer", () => {
  it("produces a valid BusinessUnderstanding from direct interview input", () => {
    const understanding = analyzeBusinessInterview(clinicInput);

    expect(understanding.id).toMatch(/^bu_/);
    expect(understanding.businessName).toBe("Bright Dental Clinic");
    expect(understanding.category).toBe("clinic");
    expect(understanding.sources).toHaveLength(1);
    expect(understanding.createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(validateBusinessUnderstanding(understanding)).toEqual({ valid: true, issues: [] });
  });

  it("returns missing questions when targetBotGoal is absent", () => {
    const understanding = analyzeBusinessInterview({
      businessDescription: "Business name: Quiet Clinic. A clinic for routine appointments.",
      knownServices: ["Routine checkup"]
    });

    expect(understanding.missingQuestions).toContainEqual(
      expect.objectContaining({ id: "missing_bot_goal", category: "bot_goal", blocksWorkflow: true })
    );
    expect(understanding.unknowns).toContainEqual(expect.objectContaining({ id: "unknown_target_bot_goal" }));
  });

  it("structures known services and required fields", () => {
    const understanding = analyzeBusinessInterview(clinicInput);

    expect(understanding.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "service_dental_checkup",
          name: "Dental checkup",
          requiredFields: ["name", "phone", "preferred date"],
          sourceRefs: ["source_business_interview"],
          confidence: 0.9
        })
      ])
    );
    expect(understanding.forms[0]?.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "phone", type: "phone", required: true })])
    );
  });

  it("structures known FAQs without inventing new ones", () => {
    const understanding = analyzeBusinessInterview(clinicInput);

    expect(understanding.faqs).toHaveLength(1);
    expect(understanding.faqs[0]).toEqual(
      expect.objectContaining({
        id: "faq_1",
        question: "Do you accept emergency appointments?",
        answer: expect.stringContaining("staff follow-up")
      })
    );
  });

  it("maps constraints into policies", () => {
    const understanding = analyzeBusinessInterview(clinicInput);

    expect(understanding.policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "policy_1",
          description: "Do not provide medical diagnosis."
        })
      ])
    );
  });

  it("creates a booking scenario from appointment goals", () => {
    const understanding = analyzeBusinessInterview(clinicInput);

    expect(understanding.scenarios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "scenario_booking_or_reservation",
          name: "booking_or_reservation",
          requiredFields: expect.arrayContaining(["name", "phone"])
        })
      ])
    );
  });

  it("keeps assumptions, unknowns, conflicts, and confidence explicit", () => {
    const understanding = analyzeBusinessInterview({
      businessDescription: "A restaurant that offers dine-in meals.",
      targetBotGoal: "Answer questions."
    });

    expect(understanding.assumptions.length).toBeGreaterThan(0);
    expect(understanding.unknowns).toEqual(expect.arrayContaining([expect.objectContaining({ field: "businessName" })]));
    expect(Array.isArray(understanding.conflicts)).toBe(true);
    expect(understanding.confidence).toBeGreaterThanOrEqual(0);
    expect(understanding.confidence).toBeLessThanOrEqual(1);
  });

  it("detects an obvious deterministic conflict", () => {
    const understanding = analyzeBusinessInterview({
      businessDescription: "Business name: Booking Test Clinic. A clinic for consultations.",
      targetBotGoal: "Book appointments.",
      knownServices: ["Consultation"],
      constraints: ["No appointments are accepted through the bot."]
    });

    expect(understanding.conflicts).toContainEqual(
      expect.objectContaining({ id: "conflict_booking_goal_vs_constraint", resolutionStatus: "unresolved" })
    );
  });

  it("does not generate Workflow JSON accidentally", () => {
    const understanding = analyzeBusinessInterview(clinicInput) as Record<string, unknown>;

    expect(understanding.workflowId).toBeUndefined();
    expect(understanding.nodes).toBeUndefined();
    expect(understanding.edges).toBeUndefined();
  });

  it("does not require OpenAI, Gemini, provider keys, or network configuration", () => {
    const understanding = analyzeBusinessInterview(clinicInput);
    const serialized = JSON.stringify(understanding).toLowerCase();

    expect(serialized).not.toContain("openai");
    expect(serialized).not.toContain("gemini");
    expect(serialized).not.toContain("api_key");
    expect(serialized).not.toContain("apikey");
  });

  it("handles Arabic interview text without breaking deterministic analysis", () => {
    const understanding = analyzeBusinessInterview({
      businessDescription: "عيادة أسنان تقدم مواعيد وفحوصات دورية للمرضى.",
      targetBotGoal: "استقبال طلبات المواعيد والإجابة عن الأسئلة الشائعة.",
      preferredLanguage: "ar"
    });

    expect(understanding.sources[0]?.sourceType).toBe("business_interview");
    expect(understanding.missingQuestions.length).toBeGreaterThan(0);
    expect(validateBusinessUnderstanding(understanding).valid).toBe(true);
  });

  it("redacts obvious secret-like input and does not copy raw secrets into output", () => {
    const understanding = analyzeBusinessInterview({
      businessDescription: "Business name: Secure Clinic. api_key=sk-test-secret-value should not be stored.",
      targetBotGoal: "Answer questions.",
      knownServices: ["Consultation"]
    });
    const serialized = JSON.stringify(understanding);

    expect(serialized).toContain(REDACTED_SECRET);
    expect(serialized).not.toContain("sk-test-secret-value");
    expect(understanding.unknowns).toContainEqual(expect.objectContaining({ id: "unknown_secret_redaction" }));
  });

  it("does not include private chain-of-thought fields", () => {
    const understanding = analyzeBusinessInterview(clinicInput) as Record<string, unknown>;
    const serialized = JSON.stringify(understanding).toLowerCase();

    expect(understanding).not.toHaveProperty("chainOfThought");
    expect(understanding).not.toHaveProperty("reasoning");
    expect(serialized).not.toContain("chain_of_thought");
    expect(serialized).not.toContain("private reasoning");
  });
});

describe("BusinessUnderstanding validation", () => {
  it("catches empty businessDescription", () => {
    expect(validateBusinessInterviewInput({ businessDescription: " " })).toEqual({
      valid: false,
      issues: [{ path: "businessDescription", message: "businessDescription must be a non-empty string." }]
    });
  });

  it("catches invalid confidence", () => {
    const understanding = analyzeBusinessInterview(clinicInput);

    expect(validateBusinessUnderstanding({ ...understanding, confidence: 2 })).toEqual({
      valid: false,
      issues: [{ path: "confidence", message: "confidence must be between 0 and 1." }]
    });
  });

  it("catches workflow-only keys in BusinessUnderstanding output", () => {
    const understanding = analyzeBusinessInterview(clinicInput);
    const result = validateBusinessUnderstanding({ ...understanding, workflowId: "wf_bad" });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: "$.workflowId", message: "workflowId belongs to Workflow JSON and is not allowed here." })
    );
  });

  it("catches invalid preferredLanguage", () => {
    const result = validateBusinessInterviewInput({ businessDescription: "A clinic.", preferredLanguage: "fr" });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: "preferredLanguage", message: "preferredLanguage must be ar, en, or auto." })
    );
  });
});
