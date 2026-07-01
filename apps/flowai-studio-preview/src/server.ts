import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeFlowAiDemo, createStudioFixtures, type DemoMode, type DemoUseCaseHint } from "./demo-pipeline.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const packageRoot = resolve(__dirname, "..");
const publicRoot = join(packageRoot, "public");

loadLocalEnv();

const port = Number(process.env.PORT ?? process.env.FLOWAI_STUDIO_PORT ?? 4177);

if (process.argv.includes("--help")) {
  printHelp();
  process.exit(0);
}

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch {
    sendJson(response, 500, { error: "Internal demo server error." });
  }
});

server.listen(port, "127.0.0.1", () => {
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
  console.log("FlowAI Studio Preview");
  console.log(`Local URL: http://127.0.0.1:${port}`);
  console.log(`OPENAI_API_KEY: ${aiEnabled ? "configured (backend-only)" : "not configured"}`);
  console.log(`AI mode: ${aiEnabled ? "enabled when selected" : "unavailable; deterministic mode remains active"}`);
  console.log("Switch modes in the browser: Deterministic or AI-assisted.");
});

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      aiEnabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/demo/flowai/fixtures") {
    sendJson(response, 200, createStudioFixtures());
    return;
  }

  if (request.method === "POST" && url.pathname === "/demo/flowai/analyze") {
    const body = await readJsonBody(request);
    const sourceText = typeof body.sourceText === "string" ? body.sourceText : "";
    const mode = body.mode === "ai_assisted" ? "ai_assisted" : "deterministic";
    const useCaseHint = readUseCaseHint(body.useCaseHint);

    if (!sourceText.trim()) {
      sendJson(response, 400, { error: "sourceText is required." });
      return;
    }

    const analysis = await analyzeFlowAiDemo({ sourceText, mode, useCaseHint });
    sendJson(response, 200, analysis);
    return;
  }

  if (request.method === "GET") {
    serveStatic(url.pathname, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed." });
}

function serveStatic(pathname: string, response: ServerResponse): void {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const target = resolve(publicRoot, `.${requested}`);

  if (!target.startsWith(publicRoot) || !existsSync(target)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  response.writeHead(200, { "content-type": contentType(target) });
  response.end(readFileSync(target));
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolveBody, rejectBody) => {
    let data = "";
    request.on("data", (chunk: Buffer) => {
      data += chunk.toString("utf8");
      if (data.length > 300_000) {
        request.destroy();
        rejectBody(new Error("Request too large."));
      }
    });
    request.on("end", () => {
      try {
        resolveBody(data ? JSON.parse(data) as Record<string, unknown> : {});
      } catch {
        rejectBody(new Error("Invalid JSON."));
      }
    });
    request.on("error", rejectBody);
  });
}

function readUseCaseHint(value: unknown): DemoUseCaseHint {
  const allowed = new Set<DemoUseCaseHint>(["clinic", "service_lead", "faq", "arabic", "ecommerce", "custom"]);
  return typeof value === "string" && allowed.has(value as DemoUseCaseHint) ? value as DemoUseCaseHint : "custom";
}

function loadLocalEnv(): void {
  const candidates = [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), ".env")];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [rawKey, ...rawValue] = trimmed.split("=");
      const key = rawKey?.trim();
      if (!key || process.env[key]) continue;
      process.env[key] = rawValue.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

function printHelp(): void {
  const aiEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());
  console.log("FlowAI Studio Preview");
  console.log(`Command: pnpm dev:flowai-studio`);
  console.log(`URL: http://127.0.0.1:${port}`);
  console.log(`OPENAI_API_KEY: ${aiEnabled ? "configured (backend-only)" : "not configured"}`);
  console.log("Modes: deterministic, ai_assisted");
}
