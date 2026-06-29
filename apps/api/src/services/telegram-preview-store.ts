import type { WorkflowDefinition } from "@flowai/workflow-dsl";

export interface TelegramPreviewAdapterRecord {
  adapterId: string;
  workflow: WorkflowDefinition;
  workflowId: string;
  mode: "mock" | "polling";
  tokenSecretRef?: string;
  sessions: Map<string, TelegramPreviewSessionRecord>;
}

export interface TelegramPreviewSessionRecord {
  chatKey: string;
  chatId: string;
  telegramUserId: string;
  sessionId: string;
}

export class TelegramPreviewStore {
  private readonly adapters = new Map<string, TelegramPreviewAdapterRecord>();

  createAdapter(input: Omit<TelegramPreviewAdapterRecord, "adapterId" | "sessions">): TelegramPreviewAdapterRecord {
    const adapter: TelegramPreviewAdapterRecord = {
      ...input,
      adapterId: crypto.randomUUID(),
      sessions: new Map()
    };
    this.adapters.set(adapter.adapterId, adapter);
    return adapter;
  }

  getAdapter(adapterId: string): TelegramPreviewAdapterRecord | undefined {
    return this.adapters.get(adapterId);
  }

  upsertSession(adapter: TelegramPreviewAdapterRecord, chatId: string, telegramUserId: string, sessionId: string) {
    const chatKey = createTelegramPreviewChatKey(chatId, telegramUserId);
    const session: TelegramPreviewSessionRecord = { chatKey, chatId, telegramUserId, sessionId };
    adapter.sessions.set(chatKey, session);
    return session;
  }

  getSession(adapter: TelegramPreviewAdapterRecord, chatId: string, telegramUserId: string): TelegramPreviewSessionRecord | undefined {
    return adapter.sessions.get(createTelegramPreviewChatKey(chatId, telegramUserId));
  }

  getSessionByRuntimeId(adapter: TelegramPreviewAdapterRecord, sessionId: string): TelegramPreviewSessionRecord | undefined {
    return [...adapter.sessions.values()].find((session) => session.sessionId === sessionId);
  }

  deleteSession(adapter: TelegramPreviewAdapterRecord, chatId: string, telegramUserId: string): TelegramPreviewSessionRecord | undefined {
    const chatKey = createTelegramPreviewChatKey(chatId, telegramUserId);
    const session = adapter.sessions.get(chatKey);
    adapter.sessions.delete(chatKey);
    return session;
  }
}

export function createTelegramPreviewChatKey(chatId: string, telegramUserId: string): string {
  return `${chatId}:${telegramUserId}`;
}

