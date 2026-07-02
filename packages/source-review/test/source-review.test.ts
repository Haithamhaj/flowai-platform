import { describe, expect, it } from "vitest";
import { validateBusinessUnderstanding } from "@flowai/business-understanding";
import { ingestSourceDocument, type SourceDocument } from "@flowai/source-ingestion";
import { generateWorkflowDraft } from "@flowai/workflow-generator";
import {
  buildBusinessUnderstandingFromFacts,
  extractBusinessFactsDraft,
  reviewSourceDocument
} from "../src/index.js";

describe("source document review and deterministic facts", () => {
  it("reviews a clinic markdown document, extracts source-backed facts, and feeds workflow generation", () => {
    const document = acceptedDocument({
      filename: "bright-dental.md",
      mimeType: "text/markdown",
      content: [
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
        "A: Emergency appointment requests are collected for staff follow-up.",
        "",
        "## Policies",
        "- Do not provide medical diagnosis.",
        "- Cancellation requests should be made 24 hours before the appointment."
      ].join("\n")
    });

    const review = reviewSourceDocument(document, { maxExcerptChars: 120 });
    const facts = extractBusinessFactsDraft(document);
    const understanding = buildBusinessUnderstandingFromFacts(facts);
    const workflowResult = generateWorkflowDraft({
      businessUnderstanding: understanding,
      templateHint: "clinic_booking",
      targetChannel: "telegram_preview",
      strict: true
    });

    expect(review.status).toBe("ready_for_review");
    expect(review.boundedExcerpts.length).toBeGreaterThan(0);
    expect(review.boundedExcerpts.every((excerpt) => excerpt.text.length <= 120)).toBe(true);
    expect(review.sourceRefs).toEqual(expect.arrayContaining(document.sourceRefs));
    expect(facts.businessName).toBe("Bright Dental Clinic");
    expect(facts.category).toBe("clinic");
    expect(facts.services.map((service) => service.name)).toEqual(["Dental checkup", "Teeth whitening"]);
    expect(facts.forms[0]?.fields.map((field) => field.key)).toEqual(["name", "phone", "preferred_date"]);
    expect(facts.faqs[0]).toMatchObject({
      question: "Do you accept emergency appointments?",
      answer: "Emergency appointment requests are collected for staff follow-up."
    });
    expect(validateBusinessUnderstanding(understanding)).toEqual({ valid: true, issues: [] });
    expect(workflowResult.workflow).toBeDefined();
    expect(workflowResult.generationReport.validation).toEqual({ valid: true, issues: [] });
  });

  it("extracts service lead facts from service-company text without pretending FAQ support is implemented", () => {
    const document = acceptedDocument({
      filename: "cleaning-services.txt",
      mimeType: "text/plain",
      content: [
        "Business name: ClearSpace Cleaning",
        "Category: service company",
        "Goal: collect leads for cleaning requests.",
        "Services:",
        "- Office cleaning: Recurring office cleaning.",
        "- Move-out cleaning: Deep cleaning for tenants.",
        "Required fields:",
        "- name",
        "- phone",
        "- location"
      ].join("\n")
    });

    const facts = extractBusinessFactsDraft(document);
    const understanding = buildBusinessUnderstandingFromFacts(facts);
    const workflowResult = generateWorkflowDraft({
      businessUnderstanding: understanding,
      templateHint: "service_lead",
      strict: true
    });

    expect(facts.services.map((service) => service.name)).toEqual(["Office cleaning", "Move-out cleaning"]);
    expect(facts.scenarios.map((scenario) => scenario.name)).toContain("lead_qualification");
    expect(workflowResult.workflow?.workflowId).toBe("wf_bu_src_doc_97569a2410768978");
    expect(workflowResult.generationReport.capabilitiesUsed).toEqual(
      expect.arrayContaining(["collect_leads", "handoff_to_human"])
    );
  });

  it("keeps Arabic text and source refs intact while producing review-ready facts", () => {
    const document = acceptedDocument({
      filename: "arabic-faq.md",
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
        "- phone",
        "",
        "## FAQs",
        "Q: هل تقبلون الحالات الطارئة؟",
        "A: يتم تحويل طلبات الطوارئ إلى الفريق للمتابعة."
      ].join("\n")
    });

    const facts = extractBusinessFactsDraft(document);
    const review = reviewSourceDocument(document);

    expect(facts.language).toBe("ar");
    expect(facts.businessName).toBe("عيادة النور");
    expect(facts.services[0]).toMatchObject({ name: "فحص الأسنان" });
    expect(facts.faqs[0]?.answer).toContain("الطوارئ");
    expect(review.boundedExcerpts.map((excerpt) => excerpt.text).join("\n")).toContain("عيادة النور");
  });

  it("extracts source-backed Arabic website catalog services from crawler-style page headings", () => {
    const document = acceptedDocument({
      filename: "alboshrastore-crawl.md",
      mimeType: "text/markdown",
      content: [
        "# البشرى - نبني اثر لا ينسى",
        "SOURCE_URL: https://alboshrastore.com/",
        "DESCRIPTION: شركة سعودية رسمية لبيع وتنفيذ مشاريع الصدقات تشمل حفر آبار بالقرى الآسيوية وذبح وتوزيع المواشي ووقف مصاحف.",
        "",
        "## Page 2: الذبائح - البشرى - نبني اثر لا ينسى",
        "CATALOG_LINK: الذبائح -> https://alboshrastore.com/slaughter",
        "PRICE_CANDIDATE: ذبيحة تبدأ من 500 ريال",
        "خدمة ذبح وتوزيع المواشي ضمن مشاريع الصدقات.",
        "",
        "## Page 3: الآبار - البشرى - نبني اثر لا ينسى",
        "خدمة حفر آبار في القرى المحتاجة.",
        "",
        "## Page 4: وقف المصاحف - البشرى - نبني اثر لا ينسى",
        "وقف مصاحف للمساجد والمستفيدين."
      ].join("\n")
    });

    const facts = extractBusinessFactsDraft(document);

    expect(facts.language).toBe("ar");
    expect(facts.category).toBe("service_company");
    expect(facts.services.map((service) => service.name)).toEqual([
      "حفر آبار",
      "ذبح وتوزيع المواشي",
      "وقف مصاحف"
    ]);
    expect(facts.services.every((service) => service.sourceRefs.length > 0)).toBe(true);
    expect(facts.services.every((service) => !service.description.includes("price"))).toBe(true);
    expect(facts.services.find((service) => service.name === "ذبح وتوزيع المواشي")?.description).toContain(
      "https://alboshrastore.com/slaughter"
    );
    expect(facts.services.find((service) => service.name === "ذبح وتوزيع المواشي")?.description).toContain("500 ريال");
  });

  it("blocks ecommerce/product recommendation claims without ProductCatalog evidence", () => {
    const document = acceptedDocument({
      filename: "shop.md",
      mimeType: "text/markdown",
      content: [
        "# Gadget Shop",
        "Category: ecommerce",
        "Goal: recommend products and prices.",
        "",
        "## Services",
        "- Product advice: Help customers choose items.",
        "",
        "## Required fields",
        "- name",
        "- phone"
      ].join("\n")
    });

    const facts = extractBusinessFactsDraft(document);
    const understanding = buildBusinessUnderstandingFromFacts(facts);
    const blocked = generateWorkflowDraft({
      businessUnderstanding: understanding,
      templateHint: "ecommerce_assistant",
      strict: true
    });

    expect(facts.blockers.map((blocker) => blocker.id)).toContain("unsupported_ecommerce_recommendations");
    expect(understanding.unknowns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "unknown_product_catalog_required",
          blocksWorkflow: true
        })
      ])
    );
    expect(blocked.workflow).toBeUndefined();
    expect(blocked.generationReport.validation.issues[0]?.path).toBe("unsupported_ecommerce_assistant_template");
  });

  it("summarizes rejected documents without exposing raw source text", () => {
    const rejected = ingestSourceDocument({
      filename: "../secret.pdf",
      mimeType: "application/pdf",
      content: "api_key=sk-live-secret-value"
    });

    expect(rejected.ok).toBe(false);
    const review = reviewSourceDocument(rejected.document);

    expect(review.status).toBe("rejected");
    expect(review.boundedExcerpts).toEqual([]);
    expect(JSON.stringify(review)).not.toContain("sk-live-secret-value");
    expect(review.errors[0]?.code).toBe("INVALID_FILENAME");
  });
});

function acceptedDocument(input: Parameters<typeof ingestSourceDocument>[0]): SourceDocument {
  const result = ingestSourceDocument(input);
  expect(result.ok).toBe(true);
  return result.document;
}
