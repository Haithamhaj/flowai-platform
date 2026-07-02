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

    expect(html).toContain("تمام، فهمت الاتجاه");
    expect(html).toContain("سؤالي التالي");
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
    expect(html).toContain("ما فهمته من الخدمات/المنتجات");
  });

  test("renders AI missing questions instead of only technical generation blockers", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("missingQuestions");
    expect(html).toContain("combinedMissing");
  });

  test("does not crawl a stale link field when the user sends a text-only message", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("const turn = await runCustomerAgent(text);");
    expect(html).toContain('turn.action === "crawl_url"');
    expect(html).not.toContain("const url = link.value.trim() || firstUrl(text);");
    expect(html).toContain("sourceUrl: source.sourceUrl");
    expect(html).not.toContain("sourceUrl: link.value.trim() || undefined");
  });

  test("keeps assistant result conversational with one clear next question", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("nextQuestion");
    expect(html).toContain("سؤالي التالي");
    expect(html).toContain("slice(0, 4)");
  });

  test("handles greetings and small talk without running the build pipeline", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("isSmallTalkOnly");
    expect(html).toContain("renderSmallTalkReply");
    expect(html).toContain("أهلًا، تمام الحمد لله");
    expect(html).toContain('fetch("/api/customer-chat"');
  });

  test("keeps a lightweight owner decision memory for agent and build calls", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain("ownerDecisionLog");
    expect(html).toContain("rememberOwnerDecision(text)");
    expect(html).toContain("ownerContext: buildOwnerContext()");
    expect(html).not.toContain("قراراتك في المحادثة");
  });

  test("uses the existing pipeline endpoints without adding server upload behavior", () => {
    const html = renderCustomerChatHtml();

    expect(html).toContain('fetch("/api/build"');
    expect(html).toContain('fetch("/api/customer-chat"');
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
