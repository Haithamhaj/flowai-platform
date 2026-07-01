import { describe, expect, test } from "vitest";
import { buildOwnerFirstPreview } from "../src/index.js";

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
  "- preferred date",
  "",
  "## FAQs",
  "Q: Do you accept emergency appointments?",
  "A: Emergency appointment requests are collected for staff follow-up."
].join("\n");

describe("owner-first builder preview", () => {
  test("builds an owner-facing clinic preview from pasted markdown", () => {
    const preview = buildOwnerFirstPreview({
      filename: "clinic.md",
      mimeType: "text/markdown",
      content: clinicText
    });

    expect(preview.status).toBe("ready");
    expect(preview.aiMode.status).toBe("deterministic_fallback");
    expect(preview.assistantMessage).toContain("Bright Dental Clinic");
    expect(preview.businessBrief.businessName).toBe("Bright Dental Clinic");
    expect(preview.businessBrief.services.map((service) => service.name)).toContain("Dental checkup");
    expect(preview.sourcePanel.sourceRefs.length).toBeGreaterThan(0);
    expect(preview.workflowProposal.selectedTemplate).toBe("clinic_booking");
    expect(preview.workflowSummary?.valid).toBe(true);
    expect(preview.runtimeConversation.length).toBeGreaterThan(1);
    expect(preview.telegramPreview.length).toBeGreaterThan(0);
  });

  test("keeps Arabic business input reviewable", () => {
    const preview = buildOwnerFirstPreview({
      filename: "arabic-clinic.md",
      mimeType: "text/markdown",
      content: [
        "# عيادة النور",
        "Category: clinic",
        "Goal: book appointments.",
        "",
        "## Services",
        "- فحص الأسنان: فحص وتنظيف دوري.",
        "",
        "## Required fields",
        "- name",
        "- phone"
      ].join("\n")
    });

    expect(preview.status).toBe("ready");
    expect(preview.businessBrief.businessName).toBe("عيادة النور");
    expect(preview.businessBrief.language).toBe("ar");
    expect(preview.businessBrief.services[0]?.name).toBe("فحص الأسنان");
    expect(preview.workflowSummary?.valid).toBe(true);
  });

  test("does not expose raw secret-like values in owner preview output", () => {
    const preview = buildOwnerFirstPreview({
      filename: "service.md",
      mimeType: "text/markdown",
      content: [
        "# ClearSpace Cleaning",
        "Category: service company",
        "Goal: collect leads.",
        "OPENAI_API_KEY=sk-test-secret-value",
        "",
        "## Services",
        "- Office cleaning: Recurring office cleaning.",
        "",
        "## Required fields",
        "- name",
        "- phone"
      ].join("\n")
    });

    expect(JSON.stringify(preview)).not.toContain("sk-test-secret-value");
    expect(JSON.stringify(preview)).not.toContain("OPENAI_API_KEY=sk-test-secret-value");
    expect(preview.sourcePanel.warnings.length).toBeGreaterThan(0);
  });
});
