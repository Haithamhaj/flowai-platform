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
    expect(preview.aiMode.note).toContain("orchestrator");
    expect(preview.assistantMessage).toContain("Bright Dental Clinic");
    expect(preview.businessBrief.businessName).toBe("Bright Dental Clinic");
    expect(preview.businessBrief.services.map((service) => service.name)).toContain("Dental checkup");
    expect(preview.sourcePanel.sourceRefs.length).toBeGreaterThan(0);
    expect(preview.workflowProposal.selectedTemplate).toBe("clinic_booking");
    expect(preview.workflowSummary?.valid).toBe(true);
    expect(preview.runtimeConversation.length).toBeGreaterThan(1);
    expect(preview.telegramPreview.length).toBeGreaterThan(0);
    expect(preview.channelPreview.channels.map((channel) => channel.id)).toEqual(["web_chat", "telegram_mock", "whatsapp_mock"]);
    expect(preview.channelPreview.channels[1]?.mockLabel).toBe("Telegram mock preview, not production bot.");
    expect(preview.channelPreview.channels[2]?.mockLabel).toBe("WhatsApp mock preview, not production WhatsApp.");
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

  test("shows a reviewable product catalog workspace for multi-service business input", () => {
    const preview = buildOwnerFirstPreview({
      filename: "catalog.md",
      mimeType: "text/markdown",
      content: [
        "# Noura Home Store",
        "Category: ecommerce",
        "Goal: answer product questions and collect leads.",
        "",
        "## Services",
        "- Sofa cleaning package: Deep sofa cleaning package. Price starts at 250 SAR. Availability is by appointment.",
        "- Curtain installation: Curtain installation service.",
        "",
        "## Required fields",
        "- name",
        "- phone"
      ].join("\n")
    });

    expect(preview.productCatalog.reviewStatus).toBe("review_required");
    expect(preview.productCatalog.items.map((item) => item.name)).toContain("Sofa cleaning package");
    expect(preview.productCatalog.items[0]?.priceConfidence).toBe("source_backed_review_required");
    expect(preview.productCatalog.items[0]?.sourceRefs.length).toBeGreaterThan(0);
    expect(preview.productCatalog.workflowPlan.status).toBe("review_required");
    expect(preview.productCatalog.workflowPlan.warnings).toContain("Some catalog items are missing source-backed prices.");
  });
});
