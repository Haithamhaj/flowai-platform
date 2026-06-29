import { describe, expect, it } from "vitest";
import { mapTelegramUpdateToRuntimeInput } from "../src/index.js";

describe("mapTelegramUpdateToRuntimeInput", () => {
  it("maps Telegram text message updates to runtime input", () => {
    const result = mapTelegramUpdateToRuntimeInput({
      update_id: 1,
      message: {
        chat: { id: 123 },
        from: { id: 456 },
        text: "book appointment"
      }
    });

    expect(result).toEqual({
      ok: true,
      update: {
        chatId: "123",
        telegramUserId: "456",
        messageText: "book appointment",
        inputText: "book appointment"
      }
    });
  });

  it("maps Telegram callback query updates to runtime input", () => {
    const result = mapTelegramUpdateToRuntimeInput({
      update_id: 2,
      callback_query: {
        from: { id: "user-1" },
        message: { chat: { id: "chat-1" } },
        data: "flowai_choice:faq"
      }
    });

    expect(result).toEqual({
      ok: true,
      update: {
        chatId: "chat-1",
        telegramUserId: "user-1",
        callbackData: "flowai_choice:faq",
        inputText: "faq"
      }
    });
  });

  it("handles malformed updates safely", () => {
    const result = mapTelegramUpdateToRuntimeInput({
      message: {
        chat: { id: 123 },
        text: "missing user"
      }
    });

    expect(result).toEqual({
      ok: false,
      error: {
        reason: "malformed",
        message: "Telegram text update must include chat id, user id, and non-empty text."
      }
    });
  });

  it("handles unsupported updates safely", () => {
    const result = mapTelegramUpdateToRuntimeInput({ edited_message: { text: "ignored" } });

    expect(result).toEqual({
      ok: false,
      error: {
        reason: "unsupported",
        message: "Telegram update type is not supported by preview."
      }
    });
  });
});
