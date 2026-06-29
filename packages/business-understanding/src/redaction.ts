const SECRET_PATTERNS: RegExp[] = [
  /\b(api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?[^"'\s,;]+/gi,
  /\bbearer\s+[a-z0-9._~+/=-]+/gi,
  /\bsk-[a-z0-9][a-z0-9_-]{8,}\b/gi
];

export const REDACTED_SECRET = "[REDACTED_SECRET]";

export function containsSecretLikeValue(value: unknown): boolean {
  if (typeof value === "string") {
    return SECRET_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(value);
    });
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsSecretLikeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => {
      if (/api[_-]?key|token|secret|password|authorization/i.test(key)) {
        return true;
      }
      return containsSecretLikeValue(nested);
    });
  }

  return false;
}

export function redactSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, REDACTED_SECRET), text);
}

export function safeExcerpt(text: string, maxLength = 240): string {
  const compact = redactSecrets(text).replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1).trimEnd()}...` : compact;
}
