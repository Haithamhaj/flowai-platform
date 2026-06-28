import type { ConditionAst, ConditionValue } from "@flowai/workflow-dsl";
import type { RuntimeInput, RuntimeSessionState } from "./types.js";

export class ConditionEvaluator {
  evaluate(condition: ConditionAst | undefined, input: RuntimeInput, state: RuntimeSessionState): boolean;
  evaluate(condition: unknown, input: RuntimeInput, state: RuntimeSessionState): boolean;
  evaluate(condition: unknown, input: RuntimeInput, state: RuntimeSessionState): boolean {
    if (!condition) return true;
    if (!isRecord(condition) || typeof condition.op !== "string") return false;

    switch (condition.op) {
      case "equals":
        if (!hasConditionValue(condition, "left") || !hasConditionValue(condition, "right")) return false;
        return this.resolve(condition.left, input, state) === this.resolve(condition.right, input, state);
      case "not_equals":
        if (!hasConditionValue(condition, "left") || !hasConditionValue(condition, "right")) return false;
        return this.resolve(condition.left, input, state) !== this.resolve(condition.right, input, state);
      case "contains": {
        if (!hasConditionValue(condition, "left") || !hasConditionValue(condition, "right")) return false;
        const left = String(this.resolve(condition.left, input, state) ?? "").toLowerCase();
        const right = String(this.resolve(condition.right, input, state) ?? "").toLowerCase();
        return left.includes(right);
      }
      case "exists":
        if (!hasConditionValue(condition, "value")) return false;
        return this.resolve(condition.value, input, state) !== undefined && this.resolve(condition.value, input, state) !== null;
      case "in": {
        if (!hasConditionValue(condition, "value") || !Array.isArray(condition.list)) return false;
        const value = this.resolve(condition.value, input, state);
        return condition.list.filter(isConditionValue).map((item) => this.resolve(item, input, state)).includes(value);
      }
      case "all":
        if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) return false;
        return condition.conditions.every((nested) => this.evaluate(nested, input, state));
      case "any":
        if (!Array.isArray(condition.conditions) || condition.conditions.length === 0) return false;
        return condition.conditions.some((nested) => this.evaluate(nested, input, state));
      case "not":
        if (!isRecord(condition.condition)) return false;
        return !this.evaluate(condition.condition, input, state);
      case "gt":
        if (!hasConditionValue(condition, "left") || !hasConditionValue(condition, "right")) return false;
        return Number(this.resolve(condition.left, input, state)) > Number(this.resolve(condition.right, input, state));
      case "gte":
        if (!hasConditionValue(condition, "left") || !hasConditionValue(condition, "right")) return false;
        return Number(this.resolve(condition.left, input, state)) >= Number(this.resolve(condition.right, input, state));
      case "lt":
        if (!hasConditionValue(condition, "left") || !hasConditionValue(condition, "right")) return false;
        return Number(this.resolve(condition.left, input, state)) < Number(this.resolve(condition.right, input, state));
      case "lte":
        if (!hasConditionValue(condition, "left") || !hasConditionValue(condition, "right")) return false;
        return Number(this.resolve(condition.left, input, state)) <= Number(this.resolve(condition.right, input, state));
      case "intent_is":
        if (typeof condition.intent !== "string") return false;
        return this.inferIntent(input) === condition.intent;
      default:
        return false;
    }
  }

  private resolve(value: ConditionValue, input: RuntimeInput, state: RuntimeSessionState): unknown {
    if (isRecord(value) && "var" in value && typeof value.var === "string") {
      return state.variables[value.var] ?? state.collectedFields[value.var];
    }

    if (isRecord(value) && "input" in value) {
      if (value.input === "text") return input.text;
      if (value.input === "choice") return input.choiceId;
      if (value.input === "intent") return this.inferIntent(input);
    }

    return value;
  }

  // v0.1 deterministic placeholder only. This does not call AI or run user code.
  private inferIntent(input: RuntimeInput): string {
    if (input.intent) return input.intent;
    if (input.choiceId) return input.choiceId;

    const text = (input.text ?? "").toLowerCase();
    if (text.includes("book") || text.includes("appointment") || text.includes("موعد") || text.includes("حجز")) return "book";
    if (text.includes("faq") || text.includes("question") || text.includes("سؤال") || text.includes("استفسار")) return "faq";
    if (text.includes("staff") || text.includes("human") || text.includes("موظف") || text.includes("انسان")) return "staff";
    return text.trim();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isConditionValue(value: unknown): value is ConditionValue {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return true;
  if (!isRecord(value)) return false;
  return (typeof value.var === "string" && Object.keys(value).length === 1) || (typeof value.input === "string" && Object.keys(value).length === 1);
}

function hasConditionValue(record: Record<string, unknown>, key: string): record is Record<string, ConditionValue> {
  return isConditionValue(record[key]);
}
