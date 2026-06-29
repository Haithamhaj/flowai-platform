import { describe, expect, it } from "vitest";
import { decodeTelegramChoiceCallback, formatRuntimeOutputForTelegram } from "../src/index.js";

describe("formatRuntimeOutputForTelegram", () => {
  it("formats text output to a Telegram text descriptor", () => {
    const result = formatRuntimeOutputForTelegram({
      output: {
        messages: [{ type: "text", text: "Hello from FlowAI." }]
      }
    });

    expect(result).toEqual([{ type: "text", text: "Hello from FlowAI." }]);
  });

  it("formats choices as Telegram inline buttons attached to text", () => {
    const result = formatRuntimeOutputForTelegram({
      output: {
        messages: [
          { type: "text", text: "Choose a service." },
          {
            type: "choices",
            choices: [
              { id: "book", label: "Book appointment", value: "book appointment" },
              { id: "faq", label: "FAQ" }
            ]
          }
        ]
      }
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: "text", text: "Choose a service." });
    expect(result[0]?.replyMarkup?.inline_keyboard).toEqual([
      [{ text: "Book appointment", callback_data: "flowai_choice:book_appointment" }],
      [{ text: "FAQ", callback_data: "flowai_choice:faq" }]
    ]);
  });

  it("does not include secret-like raw values in callback data", () => {
    const result = formatRuntimeOutputForTelegram({
      output: {
        messages: [
          {
            type: "choices",
            choices: [{ id: "token=secret value", label: "Unsafe-looking label", value: "token=secret value" }]
          }
        ]
      }
    });

    const callbackData = result[0]?.replyMarkup?.inline_keyboard[0]?.[0]?.callback_data;
    expect(callbackData).toBe("flowai_choice:token_secret_value");
    expect(callbackData).not.toContain("=");
    expect(callbackData).not.toContain(" ");
    expect(Buffer.byteLength(callbackData ?? "", "utf8")).toBeLessThanOrEqual(64);
  });

  it("decodes adapter-owned choice callback data", () => {
    expect(decodeTelegramChoiceCallback("flowai_choice:book")).toBe("book");
    expect(decodeTelegramChoiceCallback("other:book")).toBeUndefined();
  });
});

