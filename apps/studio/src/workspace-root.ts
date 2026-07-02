import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function resolveStudioWorkspaceRoot(startDir: string): string {
  let current = resolve(startDir);
  const appSegment = `${"/"}apps${"/"}studio`;
  if (current.endsWith(appSegment)) {
    return current.slice(0, -appSegment.length);
  }

  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return resolve(startDir);
}
