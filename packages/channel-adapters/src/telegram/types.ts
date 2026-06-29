import type { RuntimeOutput } from "@flowai/runtime-core";

export interface TelegramTextMessageDescriptor {
  type: "text";
  text: string;
  replyMarkup?: TelegramInlineKeyboardDescriptor;
}

export interface TelegramInlineKeyboardDescriptor {
  inline_keyboard: TelegramInlineKeyboardButtonDescriptor[][];
}

export interface TelegramInlineKeyboardButtonDescriptor {
  text: string;
  callback_data: string;
}

export type TelegramMessageDescriptor = TelegramTextMessageDescriptor;

export interface TelegramRuntimeOutputFormatInput {
  output: Pick<RuntimeOutput, "messages"> | { messages: RuntimeOutput["messages"] };
}

export interface TelegramMappedUpdate {
  chatId: string;
  telegramUserId: string;
  messageText?: string;
  callbackData?: string;
  inputText: string;
}

export interface TelegramUnsupportedUpdate {
  reason: "unsupported" | "malformed";
  message: string;
}

export type TelegramUpdateMappingResult =
  | { ok: true; update: TelegramMappedUpdate }
  | { ok: false; error: TelegramUnsupportedUpdate };

export interface TelegramPreviewConfig {
  mode: "mock" | "polling";
  tokenSecretRef?: string;
}

export interface TelegramPreviewConfigValidationResult {
  valid: boolean;
  code?: "INVALID_REQUEST" | "TELEGRAM_TOKEN_REQUIRED" | "TELEGRAM_POLLING_DISABLED";
  message?: string;
}

