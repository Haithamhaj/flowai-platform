import { describe, expect, test } from "vitest";
import { resolveStudioWorkspaceRoot } from "../src/workspace-root.js";

describe("studio workspace root resolution", () => {
  test("uses the current repo root when Studio is started from the repository", () => {
    expect(resolveStudioWorkspaceRoot("/repo/flowai-platform")).toBe("/repo/flowai-platform");
  });

  test("walks up from apps/studio when Studio is started from the app package", () => {
    expect(resolveStudioWorkspaceRoot("/repo/flowai-platform/apps/studio")).toBe("/repo/flowai-platform");
  });
});
