import { describe, expect, test } from "vitest";
import { renderCustomerChatHtml } from "../src/customer-chat-view.js";

describe("customer chat view", () => {
  test("renders a separate customer-facing chat surface", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain('id="customerChatApp"');
    expect(html).toContain('id="customerThread"');
    expect(html).toContain('id="customerMessage"');
    expect(html).toContain('id="customerSend"');
    expect(html).toContain('id="customerFile"');
    expect(html).toContain('id="customerLink"');
    expect(html).toContain("#openWorkflowEditor");
    expect(html).toContain('id="customerWorkflowEditor"');
    expect(html).toContain('id="workflowModal"');
    expect(html).toContain("appendAssistantResult");
    expect(html).toContain("renderWorkflowLinkMessage");
    expect(html).not.toContain('id="customerReview"');
  });

  test("keeps customer output inside the chat instead of rendering technical panels", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("فهمت من المصدر");
    expect(html).toContain("المعلومات الناقصة");
    expect(html).toContain("افتح الشجرة");
    expect(html).not.toContain("<aside");
    expect(html).not.toContain("WorkflowGenerationPlan</h2>");
    expect(html).not.toContain("SourceDocument / sourceRefs</h2>");
    expect(html).not.toContain("Generated WorkflowDefinition</h2>");
  });

  test("renders live AI product catalog items in the chat result path", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("productCatalog");
    expect(html).toContain("catalogItems");
    expect(html).toContain("catalogHtml");
    expect(html).toContain("المنتجات/الباقات التي فهمتها");
  });

  test("renders AI missing questions instead of only technical generation blockers", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("missingQuestions");
    expect(html).toContain("combinedMissing");
  });

  test("uses the existing pipeline endpoints without adding server upload behavior", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain('fetch("/api/build"');
    expect(html).toContain('fetch("/api/crawl-build"');
    expect(html).toContain('fetch("/api/workflow-editor/command"');
    expect(html).toContain("FileReader");
    expect(html).toContain("readAsText");
    expect(html).toContain(".md");
    expect(html).toContain(".txt");
    expect(html).not.toContain("/api/upload");
  });

  test("keeps the browser view free of executable workflow code paths", () => {
    const html = renderCustomerChatHtml();

    expect(html).not.toContain("eval(");
    expect(html).not.toContain("new Function");
  });
});
