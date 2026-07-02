import { createServer } from "node:http";
import {
  buildOwnerFirstPreviewWithAiReview,
  getDefaultOwnerInput,
  type OwnerFirstAiReviewOptions,
  type OwnerFirstPreviewInput
} from "./index.js";
import { createOpenAiResponsesProvider, createOpenAiVectorStoreClient, loadOpenAiProviderConfig } from "@flowai/ai-builder-orchestrator";
import { crawlWebsiteToSourceDocument } from "@flowai/website-crawler";
import { applyWorkflowEditorCommand, runEditedWorkflowPreview, type WorkflowEditorCommand } from "./workflow-editor.js";
import { renderCustomerChatHtml } from "./customer-chat-view.js";
import { resolveStudioWorkspaceRoot } from "./workspace-root.js";
import type { WorkflowDefinition } from "@flowai/workflow-dsl";

const port = Number.parseInt(process.env.PORT ?? "4177", 10);
const host = process.env.HOST ?? "127.0.0.1";
const workspaceRoot = process.env.FLOWAI_WORKSPACE_ROOT ?? resolveStudioWorkspaceRoot(process.cwd());

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

  if (request.method === "GET" && url.pathname === "/") {
    send(response, 200, "text/html; charset=utf-8", renderHtml());
    return;
  }

  if (request.method === "GET" && url.pathname === "/customer") {
    send(response, 200, "text/html; charset=utf-8", renderCustomerChatHtml());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/default") {
    sendJson(response, 200, getDefaultOwnerInput());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/build") {
    try {
      const body = await readJson(request);
      const input = normalizeInput(body);
      sendJson(response, 200, await buildOwnerFirstPreviewWithAiReview(input, buildAiReviewOptions(body)));
    } catch (error) {
      sendJson(response, 400, {
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Request could not be processed."
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/crawl-preview") {
    try {
      const body = await readJson(request);
      const crawlRequest = normalizeCrawlRequest(body);
      const crawl = await crawlWebsiteToSourceDocument(crawlRequest);
      if (!crawl.ok) {
        sendJson(response, 400, {
          ok: false,
          error: crawl.error,
          warnings: crawl.warnings
        });
        return;
      }
      sendJson(response, 200, {
        ok: true,
        startUrl: crawl.startUrl,
        filename: crawl.document.filename,
        content: crawl.document.text,
        pages: crawl.pages.map((page) => ({
          url: page.url,
          title: page.title,
          textLength: page.text.length
        })),
        sourceRefs: crawl.document.sourceRefs.map((ref) => ({
          id: ref.id,
          label: ref.label
        })),
        warnings: crawl.warnings
      });
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: {
          code: "INVALID_CRAWL_REQUEST",
          message: error instanceof Error ? error.message : "Crawl request could not be processed."
        },
        warnings: []
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/crawl-build") {
    try {
      const body = await readJson(request);
      const crawlRequest = normalizeCrawlRequest(body);
      const crawl = await crawlWebsiteToSourceDocument(crawlRequest);
      if (!crawl.ok) {
        sendJson(response, 400, {
          ok: false,
          error: crawl.error,
          warnings: crawl.warnings
        });
        return;
      }
      const input: OwnerFirstPreviewInput = {
        filename: crawl.document.filename,
        mimeType: "text/markdown",
        sourceKind: "website_text",
        sourceOrigin: "crawler",
        sourceUrl: crawl.startUrl,
        content: crawl.document.text
      };
      const preview = await buildOwnerFirstPreviewWithAiReview(input, buildAiReviewOptions(body));
      sendJson(response, 200, {
        ok: true,
        crawl: {
          startUrl: crawl.startUrl,
          filename: crawl.document.filename,
          content: crawl.document.text,
          pages: crawl.pages.map((page) => ({
            url: page.url,
            title: page.title,
            textLength: page.text.length
          })),
          sourceRefs: crawl.document.sourceRefs.map((ref) => ({
            id: ref.id,
            label: ref.label
          })),
          warnings: crawl.warnings
        },
        preview
      });
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: {
          code: "INVALID_CRAWL_BUILD_REQUEST",
          message: error instanceof Error ? error.message : "Crawl build request could not be processed."
        },
        warnings: []
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/workflow-editor/command") {
    try {
      const body = await readJson(request);
      const { workflow, command } = normalizeEditorCommand(body);
      const edited = applyWorkflowEditorCommand(workflow, command);
      const editedPreview = runEditedWorkflowPreview(edited.workflow);
      sendJson(response, 200, {
        workflow: edited.workflow,
        model: edited.model,
        validation: edited.validation,
        runtimeConversation: editedPreview.runtimeConversation,
        telegramPreview: editedPreview.telegramPreview,
        channelPreview: editedPreview.channelPreview,
        integrationHub: editedPreview.integrationHub
      });
    } catch (error) {
      sendJson(response, 400, {
        error: "invalid_editor_request",
        message: error instanceof Error ? error.message : "Workflow editor request could not be processed."
      });
    }
    return;
  }

  send(response, 404, "text/plain; charset=utf-8", "Not found");
});

server.listen(port, host, () => {
  process.stdout.write(`FlowAI Studio local preview: http://${host}:${port}/\n`);
});

function normalizeInput(value: unknown): OwnerFirstPreviewInput {
  if (!value || typeof value !== "object") throw new Error("Body must be a JSON object.");
  const record = value as Record<string, unknown>;
  if (typeof record.content !== "string" || record.content.trim().length === 0) {
    throw new Error("content is required.");
  }
  return {
    filename: typeof record.filename === "string" ? record.filename : "owner-business.md",
    mimeType: typeof record.mimeType === "string" ? record.mimeType : "text/markdown",
    sourceKind: normalizeSourceKind(record.sourceKind),
    sourceOrigin: record.sourceOrigin === "crawler" ? "crawler" : "pasted",
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
    content: record.content
  };
}

function buildAiReviewOptions(value: unknown): OwnerFirstAiReviewOptions {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const useLiveAi = record.useLiveAi === true;
  const useKnowledgeSearch = record.useKnowledgeSearch === true;
  const knowledgeSearchQuery = typeof record.knowledgeSearchQuery === "string" ? record.knowledgeSearchQuery : undefined;
  const config = useLiveAi || useKnowledgeSearch
    ? loadOpenAiProviderConfig({
        allowLocalConfig: true,
        workspaceRoot
      })
    : {
        configured: false as const,
        diagnostics: {
          configured: false as const,
          source: "none" as const,
          model: null
        },
        apiKey: "",
        model: ""
      };
  if (!useLiveAi) {
    if (useKnowledgeSearch && config.configured) {
      return {
        useLiveAi: false,
        providerDiagnostics: {
          configured: false,
          source: "none",
          model: null
        },
        useKnowledgeSearch,
        knowledgeSearchQuery,
        knowledgeProviderDiagnostics: config.diagnostics,
        knowledgeClient: createOpenAiVectorStoreClient({ apiKey: config.apiKey })
      };
    }
    return {
      useLiveAi: false,
      providerDiagnostics: {
        configured: false,
        source: "none",
        model: null
      },
      useKnowledgeSearch,
      knowledgeSearchQuery,
      knowledgeProviderDiagnostics: config.diagnostics
    };
  }
  if (!config.configured) {
    return {
      useLiveAi: true,
      providerDiagnostics: config.diagnostics,
      useKnowledgeSearch,
      knowledgeSearchQuery,
      knowledgeProviderDiagnostics: config.diagnostics
    };
  }
  return {
    useLiveAi: true,
    providerDiagnostics: config.diagnostics,
    provider: createOpenAiResponsesProvider({
      apiKey: config.apiKey,
      model: config.model
    }),
    useKnowledgeSearch,
    knowledgeSearchQuery,
    knowledgeProviderDiagnostics: config.diagnostics,
    knowledgeClient: useKnowledgeSearch ? createOpenAiVectorStoreClient({ apiKey: config.apiKey }) : undefined
  };
}

function normalizeCrawlRequest(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Body must be a JSON object.");
  const record = value as Record<string, unknown>;
  if (typeof record.url !== "string" || record.url.trim().length === 0) {
    throw new Error("url is required.");
  }
  const maxPages = typeof record.maxPages === "number" ? record.maxPages : 5;
  return {
    startUrl: record.url,
    maxPages,
    allowPrivateNetwork: process.env.FLOWAI_ALLOW_PRIVATE_CRAWL === "true" && record.allowPrivateNetwork === true
  };
}

function normalizeSourceKind(value: unknown): OwnerFirstPreviewInput["sourceKind"] {
  if (value === "document_text" || value === "website_text" || value === "business_description") return value;
  return "business_description";
}

function normalizeEditorCommand(value: unknown): { workflow: WorkflowDefinition; command: WorkflowEditorCommand } {
  if (!value || typeof value !== "object") throw new Error("Body must be a JSON object.");
  const record = value as Record<string, unknown>;
  if (!record.workflow || typeof record.workflow !== "object") throw new Error("workflow is required.");
  if (!record.command || typeof record.command !== "object") throw new Error("command is required.");
  const command = record.command as Record<string, unknown>;
  if (typeof command.type !== "string") throw new Error("command.type is required.");
  return {
    workflow: record.workflow as WorkflowDefinition,
    command: command as WorkflowEditorCommand
  };
}

async function readJson(request: { on: Function }): Promise<unknown> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve());
    request.on("error", reject);
  });
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response: { writeHead: Function; end: Function }, status: number, value: unknown) {
  send(response, status, "application/json; charset=utf-8", JSON.stringify(value));
}

