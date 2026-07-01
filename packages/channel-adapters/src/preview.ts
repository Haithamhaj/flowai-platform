import type { RuntimeMessage } from "@flowai/runtime-core";
import { formatRuntimeOutputForTelegram } from "./telegram/index.js";

export type ChannelPreviewId = "web_chat" | "telegram_mock" | "whatsapp_mock";

export interface ChannelPreviewMessage {
  text: string;
  buttons: string[];
}

export interface ChannelPreviewDescriptor {
  id: ChannelPreviewId;
  label: string;
  mockLabel: string;
  messages: ChannelPreviewMessage[];
  constraints: string[];
}

export interface ChannelPreviewWorkspace {
  channels: ChannelPreviewDescriptor[];
  runtimeTrace: string[];
}

export interface ChannelPreviewInput {
  output: {
    messages: RuntimeMessage[];
  };
  trace?: Array<{ nodeId?: string; event?: string; type?: string }>;
}

export function formatRuntimeOutputForChannelPreviews(input: ChannelPreviewInput): ChannelPreviewWorkspace {
  const webMessages = formatWebMessages(input.output.messages);
  const telegramMessages = formatRuntimeOutputForTelegram({ output: input.output }).map((message) => ({
    text: message.text,
    buttons: message.replyMarkup?.inline_keyboard.flatMap((row) => row.map((button) => button.text)) ?? []
  }));
  const whatsappMessages = formatWhatsAppMessages(input.output.messages);

  return {
    channels: [
      {
        id: "web_chat",
        label: "Web chat test",
        mockLabel: "Web chat local preview, not a deployed widget.",
        messages: webMessages,
        constraints: ["Supports the richest local inspection view.", "Visual edits are local until a future persistence/publish task."]
      },
      {
        id: "telegram_mock",
        label: "Telegram mock",
        mockLabel: "Telegram mock preview, not production bot.",
        messages: telegramMessages,
        constraints: ["Inline buttons are mock descriptors only.", "No Telegram polling, webhook, token, or network delivery is active."]
      },
      {
        id: "whatsapp_mock",
        label: "WhatsApp mock",
        mockLabel: "WhatsApp mock preview, not production WhatsApp.",
        messages: whatsappMessages,
        constraints: [
          "Quick replies are shown as WhatsApp-style reply buttons in this mock only.",
          "No WhatsApp Business API, phone number, webhook, token, or template approval is active."
        ]
      }
    ],
    runtimeTrace: (input.trace ?? []).map((entry) => `${entry.nodeId ?? "runtime"}:${entry.event ?? entry.type ?? "event"}`)
  };
}

function formatWebMessages(messages: RuntimeMessage[]): ChannelPreviewMessage[] {
  const output: ChannelPreviewMessage[] = [];
  for (const message of messages) {
    if (message.type === "text") {
      output.push({ text: message.text, buttons: [] });
    } else if (message.type === "choices") {
      const previous = output[output.length - 1];
      const buttons = message.choices.map((choice) => choice.label);
      if (previous) {
        previous.buttons.push(...buttons);
      } else {
        output.push({ text: "Choose an option:", buttons });
      }
    }
  }
  return output;
}

function formatWhatsAppMessages(messages: RuntimeMessage[]): ChannelPreviewMessage[] {
  const output: ChannelPreviewMessage[] = [];
  for (const message of messages) {
    if (message.type === "text") {
      output.push({ text: message.text, buttons: [] });
    } else if (message.type === "choices") {
      const buttons = message.choices.map((choice) => choice.label);
      const previous = output[output.length - 1];
      if (previous && previous.buttons.length === 0) {
        previous.buttons = buttons;
      } else {
        output.push({ text: "Choose an option:", buttons });
      }
    }
  }
  return output;
}
