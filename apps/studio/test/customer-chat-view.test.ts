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
    expect(html).toContain('id="openWorkflowEditor"');
    expect(html).toContain('id="customerWorkflowEditor"');
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
