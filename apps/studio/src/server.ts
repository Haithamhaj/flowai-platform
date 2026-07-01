import { createServer } from "node:http";
import { buildOwnerFirstPreview, getDefaultOwnerInput, type OwnerFirstPreviewInput } from "./index.js";

const port = Number.parseInt(process.env.PORT ?? "4177", 10);
const host = process.env.HOST ?? "127.0.0.1";

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

  if (request.method === "GET" && url.pathname === "/") {
    send(response, 200, "text/html; charset=utf-8", renderHtml());
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
      sendJson(response, 200, buildOwnerFirstPreview(input));
    } catch (error) {
      sendJson(response, 400, {
        error: "invalid_request",
        message: error instanceof Error ? error.message : "Request could not be processed."
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
    content: record.content
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
    button, textarea, input { font: inherit; }
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
    textarea { width: 100%; min-height: 170px; resize: vertical; border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fff; color: var(--text); line-height: 1.45; }
    input { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; min-width: 0; }
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
    .ok { color: var(--ok); }
    .danger { color: var(--danger); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .conversation { display: grid; gap: 8px; }
    .turn { border-left: 3px solid var(--line); padding-left: 10px; }
    .turn.owner { border-color: var(--accent); }
    .turn.bot { border-color: #476582; }
    .preview-phone { background: #edf7f5; border: 1px solid #badbd5; border-radius: 8px; padding: 12px; display: grid; gap: 8px; }
    .button-chip { display: inline-block; padding: 5px 8px; border-radius: 6px; background: #d4ece7; margin: 4px 4px 0 0; font-size: 12px; }
    @media (max-width: 980px) {
      main { grid-template-columns: 1fr; }
      .chat { border-right: 0; border-bottom: 1px solid var(--line); min-height: auto; }
      .grid { grid-template-columns: 1fr; }
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
    const content = document.getElementById("content");
    const build = document.getElementById("build");
    const loadSample = document.getElementById("loadSample");

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
        body: JSON.stringify({ filename: filename.value, mimeType: filename.value.endsWith(".txt") ? "text/plain" : "text/markdown", content: ownerText })
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
        "<div class='grid'>" + renderBusiness(preview) + renderWorkflow(preview) + "</div>",
        "<div class='grid'>" + renderSource(preview) + renderTelegram(preview) + "</div>",
        renderRuntime(preview),
        renderSafety(preview)
      ].join("");
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

    function renderSource(preview) {
      const source = preview.sourcePanel;
      return "<section><h2>SourceDocument / sourceRefs</h2><p><strong>" + escapeHtml(source.filename) + "</strong></p><p class='muted'>" + escapeHtml(source.documentId || "No document id") + "</p><div class='mono'>" + escapeHtml(source.reviewExcerpt || "No excerpt") + "</div><h3>Refs</h3><ul>" + source.sourceRefs.map(r => "<li>" + escapeHtml(r.label) + " · " + escapeHtml(r.locator) + "</li>").join("") + "</ul><h3>Warnings</h3><ul>" + source.warnings.map(w => "<li>" + escapeHtml(w) + "</li>").join("") + "</ul></section>";
    }

    function renderTelegram(preview) {
      return "<section><h2>Telegram mock preview</h2><div class='preview-phone'>" + preview.telegramPreview.map(m => "<div><p>" + escapeHtml(m.text) + "</p>" + m.buttons.map(b => "<span class='button-chip'>" + escapeHtml(b) + "</span>").join("") + "</div>").join("") + "</div><p class='muted'>Mock preview only. No Telegram bot is running.</p></section>";
    }

    function renderRuntime(preview) {
      return "<section><h2>Runtime test conversation</h2><div class='conversation'>" + preview.runtimeConversation.map(t => "<div class='turn " + escapeHtml(t.from) + "'><strong>" + escapeHtml(t.from) + "</strong><div>" + t.messages.map(escapeHtml).join("<br>") + "</div></div>").join("") + "</div></section>";
    }

    function renderSafety(preview) {
      return "<section><h2>Safety boundaries</h2><ul>" + preview.safetyNotes.map(note => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul></section>";
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }

    build.addEventListener("click", runBuild);
    loadSample.addEventListener("click", loadDefault);
    loadDefault();
  </script>
</body>
</html>`;
}
