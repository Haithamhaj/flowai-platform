import type { RuntimeMessage } from "@flowai/runtime-core";
import type { TelegramMessageDescriptor, TelegramRuntimeOutputFormatInput } from "./types.js";

const CALLBACK_PREFIX = "flowai_choice:";
const MAX_CALLBACK_DATA_BYTES = 64;
type RuntimeChoice = Extract<RuntimeMessage, { type: "choices" }>["choices"][number];

export function formatRuntimeOutputForTelegram(input: TelegramRuntimeOutputFormatInput): TelegramMessageDescriptor[] {
  const descriptors: TelegramMessageDescriptor[] = [];
  let pendingText: TelegramMessageDescriptor | undefined;

  for (const message of input.output.messages) {
    if (message.type === "text") {
      pendingText = { type: "text", text: message.text };
      descriptors.push(pendingText);
      continue;
    }

    if (message.type === "choices") {
      const choiceMessage = formatChoices(message);
      if (pendingText && !pendingText.replyMarkup) {
        pendingText.replyMarkup = choiceMessage.replyMarkup;
      } else {
        descriptors.push(choiceMessage);
      }
      pendingText = undefined;
    }
  }

  return descriptors;
}

export function encodeTelegramChoiceCallback(choice: RuntimeChoice): string {
  const safeValue = choice.value ?? choice.id;
  const normalized = sanitizeCallbackValue(safeValue);
  const callbackData = `${CALLBACK_PREFIX}${normalized}`;
  return truncateUtf8(callbackData, MAX_CALLBACK_DATA_BYTES);
}

export function decodeTelegramChoiceCallback(callbackData: string): string | undefined {
  if (!callbackData.startsWith(CALLBACK_PREFIX)) return undefined;
  const value = callbackData.slice(CALLBACK_PREFIX.length).trim();
  return value || undefined;
}

function formatChoices(message: RuntimeMessage & { type: "choices" }): TelegramMessageDescriptor {
  return {
    type: "text",
    text: "Choose an option:",
    replyMarkup: {
      inline_keyboard: message.choices.map((choice) => [
        {
          text: choice.label,
          callback_data: encodeTelegramChoiceCallback(choice)
        }
      ])
    }
  };
}

function sanitizeCallbackValue(value: string): string {
  return value.replace(/[^\w:.-]/g, "_").slice(0, 40);
}

function truncateUtf8(value: string, maxBytes: number): string {
  while (Buffer.byteLength(value, "utf8") > maxBytes) {
    value = value.slice(0, -1);
  }
  return value;
}
