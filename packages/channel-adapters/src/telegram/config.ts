import type { TelegramPreviewConfig, TelegramPreviewConfigValidationResult } from "./types.js";

const rawTokenKeys = new Set(["token", "botToken", "bot_token", "telegramToken", "telegram_bot_token"]);

export function validateTelegramPreviewConfig(
  config: TelegramPreviewConfig,
  requestBody: unknown,
  options: { pollingEnabled?: boolean } = {}
): TelegramPreviewConfigValidationResult {
  if (containsRawTokenField(requestBody)) {
    return {
      valid: false,
      code: "INVALID_REQUEST",
      message: "Raw Telegram tokens are not accepted. Use tokenSecretRef."
    };
  }

  if (config.mode === "polling" && !config.tokenSecretRef) {
    return {
      valid: false,
      code: "TELEGRAM_TOKEN_REQUIRED",
      message: "tokenSecretRef is required for Telegram polling mode."
    };
  }

  if (config.tokenSecretRef && !isEnvSecretRef(config.tokenSecretRef)) {
    return {
      valid: false,
      code: "INVALID_REQUEST",
      message: "tokenSecretRef must use the env:VARIABLE_NAME format."
    };
  }

  if (config.mode === "polling" && !options.pollingEnabled) {
    return {
      valid: false,
      code: "TELEGRAM_POLLING_DISABLED",
      message: "Telegram polling is disabled in TASK-004 preview. Use mock mode."
    };
  }

  return { valid: true };
}

export function normalizeTelegramPreviewMode(mode: unknown): "mock" | "polling" | undefined {
  if (mode === undefined) return "mock";
  if (mode === "mock" || mode === "polling") return mode;
  return undefined;
}

export function isEnvSecretRef(value: string): boolean {
  return /^env:[A-Z_][A-Z0-9_]*$/.test(value);
}

function containsRawTokenField(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsRawTokenField(item));

  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    if (rawTokenKeys.has(key)) return true;
    return containsRawTokenField(nested);
  });
}

