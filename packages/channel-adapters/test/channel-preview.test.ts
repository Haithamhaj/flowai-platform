import { describe, expect, test } from "vitest";
import { formatRuntimeOutputForChannelPreviews } from "../src/index.js";

describe("formatRuntimeOutputForChannelPreviews", () => {
  test("builds web, Telegram mock, and WhatsApp mock previews with explicit mock labels", () => {
    const preview = formatRuntimeOutputForChannelPreviews({
      output: {
        messages: [
          { type: "text", text: "Welcome to FlowAI." },
          {
            type: "choices",
            choices: [
              { id: "book", label: "Book appointment", value: "book" },
              { id: "staff", label: "Talk to staff", value: "staff" }
            ]
          }
        ]
      },
      trace: [
        { nodeId: "start", event: "entered" },
        { nodeId: "welcome", event: "message_sent" }
      ]
    });

    expect(preview.channels.map((channel) => channel.id)).toEqual(["web_chat", "telegram_mock", "whatsapp_mock"]);
    expect(preview.channels[0]?.label).toBe("Web chat test");
    expect(preview.channels[1]?.mockLabel).toBe("Telegram mock preview, not production bot.");
    expect(preview.channels[2]?.mockLabel).toBe("WhatsApp mock preview, not production WhatsApp.");
    expect(preview.channels[1]?.messages[0]?.buttons).toEqual(["Book appointment", "Talk to staff"]);
    expect(preview.channels[2]?.constraints).toContain("Quick replies are shown as WhatsApp-style reply buttons in this mock only.");
    expect(preview.runtimeTrace).toEqual(["start:entered", "welcome:message_sent"]);
  });

  test("keeps button values display-only and excludes callback payloads from WhatsApp mock", () => {
    const preview = formatRuntimeOutputForChannelPreviews({
      output: {
        messages: [
          {
            type: "choices",
            choices: [{ id: "token=secret", label: "Unsafe label", value: "token=secret" }]
          }
        ]
      }
    });

    const whatsapp = preview.channels.find((channel) => channel.id === "whatsapp_mock");
    expect(JSON.stringify(whatsapp)).toContain("Unsafe label");
    expect(JSON.stringify(whatsapp)).not.toContain("token=secret");
    expect(JSON.stringify(whatsapp)).not.toContain("callback_data");
  });
});