function send(response: { writeHead: Function; end: Function }, status: number, contentType: string, body: string) {
  response.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function renderHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowAI Studio Preview</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --surface: #ffffff;
      --surface-2: #eef3f7;
      --line: #d7dee6;
      --text: #1f2933;
      --muted: #65727f;
      --accent: #0f766e;
      --accent-2: #a85532;
      --danger: #b42318;
      --ok: #067647;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    button, textarea, input, select { font: inherit; }
    .app { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
    header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--line); background: var(--surface); }
    .brand { font-weight: 750; font-size: 18px; }
    .status { display: flex; gap: 8px; align-items: center; color: var(--muted); font-size: 13px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-2); }
    main { display: grid; grid-template-columns: minmax(340px, 0.9fr) minmax(520px, 1.4fr); min-height: 0; }
    .chat { border-right: 1px solid var(--line); background: var(--surface); display: grid; grid-template-rows: auto 1fr auto; min-height: calc(100vh - 58px); }
    .chat-head { padding: 20px; border-bottom: 1px solid var(--line); }
    h1 { margin: 0 0 8px; font-size: 22px; line-height: 1.2; letter-spacing: 0; }
    .chat-head p, .muted { color: var(--muted); margin: 0; line-height: 1.45; }
    .thread { padding: 20px; overflow: auto; display: flex; flex-direction: column; gap: 14px; }
    .bubble { max-width: 92%; padding: 12px 14px; border-radius: 8px; line-height: 1.45; border: 1px solid var(--line); background: var(--surface-2); }
    .bubble.owner { align-self: flex-end; background: #e8f5f2; border-color: #b8ddd5; }
    .composer { padding: 16px; border-top: 1px solid var(--line); display: grid; gap: 10px; }
    .composer-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
    .toggle-row { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; }
    .toggle-row input { width: 18px; height: 18px; min-width: 18px; }
    textarea { width: 100%; min-height: 170px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fff; color: var(--text); line-height: 1.45; }
    input, select { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; min-width: 0; background: #fff; color: var(--text); }
    button { border: 0; border-radius: 8px; padding: 10px 14px; background: var(--accent); color: white; cursor: pointer; font-weight: 650; }
    button.secondary { background: #364152; }
    .workspace { padding: 18px; overflow: auto; display: grid; gap: 14px; align-content: start; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    section, .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    h2 { font-size: 15px; margin: 0 0 10px; letter-spacing: 0; }
    h3 { font-size: 13px; margin: 12px 0 6px; color: var(--muted); letter-spacing: 0; }
    ul { margin: 8px 0 0; padding-left: 18px; }
    li { margin: 4px 0; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .pill { border: 1px solid var(--line); background: var(--surface-2); border-radius: 999px; padding: 4px 8px; font-size: 12px; color: var(--muted); }
    .checklist { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .check { border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: #fff; min-height: 88px; }
    .check strong { display: block; font-size: 13px; margin-bottom: 5px; }
    .check.done { border-color: #9bd3b3; background: #f0faf4; }
    .check.review { border-color: #d8b98b; background: #fff8eb; }
    .check.blocked { border-color: #e0a5a0; background: #fff3f1; }
    .check.not_enabled { background: #f6f7f9; }
    .ok { color: var(--ok); }
    .danger { color: var(--danger); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .conversation { display: grid; gap: 8px; }
    .turn { border-left: 3px solid var(--line); padding-left: 10px; }
    .turn.owner { border-color: var(--accent); }
    .turn.bot { border-color: #476582; }
    .preview-phone { background: #edf7f5; border: 1px solid #badbd5; border-radius: 8px; padding: 12px; display: grid; gap: 8px; }
    .button-chip { display: inline-block; padding: 5px 8px; border-radius: 6px; background: #d4ece7; margin: 4px 4px 0 0; font-size: 12px; }
    .tree-editor { display: grid; grid-template-columns: minmax(420px, 1.5fr) minmax(260px, 0.8fr); gap: 12px; }
    .tree-canvas { min-height: 430px; border: 1px solid var(--line); border-radius: 8px; background: #fbfcfd; overflow: auto; }
    .tree-canvas svg { min-width: 820px; min-height: 430px; display: block; }
    .tree-node rect { fill: #fff; stroke: #b6c2cf; stroke-width: 1.5; rx: 8; }
    .tree-node.selected rect { stroke: var(--accent); stroke-width: 3; }
    .tree-node text { font-size: 12px; fill: var(--text); pointer-events: none; }
    .tree-edge { stroke: #8fa1b3; stroke-width: 1.5; fill: none; marker-end: url(#arrow); }
    .inspector { display: grid; gap: 10px; align-content: start; }
    .inspector label { display: grid; gap: 5px; color: var(--muted); font-size: 12px; }
    .inspector textarea { min-height: 96px; }
    .mini-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; }
      .chat { border-right: 0; border-bottom: 1px solid var(--line); min-height: auto; }
      .grid { grid-template-columns: 1fr; }
      .checklist { grid-template-columns: 1fr; }
      .tree-editor { grid-template-columns: 1fr; }
      .composer-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <div class="brand">FlowAI Studio</div>
      <div class="status"><span class="dot"></span><span>Local deterministic preview · AI pending</span></div>
    </header>
    <main>
      <aside class="chat">
        <div class="chat-head">
          <h1>Build a chatbot by describing the business</h1>
          <p>Paste a clinic, service, FAQ, or Arabic business description. FlowAI will show what it understood and draft a testable workflow.</p>
        </div>
        <div class="thread" id="thread"></div>
        <div class="composer">
          <div class="composer-row">
            <input id="filename" value="bright-dental-clinic.md" aria-label="Filename" />
            <button class="secondary" id="loadSample" type="button">Sample</button>
          </div>
          <div class="composer-row">
            <select id="sourceKind" aria-label="Source kind">
              <option value="business_description">Business description</option>
              <option value="document_text">Document text</option>
              <option value="website_text">Website text</option>
            </select>
            <input id="sourceUrl" placeholder="Website URL reference" aria-label="Website URL reference" />
          </div>
          <div class="composer-row">
            <input id="crawlUrl" placeholder="https://example.com" aria-label="Website URL to crawl" />
            <button class="secondary" id="crawlWebsite" type="button">Crawl</button>
          </div>
          <p class="muted" id="crawlStatus">Crawler is same-origin, capped, and blocks private network targets by default.</p>
          <label class="toggle-row"><input id="useLiveAi" type="checkbox" />Use live AI review</label>
          <label class="toggle-row"><input id="useKnowledgeSearch" type="checkbox" />Use OpenAI RAG search</label>
          <input id="knowledgeSearchQuery" value="What should the chatbot know about this business?" aria-label="RAG search query" />
          <textarea id="content" aria-label="Business description"></textarea>
          <button id="build" type="button">Build chatbot</button>
        </div>
      </aside>
      <section class="workspace" id="workspace" aria-live="polite"></section>
    </main>
  </div>
  <script>
    const thread = document.getElementById("thread");
    const workspace = document.getElementById("workspace");
    const filename = document.getElementById("filename");
    const sourceKind = document.getElementById("sourceKind");
    const sourceUrl = document.getElementById("sourceUrl");
    const content = document.getElementById("content");
    const useLiveAi = document.getElementById("useLiveAi");
    const useKnowledgeSearch = document.getElementById("useKnowledgeSearch");
    const knowledgeSearchQuery = document.getElementById("knowledgeSearchQuery");
    const crawlUrl = document.getElementById("crawlUrl");
    const crawlWebsite = document.getElementById("crawlWebsite");
    const crawlStatus = document.getElementById("crawlStatus");
    const build = document.getElementById("build");
    const loadSample = document.getElementById("loadSample");
    let visualWorkflowModel = null;
    let selectedWorkflowNodeId = null;

    async function loadDefault() {
      const res = await fetch("/api/default");
      const data = await res.json();
      filename.value = data.filename;
      content.value = data.content;
      await runBuild();
    }

    async function runBuild() {
      const ownerText = content.value.trim();
      thread.innerHTML = "";
      addBubble("bot", "Tell me about the chatbot you want to build. You can paste business text, services, FAQs, or Arabic content.");
      addBubble("owner", ownerText ? ownerText.slice(0, 420) : "No description yet.");
      workspace.innerHTML = "<section><h2>Reviewing business input...</h2><p class='muted'>Building sourceRefs, business brief, workflow proposal, runtime preview, and Telegram mock.</p></section>";
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: filename.value,
          mimeType: filename.value.endsWith(".txt") ? "text/plain" : "text/markdown",
          sourceKind: sourceKind.value,
          sourceUrl: sourceUrl.value,
          content: ownerText,
          useLiveAi: Boolean(useLiveAi.checked),
          useKnowledgeSearch: Boolean(useKnowledgeSearch.checked),
          knowledgeSearchQuery: knowledgeSearchQuery.value
        })
      });
      const preview = await res.json();
      addBubble("bot", preview.assistantMessage || "I could not build a preview.");
      renderPreview(preview);
    }

    function addBubble(kind, text) {
      const div = document.createElement("div");
      div.className = "bubble " + (kind === "owner" ? "owner" : "bot");
      div.textContent = text;
      thread.appendChild(div);
    }

    function renderPreview(preview) {
      workspace.innerHTML = [
        renderStatus(preview),
        renderChecklist(preview),
        renderKnowledgeSearch(preview),
        "<div class='grid'>" + renderBusiness(preview) + renderWorkflow(preview) + "</div>",
        renderProductCatalog(preview),
        renderVisualWorkflow(preview),
        renderChannelWorkspace(preview),
        renderIntegrationHub(preview),
        "<div class='grid'>" + renderSource(preview) + renderTelegram(preview) + "</div>",
        renderRuntime(preview),
        renderSafety(preview)
      ].join("");
      hydrateVisualWorkflow(preview.visualWorkflow);
    }

    function renderChecklist(preview) {
      const items = (preview.ownerChecklist || []).map(item => "<div class='check " + escapeHtml(item.status) + "'><strong>" + escapeHtml(item.label) + "</strong><span class='pill'>" + escapeHtml(item.status) + "</span><p class='muted'>" + escapeHtml(item.note) + "</p></div>").join("");
      return "<section><h2>Owner launch checklist</h2><div class='checklist'>" + items + "</div></section>";
    }

    function renderKnowledgeSearch(preview) {
      const search = preview.knowledgeSearch || { status: "not_enabled", query: "", matches: [], note: "Not enabled." };
      const matches = (search.matches || []).map(match => "<div class='panel'><p><strong>score " + escapeHtml(Number(match.score || 0).toFixed(3)) + "</strong> · " + escapeHtml(match.sourceRefId || "no sourceRef") + "</p><div class='mono'>" + escapeHtml(match.text || "") + "</div></div>").join("");
      return "<section><h2>RAG Knowledge Search</h2><p><strong>" + escapeHtml(search.status) + "</strong> · " + escapeHtml(search.query || "No query") + "</p><p class='muted'>" + escapeHtml(search.note || "") + "</p><div class='grid'>" + (matches || "<p class='muted'>No RAG matches yet.</p>") + "</div></section>";
    }

    function renderStatus(preview) {
      const status = preview.status === "ready" ? "<span class='ok'>Ready draft</span>" : "<span class='danger'>Needs review</span>";
      return "<section><h2>Builder status</h2><p>" + status + " · " + escapeHtml(preview.aiMode.label) + "</p><p class='muted'>" + escapeHtml(preview.aiMode.note) + "</p><div class='pill-row'>" + preview.suggestedQuestions.map(q => "<span class='pill'>" + escapeHtml(q) + "</span>").join("") + "</div></section>";
    }

    function renderBusiness(preview) {
      const brief = preview.businessBrief;
      return "<section><h2>Business Brain</h2><p><strong>" + escapeHtml(brief.businessName || "Unknown business") + "</strong></p><p class='muted'>" + escapeHtml(brief.category || "No category yet") + " · " + escapeHtml(brief.language) + "</p><p>" + escapeHtml(brief.summary) + "</p><h3>Services</h3><ul>" + brief.services.map(s => "<li>" + escapeHtml(s.name) + " <span class='muted'>(" + escapeHtml(s.requiredFields.join(", ") || "no fields") + ")</span></li>").join("") + "</ul><h3>FAQs</h3><ul>" + brief.faqs.map(f => "<li>" + escapeHtml(f.question) + "</li>").join("") + "</ul></section>";
    }

    function renderWorkflow(preview) {
      const proposal = preview.workflowProposal;
      const summary = preview.workflowSummary;
      return "<section><h2>Workflow Proposal</h2><p><strong>" + escapeHtml(proposal.selectedTemplate || "No template") + "</strong></p><div class='pill-row'>" + proposal.capabilities.map(c => "<span class='pill'>" + escapeHtml(c) + "</span>").join("") + "</div><h3>Required fields</h3><p>" + escapeHtml(proposal.requiredFields.join(", ") || "No fields") + "</p><h3>Generated workflow</h3><p>" + (summary ? escapeHtml(summary.name) + " · " + summary.nodeCount + " nodes · valid=" + summary.valid : "No workflow yet") + "</p><div class='mono'>" + (summary ? escapeHtml(summary.nodes.map(n => n.id + ":" + n.type).join("\\n")) : "") + "</div></section>";
    }

    function renderProductCatalog(preview) {
      const catalog = preview.productCatalog;
      const items = catalog.items.map(item => "<div class='panel'><h3>" + escapeHtml(item.name) + "</h3><p class='muted'>" + escapeHtml(item.type) + " · " + escapeHtml(item.sourceRefs.join(", ") || "no sourceRefs") + "</p><p>" + escapeHtml(item.description || "No description") + "</p><div class='pill-row'><span class='pill'>price: " + escapeHtml(item.priceConfidence) + "</span><span class='pill'>availability: " + escapeHtml(item.availabilityConfidence) + "</span></div><ul>" + item.questionsToAsk.map(q => "<li>" + escapeHtml(q) + "</li>").join("") + "</ul></div>").join("");
      return "<section><h2>Product Catalog Review</h2><p><strong>" + escapeHtml(catalog.reviewStatus) + "</strong> · inquiry workflow: " + escapeHtml(catalog.workflowPlan.status) + "</p><div class='grid'>" + (items || "<p class='muted'>No catalog items yet.</p>") + "</div><h3>Workflow guardrails</h3><ul>" + catalog.workflowPlan.blockers.concat(catalog.workflowPlan.warnings).map(note => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul><h3>Unknowns</h3><ul>" + catalog.unknowns.map(note => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul></section>";
    }

    function renderVisualWorkflow(preview) {
      if (!preview.visualWorkflow) {
        return "<section><h2>Visual Workflow Editor</h2><p class='muted'>No editable workflow is available yet.</p></section>";
      }
      return "<section><h2>Visual Workflow Editor</h2><p class='muted'>Edits operate on strict Workflow JSON, then run validation, runtime test, and Telegram mock preview again.</p><div class='tree-editor'><div class='tree-canvas' id='treeCanvas'></div><div class='inspector'><div id='workflowInspector'></div><div class='mini-actions'><button type='button' id='addNode'>Add node</button><button class='secondary' type='button' id='deleteNode'>Delete node</button></div><label>Connect to<select id='connectTarget'></select></label><button class='secondary' type='button' id='connectNode'>Connect</button><div id='workflowValidation'></div></div></div></section>";
    }

    function renderSource(preview) {
      const source = preview.sourcePanel;
      return "<section><h2>SourceDocument / sourceRefs</h2><p><strong>" + escapeHtml(source.filename) + "</strong></p><p class='muted'>" + escapeHtml(source.sourceKind || "business_description") + (source.sourceUrl ? " · " + escapeHtml(source.sourceUrl) : "") + "</p><p class='muted'>" + escapeHtml(source.documentId || "No document id") + "</p><div class='mono'>" + escapeHtml(source.reviewExcerpt || "No excerpt") + "</div><h3>Refs</h3><ul>" + source.sourceRefs.map(r => "<li>" + escapeHtml(r.label) + " · " + escapeHtml(r.locator) + "</li>").join("") + "</ul><h3>Warnings</h3><ul>" + source.warnings.map(w => "<li>" + escapeHtml(w) + "</li>").join("") + "</ul></section>";
    }

    function renderTelegram(preview) {
      return "<section id='telegramPanel'><h2>Telegram mock preview</h2><div class='preview-phone'>" + renderTelegramMessages(preview.telegramPreview) + "</div><p class='muted'>Mock preview only. No Telegram bot is running.</p></section>";
    }

    function renderChannelWorkspace(preview) {
      const channelPreview = preview.channelPreview || { channels: [], runtimeTrace: [] };
      const channels = channelPreview.channels.map(channel => "<div class='panel'><h3>" + escapeHtml(channel.label) + "</h3><p><strong>" + escapeHtml(channel.mockLabel) + "</strong></p><div class='preview-phone'>" + renderChannelMessages(channel.messages || []) + "</div><h3>Constraints</h3><ul>" + (channel.constraints || []).map(note => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul></div>").join("");
      return "<section id='channelPreviewPanel'><h2>Channel Preview Workspace</h2><p class='muted'>Same runtime output rendered as web chat, Telegram mock, and WhatsApp mock. These are display previews only.</p><div class='grid'>" + (channels || "<p class='muted'>No channel previews yet.</p>") + "</div><h3>Runtime trace</h3><div class='mono'>" + escapeHtml((channelPreview.runtimeTrace || []).join("\\n") || "No trace yet.") + "</div></section>";
    }

    function renderIntegrationHub(preview) {
      const hub = preview.integrationHub;
      if (!hub) return "<section id='integrationHubPanel'><h2>Export & Integration Hub</h2><p class='muted'>No export package is available until a valid workflow exists.</p></section>";
      const blocks = hub.copyBlocks.map(block => "<div class='panel'><h3>" + escapeHtml(block.label) + "</h3><textarea readonly>" + escapeHtml(block.content) + "</textarea></div>").join("");
      return "<section id='integrationHubPanel'><h2>Export & Integration Hub</h2><p><strong>Valid export: " + escapeHtml(hub.summary.valid) + "</strong> · unsupported items: " + escapeHtml(hub.summary.unsupportedCount) + "</p><p class='muted'>Copy-ready local export data only. No CRM, ticketing, webhook, or external platform connection is active.</p><div class='grid'>" + blocks + "</div></section>";
    }

    function renderRuntime(preview) {
      return "<section id='runtimePanel'><h2>Runtime test conversation</h2><div class='conversation'>" + renderRuntimeTurns(preview.runtimeConversation) + "</div></section>";
    }

    function renderSafety(preview) {
      return "<section><h2>Safety boundaries</h2><ul>" + preview.safetyNotes.map(note => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul></section>";
    }

    function hydrateVisualWorkflow(model) {
      visualWorkflowModel = model || null;
      selectedWorkflowNodeId = model?.nodes?.[0]?.id || null;
      drawVisualWorkflow();
      const add = document.getElementById("addNode");
      const del = document.getElementById("deleteNode");
      const connect = document.getElementById("connectNode");
      if (add) add.addEventListener("click", () => sendWorkflowCommand({
        type: "add_message_node",
        sourceNodeId: selectedWorkflowNodeId || "start",
        nodeId: "owner_note_" + Date.now().toString(36),
        name: "Owner note",
        message: "New owner-edited message.",
        edgeLabel: "Owner edit"
      }));
      if (del) del.addEventListener("click", () => {
        if (!selectedWorkflowNodeId || selectedWorkflowNodeId === "start") return;
        sendWorkflowCommand({ type: "delete_node_only", nodeId: selectedWorkflowNodeId });
      });
      if (connect) connect.addEventListener("click", () => {
        const target = document.getElementById("connectTarget")?.value;
        if (!selectedWorkflowNodeId || !target || target === selectedWorkflowNodeId) return;
        sendWorkflowCommand({ type: "connect_nodes", sourceNodeId: selectedWorkflowNodeId, targetNodeId: target, label: "Owner route" });
      });
    }

    function drawVisualWorkflow() {
      const canvas = document.getElementById("treeCanvas");
      const inspector = document.getElementById("workflowInspector");
      const validation = document.getElementById("workflowValidation");
      const target = document.getElementById("connectTarget");
      if (!canvas || !inspector || !validation || !visualWorkflowModel) return;
      const nodesById = new Map(visualWorkflowModel.nodes.map(node => [node.id, node]));
      canvas.innerHTML = "<svg viewBox='0 0 860 460' role='img' aria-label='Workflow tree'><defs><marker id='arrow' markerWidth='8' markerHeight='8' refX='7' refY='3' orient='auto'><path d='M0,0 L0,6 L7,3 z' fill='#8fa1b3'></path></marker></defs>" + visualWorkflowModel.edges.map(edge => {
        const source = nodesById.get(edge.source);
        const targetNode = nodesById.get(edge.target);
        if (!source || !targetNode) return "";
        return "<path class='tree-edge' d='M" + (source.x + 190) + " " + (source.y + 42) + " C" + (source.x + 235) + " " + (source.y + 42) + "," + (targetNode.x - 45) + " " + (targetNode.y + 42) + "," + targetNode.x + " " + (targetNode.y + 42) + "'></path>";
      }).join("") + visualWorkflowModel.nodes.map(node => "<g class='tree-node " + (node.id === selectedWorkflowNodeId ? "selected" : "") + "' data-node-id='" + escapeHtml(node.id) + "' tabindex='0' role='button'><rect x='" + node.x + "' y='" + node.y + "' width='190' height='84'></rect><text x='" + (node.x + 12) + "' y='" + (node.y + 24) + "'>" + escapeHtml(node.name.slice(0, 22)) + "</text><text x='" + (node.x + 12) + "' y='" + (node.y + 46) + "'>" + escapeHtml(node.type) + "</text><text x='" + (node.x + 12) + "' y='" + (node.y + 66) + "'>" + escapeHtml(node.id.slice(0, 24)) + "</text></g>").join("") + "</svg>";
      canvas.querySelectorAll(".tree-node").forEach(node => node.addEventListener("click", () => {
        selectedWorkflowNodeId = node.getAttribute("data-node-id");
        drawVisualWorkflow();
      }));
      const selected = visualWorkflowModel.nodes.find(node => node.id === selectedWorkflowNodeId) || visualWorkflowModel.nodes[0];
      inspector.innerHTML = selected ? "<h3>Node inspector</h3><p><strong>" + escapeHtml(selected.name) + "</strong></p><p class='muted'>" + escapeHtml(selected.id) + " · " + escapeHtml(selected.type) + "</p><label>Text<textarea id='nodeText' " + (selected.editable ? "" : "disabled") + ">" + escapeHtml(selected.text) + "</textarea></label><button class='secondary' type='button' id='saveNodeText'>Save text</button>" : "<p class='muted'>Select a node.</p>";
      const save = document.getElementById("saveNodeText");
      if (save && selected?.editable) save.addEventListener("click", () => {
        const text = document.getElementById("nodeText")?.value || "";
        sendWorkflowCommand({ type: "edit_node_text", nodeId: selected.id, text });
      });
      if (target) {
        target.innerHTML = visualWorkflowModel.nodes.map(node => "<option value='" + escapeHtml(node.id) + "'>" + escapeHtml(node.name) + "</option>").join("");
      }
      validation.innerHTML = "<h3>Validation</h3>" + (visualWorkflowModel.validation.valid ? "<p class='ok'>Workflow JSON is valid.</p>" : "<ul>" + visualWorkflowModel.validation.issues.map(issue => "<li class='danger'>" + escapeHtml(issue.path + ': ' + issue.message) + "</li>").join("") + "</ul>");
    }

    async function sendWorkflowCommand(command) {
      if (!visualWorkflowModel?.workflowJson) return;
      const res = await fetch("/api/workflow-editor/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: visualWorkflowModel.workflowJson, command })
      });
      const data = await res.json();
      if (!res.ok) {
        const validation = document.getElementById("workflowValidation");
        if (validation) validation.innerHTML = "<p class='danger'>" + escapeHtml(data.message || "Editor command failed.") + "</p>";
        return;
      }
      visualWorkflowModel = data.model;
      selectedWorkflowNodeId = command.nodeId || selectedWorkflowNodeId;
      drawVisualWorkflow();
      updateEditedPreviewPanels(data);
    }

    function updateEditedPreviewPanels(data) {
      const runtimePanel = document.getElementById("runtimePanel");
      const telegramPanel = document.getElementById("telegramPanel");
      const channelPreviewPanel = document.getElementById("channelPreviewPanel");
      const integrationHubPanel = document.getElementById("integrationHubPanel");
      if (runtimePanel) runtimePanel.innerHTML = "<h2>Runtime test conversation</h2><div class='conversation'>" + renderRuntimeTurns(data.runtimeConversation || []) + "</div>";
      if (telegramPanel) telegramPanel.innerHTML = "<h2>Telegram mock preview</h2><div class='preview-phone'>" + renderTelegramMessages(data.telegramPreview || []) + "</div><p class='muted'>Mock preview only. No Telegram bot is running.</p>";
      if (channelPreviewPanel) channelPreviewPanel.outerHTML = renderChannelWorkspace({ channelPreview: data.channelPreview || { channels: [], runtimeTrace: [] } });
      if (integrationHubPanel) integrationHubPanel.outerHTML = renderIntegrationHub({ integrationHub: data.integrationHub });
    }

    function renderRuntimeTurns(turns) {
      return turns.map(t => "<div class='turn " + escapeHtml(t.from) + "'><strong>" + escapeHtml(t.from) + "</strong><div>" + t.messages.map(escapeHtml).join("<br>") + "</div></div>").join("");
    }

    function renderTelegramMessages(messages) {
      return messages.map(m => "<div><p>" + escapeHtml(m.text) + "</p>" + m.buttons.map(b => "<span class='button-chip'>" + escapeHtml(b) + "</span>").join("") + "</div>").join("");
    }

    function renderChannelMessages(messages) {
      return messages.map(m => "<div><p>" + escapeHtml(m.text) + "</p>" + (m.buttons || []).map(b => "<span class='button-chip'>" + escapeHtml(b) + "</span>").join("") + "</div>").join("");
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }

    build.addEventListener("click", runBuild);
    loadSample.addEventListener("click", loadDefault);
    crawlWebsite.addEventListener("click", runCrawl);
    loadDefault();

    async function runCrawl() {
      const url = crawlUrl.value.trim() || sourceUrl.value.trim();
      if (!url) {
        crawlStatus.textContent = "Enter a website URL first.";
        return;
      }
      crawlStatus.textContent = "Crawling website pages...";
      const res = await fetch("/api/crawl-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          maxPages: 5,
          useLiveAi: Boolean(useLiveAi.checked),
          useKnowledgeSearch: Boolean(useKnowledgeSearch.checked),
          knowledgeSearchQuery: knowledgeSearchQuery.value
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        crawlStatus.textContent = "Crawl blocked: " + (data.error?.message || "Unable to crawl this URL.");
        return;
      }
      filename.value = data.crawl?.filename || "website-crawl.md";
      sourceKind.value = "website_text";
      sourceUrl.value = data.crawl?.startUrl || url;
      content.value = data.crawl?.content || "";
      crawlStatus.textContent = "Crawled " + (data.crawl?.pages?.length || 0) + " page(s). Chatbot preview was built from this website source.";
      thread.innerHTML = "";
      addBubble("bot", "I crawled the website, extracted sourceRefs, and built the chatbot preview from that source.");
      addBubble("owner", url);
      addBubble("bot", data.preview?.assistantMessage || "Website build completed.");
      renderPreview(data.preview);
    }
  </script>
</body>
</html>`;
}
