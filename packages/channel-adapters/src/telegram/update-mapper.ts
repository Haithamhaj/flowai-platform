import { decodeTelegramChoiceCallback } from "./formatter.js";
import type { TelegramUpdateMappingResult } from "./types.js";

export function mapTelegramUpdateToRuntimeInput(update: unknown): TelegramUpdateMappingResult {
  if (!isRecord(update)) {
    return unsupported("malformed", "Telegram update must be an object.");
  }

  const callbackQuery = update.callback_query;
  if (isRecord(callbackQuery)) {
    return mapCallbackQuery(callbackQuery);
  }

  const message = update.message;
  if (isRecord(message)) {
    return mapTextMessage(message);
  }

  return unsupported("unsupported", "Telegram update type is not supported by preview.");
}

function mapTextMessage(message: Record<string, unknown>): TelegramUpdateMappingResult {
  const chatId = readId(message.chat, "id");
  const telegramUserId = readId(message.from, "id");
  const text = typeof message.text === "string" ? message.text.trim() : "";

  if (!chatId || !telegramUserId || !text) {
    return unsupported("malformed", "Telegram text update must include chat id, user id, and non-empty text.");
  }

  return {
    ok: true,
    update: {
      chatId,
      telegramUserId,
      messageText: text,
      inputText: text
    }
  };
}

function mapCallbackQuery(callbackQuery: Record<string, unknown>): TelegramUpdateMappingResult {
  const message = isRecord(callbackQuery.message) ? callbackQuery.message : undefined;
  const chatId = readId(message?.chat, "id");
  const telegramUserId = readId(callbackQuery.from, "id");
  const callbackData = typeof callbackQuery.data === "string" ? callbackQuery.data.trim() : "";
  const decodedChoice = callbackData ? decodeTelegramChoiceCallback(callbackData) : undefined;
  const inputText = decodedChoice ?? callbackData;

  if (!chatId || !telegramUserId || !callbackData || !inputText) {
    return unsupported("malformed", "Telegram callback update must include chat id, user id, and callback data.");
  }

  return {
    ok: true,
    update: {
      chatId,
      telegramUserId,
      callbackData,
      inputText
    }
  };
}

function readId(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const id = value[key];
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return undefined;
}

function unsupported(reason: "unsupported" | "malformed", message: string): TelegramUpdateMappingResult {
  return { ok: false, error: { reason, message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

