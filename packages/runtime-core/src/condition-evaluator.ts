import type { ConditionAst, ConditionValue } from "@flowai/workflow-dsl";
import type { RuntimeInput, RuntimeSessionState } from "./types.js";

export class ConditionEvaluator {
  evaluate(condition: ConditionAst | undefined, input: RuntimeInput, state: RuntimeSessionState): boolean {
    if (!condition) return true;

    switch (condition.op) {
      case "equals":
        return this.resolve(condition.left, input, state) === this.resolve(condition.right, input, state);
      case "not_equals":
        return this.resolve(condition.left, input, state) !== this.resolve(condition.right, input, state);
      case "contains": {
        const left = String(this.resolve(condition.left, input, state) ?? "").toLowerCase();
        const right = String(this.resolve(condition.right, input, state) ?? "").toLowerCase();
        return left.includes(right);
      }
      case "exists":
        return this.resolve(condition.value, input, state) !== undefined && this.resolve(condition.value, input, state) !== null;
      case "in": {
        const value = this.resolve(condition.value, input, state);
        return condition.list.map((item) => this.resolve(item, input, state)).includes(value);
      }
      case "all":
        return condition.conditions.every((nested) => this.evaluate(nested, input, state));
      case "any":
        return condition.conditions.some((nested) => this.evaluate(nested, input, state));
      case "not":
        return !this.evaluate(condition.condition, input, state);
      case "gt":
        return Number(this.resolve(condition.left, input, state)) > Number(this.resolve(condition.right, input, state));
      case "gte":
        return Number(this.resolve(condition.left, input, state)) >= Number(this.resolve(condition.right, input, state));
      case "lt":
        return Number(this.resolve(condition.left, input, state)) < Number(this.resolve(condition.right, input, state));
      case "lte":
        return Number(this.resolve(condition.left, input, state)) <= Number(this.resolve(condition.right, input, state));
      case "intent_is":
        return this.inferIntent(input) === condition.intent;
    }
  }

  private resolve(value: ConditionValue, input: RuntimeInput, state: RuntimeSessionState): unknown {
    if (value && typeof value === "object" && "var" in value) {
      return state.variables[value.var] ?? state.collectedFields[value.var];
    }

    if (value && typeof value === "object" && "input" in value) {
      if (value.input === "text") return input.text;
      if (value.input === "choice") return input.choiceId;
      if (value.input === "intent") return this.inferIntent(input);
    }

    return value;
  }

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

