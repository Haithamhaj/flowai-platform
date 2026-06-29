import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import {
  formatRuntimeOutputForTelegram,
  mapTelegramUpdateToRuntimeInput,
  normalizeTelegramPreviewMode,
  validateTelegramPreviewConfig
} from "@flowai/channel-adapters";
import { validateWorkflow, type WorkflowDefinition } from "@flowai/workflow-dsl";
import { RuntimeTestService } from "./runtime-test.service.js";
import { TelegramPreviewStore, type TelegramPreviewAdapterRecord } from "./telegram-preview-store.js";

interface TelegramPreviewConnectRequest {
  workflow: WorkflowDefinition;
  mode?: "mock" | "polling";
  tokenSecretRef?: string;
}

interface TelegramPreviewResetRequest {
  chatId: string;
  telegramUserId: string;
}

@Injectable()
export class TelegramPreviewService {
  constructor(
    private readonly runtimeTestService: RuntimeTestService,
    private readonly store = new TelegramPreviewStore()
  ) {}

  connect(request: TelegramPreviewConnectRequest) {
    const mode = normalizeTelegramPreviewMode(request?.mode);
    if (!request || !mode) {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Telegram preview mode must be mock or polling.");
    }

    const configValidation = validateTelegramPreviewConfig(
      { mode, tokenSecretRef: request.tokenSecretRef },
      request,
      { pollingEnabled: false }
    );
    if (!configValidation.valid) {
      throwApiError(
        configValidation.code === "TELEGRAM_TOKEN_REQUIRED" || configValidation.code === "TELEGRAM_POLLING_DISABLED"
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.BAD_REQUEST,
        configValidation.code ?? "INVALID_REQUEST",
        configValidation.message ?? "Telegram preview config is invalid."
      );
    }

    const validation = validateWorkflow(request.workflow);
    if (!validation.valid) {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_WORKFLOW", "Workflow is invalid.", { issues: validation.issues });
    }

    const adapter = this.store.createAdapter({
      workflow: request.workflow,
      workflowId: request.workflow.workflowId,
      mode,
      tokenSecretRef: request.tokenSecretRef
    });

    return {
      adapterId: adapter.adapterId,
      mode: adapter.mode,
      status: "ready",
      workflowId: adapter.workflowId
    };
  }

  update(adapterId: string, telegramUpdate: unknown) {
    const adapter = this.readAdapter(adapterId);
    const mapped = mapTelegramUpdateToRuntimeInput(telegramUpdate);
    if (!mapped.ok) {
      throwApiError(
        HttpStatus.BAD_REQUEST,
        "UNSUPPORTED_TELEGRAM_UPDATE",
        mapped.error.message,
        { reason: mapped.error.reason }
      );
    }

    const existing = this.store.getSession(adapter, mapped.update.chatId, mapped.update.telegramUserId);
    let sessionId = existing?.sessionId;
    let runtimeResponse;

    if (!sessionId) {
      const started = this.runtimeTestService.start(adapter.workflow);
      sessionId = started.sessionId;
      this.store.upsertSession(adapter, mapped.update.chatId, mapped.update.telegramUserId, sessionId);
    }

    try {
      runtimeResponse = this.runtimeTestService.message(sessionId, { message: mapped.update.inputText });
    } catch (error) {
      if (error instanceof HttpException && extractErrorCode(error) === "SESSION_ENDED") {
        throw error;
      }
      throw error;
    }

    return {
      adapterId: adapter.adapterId,
      chatKey: createResponseChatKey(mapped.update.chatId, mapped.update.telegramUserId),
      sessionId,
      telegramMessages: formatRuntimeOutputForTelegram({ output: runtimeResponse.output }),
      stateSummary: runtimeResponse.stateSummary,
      traceDelta: runtimeResponse.traceDelta
    };
  }

  resetSession(adapterId: string, request: TelegramPreviewResetRequest) {
    const adapter = this.readAdapter(adapterId);
    const chatId = readRequiredString(request, "chatId");
    const telegramUserId = readRequiredString(request, "telegramUserId");
    if (!chatId || !telegramUserId) {
      throwApiError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "chatId and telegramUserId are required.");
    }

    const session = this.store.deleteSession(adapter, chatId, telegramUserId);
    if (!session) {
      throwApiError(HttpStatus.NOT_FOUND, "UNKNOWN_TELEGRAM_SESSION", "Telegram preview session was not found.");
    }

    this.runtimeTestService.reset(session.sessionId);
    return {
      status: "reset",
      adapterId: adapter.adapterId,
      chatKey: session.chatKey,
      sessionId: session.sessionId
    };
  }

  trace(adapterId: string, sessionId: string) {
    const adapter = this.readAdapter(adapterId);
    const session = this.store.getSessionByRuntimeId(adapter, sessionId);
    if (!session) {
      throwApiError(HttpStatus.NOT_FOUND, "UNKNOWN_TELEGRAM_SESSION", "Telegram preview session was not found.", { sessionId });
    }

    return {
      adapterId: adapter.adapterId,
      chatKey: session.chatKey,
      ...this.runtimeTestService.trace(sessionId)
    };
  }

  private readAdapter(adapterId: string): TelegramPreviewAdapterRecord {
    const adapter = this.store.getAdapter(adapterId);
    if (!adapter) {
      throwApiError(HttpStatus.NOT_FOUND, "UNKNOWN_TELEGRAM_ADAPTER", "Telegram preview adapter was not found.", { adapterId });
    }
    return adapter;
  }
}

function createResponseChatKey(chatId: string, telegramUserId: string): string {
  return `${chatId}:${telegramUserId}`;
}

function readRequiredString(record: unknown, key: string): string | undefined {
  if (!record || typeof record !== "object" || Array.isArray(record)) return undefined;
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function extractErrorCode(error: HttpException): string | undefined {
  const response = error.getResponse();
  if (!response || typeof response !== "object" || Array.isArray(response)) return undefined;
  const errorBody = (response as Record<string, unknown>).error;
  if (!errorBody || typeof errorBody !== "object" || Array.isArray(errorBody)) return undefined;
  const code = (errorBody as Record<string, unknown>).code;
  return typeof code === "string" ? code : undefined;
}

function throwApiError(status: HttpStatus, code: string, message: string, details?: Record<string, unknown>): never {
  throw new HttpException(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    status
  );
}
