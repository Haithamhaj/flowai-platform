export function renderCustomerChatHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>FlowAI Customer Builder</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6f8;
      --panel: #ffffff;
      --panel-2: #eef4f7;
      --ink: #1f2933;
      --muted: #61717f;
      --line: #d8e0e7;
      --brand: #0f766e;
      --brand-2: #245b86;
      --warn: #a85b18;
      --danger: #b42318;
      --ok: #087443;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink); }
    button, textarea, input { font: inherit; }
    button { border: 0; border-radius: 8px; padding: 10px 14px; background: var(--brand); color: #fff; font-weight: 700; cursor: pointer; }
    button.secondary { background: #334155; }
    button.ghost { background: transparent; color: var(--brand-2); border: 1px solid var(--line); }
    button:disabled { cursor: not-allowed; opacity: 0.58; }
    input, textarea { width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 11px 12px; color: var(--ink); background: #fff; }
    textarea { min-height: 52px; max-height: 180px; resize: vertical; line-height: 1.45; }
    .app { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 18px; background: var(--panel); border-bottom: 1px solid var(--line); }
    .brand { display: flex; flex-direction: column; gap: 2px; }
    .brand strong { font-size: 17px; }
    .brand span, .muted { color: var(--muted); font-size: 13px; line-height: 1.45; }
    .layout { display: grid; grid-template-columns: minmax(360px, 0.95fr) minmax(420px, 1.05fr); min-height: 0; }
    .chat { min-height: calc(100vh - 59px); display: grid; grid-template-rows: 1fr auto; background: var(--panel); border-right: 1px solid var(--line); }
    .thread { padding: 22px; overflow: auto; display: flex; flex-direction: column; gap: 12px; }
    .bubble { max-width: 84%; border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; line-height: 1.45; background: var(--panel-2); white-space: pre-wrap; overflow-wrap: anywhere; }
    .bubble.bot { align-self: flex-start; }
    .bubble.owner { align-self: flex-end; background: #e7f6f1; border-color: #b8ded4; }
    .bubble.system { align-self: center; max-width: 96%; color: var(--muted); background: #fff8eb; border-color: #e7ca9b; }
    .composer { display: grid; gap: 10px; padding: 14px; border-top: 1px solid var(--line); background: #fbfcfd; }
    .row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .file-label { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; color: var(--brand-2); background: #fff; font-weight: 700; cursor: pointer; }
    .file-label input { display: none; }
    .toggle { display: inline-flex; gap: 7px; align-items: center; color: var(--muted); font-size: 13px; }
    .toggle input { width: 16px; height: 16px; }
    .review { min-height: calc(100vh - 59px); overflow: auto; padding: 18px; display: grid; gap: 12px; align-content: start; }
    section, .card { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    h1, h2, h3 { margin: 0; letter-spacing: 0; }
    h1 { font-size: 21px; line-height: 1.25; }
    h2 { font-size: 15px; margin-bottom: 9px; }
    h3 { font-size: 13px; margin: 12px 0 6px; color: var(--muted); }
    p { margin: 0 0 8px; line-height: 1.45; }
    ul { margin: 7px 0 0; padding-left: 19px; }
    li { margin: 4px 0; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .pill { display: inline-flex; align-items: center; min-height: 25px; border: 1px solid var(--line); border-radius: 999px; padding: 3px 8px; font-size: 12px; color: var(--muted); background: #f8fafc; }
    .ok { color: var(--ok); }
    .danger { color: var(--danger); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .workflow-card { border-color: #9ccdc4; background: #f1faf7; }
    .editor { display: none; grid-template-columns: minmax(280px, 0.8fr) minmax(320px, 1.2fr); gap: 12px; }
    .editor.open { display: grid; }
    .node-list { display: grid; gap: 7px; }
    .node-btn { text-align: left; border: 1px solid var(--line); color: var(--ink); background: #fff; font-weight: 650; }
    .node-btn.selected { border-color: var(--brand); background: #e7f6f1; }
    .preview-phone { background: #edf7f5; border: 1px solid #b7dcd4; border-radius: 8px; padding: 12px; display: grid; gap: 8px; }
    .button-chip { display: inline-block; padding: 5px 8px; border-radius: 6px; background: #d5ece7; margin: 4px 4px 0 0; font-size: 12px; }
    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .chat, .review { min-height: auto; }
      .chat { border-right: 0; border-bottom: 1px solid var(--line); }
      .grid, .editor { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app" id="customerChatApp">
    <header>
      <div class="brand">
        <strong>FlowAI</strong>
        <span>Customer chatbot builder</span>
      </div>
      <a class="muted" href="/">Studio review</a>
    </header>
    <main class="layout">
      <section class="chat" aria-label="Customer chat">
        <div class="thread" id="customerThread"></div>
        <form class="composer" id="customerComposer">
          <input id="customerLink" placeholder="Paste a website link here" inputmode="url" />
          <textarea id="customerMessage" placeholder="Tell FlowAI about your business, services, FAQs, or the chatbot you need."></textarea>
          <div class="toolbar">
            <label class="file-label">Attach text file
              <input id="customerFile" type="file" accept=".txt,.md,text/plain,text/markdown" />
            </label>
            <label class="toggle"><input id="customerLiveAi" type="checkbox" />Live AI review</label>
            <label class="toggle"><input id="customerKnowledge" type="checkbox" />RAG search</label>
            <button id="customerSend" type="submit">Send</button>
          </div>
        </form>
      </section>
      <aside class="review" id="customerReview">
        <section>
          <h1>Chat with FlowAI to build the chatbot</h1>
          <p class="muted">This customer screen uses the same local pipeline as Studio: source document, business understanding, workflow generation, runtime test, and channel mock preview.</p>
        </section>
        <section class="workflow-card">
          <h2>Workflow</h2>
          <p class="muted">No workflow built yet.</p>
          <button id="openWorkflowEditor" type="button" disabled>Open workflow editor</button>
        </section>
        <section class="editor" id="customerWorkflowEditor" aria-label="Customer workflow editor">
          <div class="card">
            <h2>Nodes</h2>
            <div class="node-list" id="customerNodeList"></div>
          </div>
          <div class="card">
            <h2>Edit selected node</h2>
            <p class="muted" id="customerSelectedNode">Select a node after building a workflow.</p>
            <textarea id="customerNodeText"></textarea>
            <div class="toolbar">
              <button id="customerSaveNode" type="button">Save text</button>
              <button class="ghost" id="customerCopyJson" type="button">Copy JSON</button>
            </div>
          </div>
        </section>
      </aside>
    </main>
  </div>
  <script>
    const thread = document.getElementById("customerThread");
    const review = document.getElementById("customerReview");
    const composer = document.getElementById("customerComposer");
    const message = document.getElementById("customerMessage");
    const link = document.getElementById("customerLink");
    const file = document.getElementById("customerFile");
    const liveAi = document.getElementById("customerLiveAi");
    const knowledge = document.getElementById("customerKnowledge");
    const openWorkflowEditor = document.getElementById("openWorkflowEditor");
    const workflowEditor = document.getElementById("customerWorkflowEditor");
    const nodeList = document.getElementById("customerNodeList");
    const selectedNode = document.getElementById("customerSelectedNode");
    const nodeText = document.getElementById("customerNodeText");
    const saveNode = document.getElementById("customerSaveNode");
    const copyJson = document.getElementById("customerCopyJson");
    let currentPreview = null;
    let currentWorkflowModel = null;
    let selectedNodeId = null;

    addBubble("bot", "Tell me what kind of chatbot you want. You can describe the business, attach a .md or .txt file, or paste a website link.");

    composer.addEventListener("submit", async (event) => {
      event.preventDefault();
      await sendCustomerMessage();
    });

    file.addEventListener("change", async () => {
      const selected = file.files && file.files[0];
      if (!selected) return;
      if (!isSupportedTextFile(selected)) {
        addBubble("system", "Only .md and .txt text files are accepted in this local demo. PDF, OCR, and server upload are not active here.");
        file.value = "";
        return;
      }
      if (selected.size > 200000) {
        addBubble("system", "This local demo accepts files up to 200 KB so the review stays quick.");
        file.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const text = String(reader.result || "");
        addBubble("owner", "Attached " + selected.name + "\\n\\n" + text.slice(0, 420));
        await buildFromText(text, {
          filename: selected.name,
          mimeType: selected.name.endsWith(".txt") ? "text/plain" : "text/markdown",
          sourceKind: "document_text"
        });
      };
      reader.onerror = () => addBubble("system", "Could not read this file in the browser.");
      reader.readAsText(selected);
    });

    openWorkflowEditor.addEventListener("click", () => {
      workflowEditor.classList.toggle("open");
      renderNodeEditor();
    });

    saveNode.addEventListener("click", async () => {
      if (!currentWorkflowModel || !selectedNodeId) return;
      await sendWorkflowCommand({ type: "edit_node_text", nodeId: selectedNodeId, text: nodeText.value });
    });

    copyJson.addEventListener("click", async () => {
      if (!currentWorkflowModel) return;
      await navigator.clipboard.writeText(JSON.stringify(currentWorkflowModel.workflowJson, null, 2));
      addBubble("bot", "Workflow JSON copied. It remains strict JSON and can be handed to another system later.");
    });

    async function sendCustomerMessage() {
      const text = message.value.trim();
      const url = link.value.trim() || firstUrl(text);
      if (!text && !url) return;
      addBubble("owner", text || url);
      message.value = "";
      if (url) {
        await buildFromWebsite(url);
        return;
      }
      await buildFromText(text, {
        filename: "customer-chat.md",
        mimeType: "text/markdown",
        sourceKind: "business_description"
      });
    }

    async function buildFromWebsite(url) {
      setReviewStatus("Crawling website and building chatbot preview...");
      const response = await fetch("/api/crawl-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          maxPages: 5,
          useLiveAi: Boolean(liveAi.checked),
          useKnowledgeSearch: Boolean(knowledge.checked),
          knowledgeSearchQuery: "What should the chatbot know about this business?"
        })
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        addBubble("system", "Website review failed: " + (payload.error?.message || "Unable to crawl this URL."));
        setReviewStatus("Website crawling did not complete.");
        return;
      }
      addBubble("bot", payload.preview?.assistantMessage || "I reviewed the website and drafted a workflow.");
      renderPreview(payload.preview, payload.crawl);
    }

    async function buildFromText(content, source) {
      setReviewStatus("Reading source and building chatbot preview...");
      const response = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: source.filename,
          mimeType: source.mimeType,
          sourceKind: source.sourceKind,
          sourceUrl: link.value.trim() || undefined,
          content,
          useLiveAi: Boolean(liveAi.checked),
          useKnowledgeSearch: Boolean(knowledge.checked),
          knowledgeSearchQuery: "What should the chatbot know about this business?"
        })
      });
      const preview = await response.json();
      if (!response.ok) {
        addBubble("system", "Build failed: " + (preview.message || "Unable to process this input."));
        setReviewStatus("Build failed.");
        return;
      }
      addBubble("bot", preview.assistantMessage || "I drafted a workflow from this source.");
      renderPreview(preview, null);
    }

    function renderPreview(preview, crawl) {
      currentPreview = preview;
      currentWorkflowModel = preview.visualWorkflow || null;
      selectedNodeId = currentWorkflowModel?.nodes?.[0]?.id || null;
      const source = preview.sourcePanel || {};
      const brief = preview.businessBrief || {};
      const proposal = preview.workflowProposal || {};
      const summary = preview.workflowSummary || {};
      const workflowNodes = summary.nodes || [];
      const workflowCard = currentWorkflowModel
        ? "<section class='workflow-card'><h2>Generated WorkflowDefinition</h2><p><strong>" + escapeHtml(summary.name || "Workflow draft") + "</strong></p><p class='muted'>" + escapeHtml(String(summary.nodeCount || workflowNodes.length || 0)) + " nodes · valid=" + escapeHtml(String(summary.valid ?? "unknown")) + "</p><div class='mono'>" + escapeHtml(workflowNodes.map(node => node.id + " : " + node.type).join("\\n")) + "</div><div class='toolbar'><button id='openWorkflowEditor' type='button'>Open workflow editor</button><button class='ghost' id='customerCopyJson' type='button'>Copy JSON</button></div></section>"
        : "<section class='workflow-card'><h2>Generated WorkflowDefinition</h2><p class='muted'>FlowAI needs more structured business details before it can create a valid Workflow JSON draft.</p><h3>Missing or blocked items</h3><ul>" + (proposal.blockers || ["Add services, required customer fields, and handoff rules."]).map(item => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul><button id='openWorkflowEditor' type='button' disabled>Open workflow editor</button></section>";
      const workflowEditor = currentWorkflowModel
        ? "<section class='editor' id='customerWorkflowEditor' aria-label='Customer workflow editor'><div class='card'><h2>Nodes</h2><div class='node-list' id='customerNodeList'></div></div><div class='card'><h2>Edit selected node</h2><p class='muted' id='customerSelectedNode'></p><textarea id='customerNodeText'></textarea><div class='toolbar'><button id='customerSaveNode' type='button'>Save text</button><button class='ghost' id='customerCopyJsonInline' type='button'>Copy JSON</button></div></div></section>"
        : "<section class='editor' id='customerWorkflowEditor' aria-label='Customer workflow editor'></section>";
      review.innerHTML = [
        "<section><h1>" + escapeHtml(brief.businessName || "Business chatbot draft") + "</h1><p class='muted'>" + escapeHtml(brief.category || "Business") + " · " + escapeHtml(brief.language || "unknown") + "</p><p>" + escapeHtml(brief.summary || "FlowAI created a review draft from the provided source.") + "</p></section>",
        renderSource(source, crawl),
        "<section><h2>BusinessUnderstanding draft</h2><div class='grid'><div><h3>Services</h3><ul>" + (brief.services || []).map(service => "<li>" + escapeHtml(service.name) + "</li>").join("") + "</ul></div><div><h3>FAQs</h3><ul>" + (brief.faqs || []).map(faq => "<li>" + escapeHtml(faq.question) + "</li>").join("") + "</ul></div></div></section>",
        "<section><h2>WorkflowGenerationPlan</h2><p><strong>" + escapeHtml(proposal.selectedTemplate || "No template") + "</strong></p><div class='pill-row'>" + (proposal.capabilities || []).map(capability => "<span class='pill'>" + escapeHtml(capability) + "</span>").join("") + "</div><h3>Required fields</h3><p>" + escapeHtml((proposal.requiredFields || []).join(", ") || "No required fields found yet.") + "</p></section>",
        workflowCard,
        renderRuntime(preview.runtimeConversation || []),
        renderTelegram(preview.telegramPreview || []),
        workflowEditor,
        renderSafety(preview.safetyNotes || [])
      ].join("");
      bindDynamicControls();
      renderNodeEditor();
    }

    function bindDynamicControls() {
      document.getElementById("openWorkflowEditor")?.addEventListener("click", () => {
        document.getElementById("customerWorkflowEditor")?.classList.toggle("open");
        renderNodeEditor();
      });
      document.getElementById("customerCopyJson")?.addEventListener("click", copyWorkflowJson);
      document.getElementById("customerCopyJsonInline")?.addEventListener("click", copyWorkflowJson);
      document.getElementById("customerSaveNode")?.addEventListener("click", async () => {
        const text = document.getElementById("customerNodeText")?.value || "";
        if (!currentWorkflowModel || !selectedNodeId) return;
        await sendWorkflowCommand({ type: "edit_node_text", nodeId: selectedNodeId, text });
      });
    }

    function renderNodeEditor() {
      const list = document.getElementById("customerNodeList");
      const label = document.getElementById("customerSelectedNode");
      const text = document.getElementById("customerNodeText");
      if (!list || !label || !text || !currentWorkflowModel) return;
      list.innerHTML = currentWorkflowModel.nodes.map(node => "<button class='node-btn " + (node.id === selectedNodeId ? "selected" : "") + "' type='button' data-node='" + escapeHtml(node.id) + "'>" + escapeHtml(node.name || node.id) + "<br><span class='muted'>" + escapeHtml(node.type) + "</span></button>").join("");
      list.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
        selectedNodeId = button.getAttribute("data-node");
        renderNodeEditor();
      }));
      const selected = currentWorkflowModel.nodes.find(node => node.id === selectedNodeId) || currentWorkflowModel.nodes[0];
      if (!selected) return;
      label.textContent = selected.id + " · " + selected.type;
      text.value = selected.text || "";
      text.disabled = !selected.editable;
    }

    async function sendWorkflowCommand(command) {
      const response = await fetch("/api/workflow-editor/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: currentWorkflowModel.workflowJson, command })
      });
      const payload = await response.json();
      if (!response.ok) {
        addBubble("system", "Workflow edit failed: " + (payload.message || "Invalid edit."));
        return;
      }
      currentWorkflowModel = payload.model;
      selectedNodeId = command.nodeId || selectedNodeId;
      addBubble("bot", "Workflow updated. Runtime test and channel mock preview were refreshed.");
      renderNodeEditor();
      refreshEditedPanels(payload);
    }

    function refreshEditedPanels(payload) {
      const runtime = document.getElementById("customerRuntime");
      const telegram = document.getElementById("customerTelegram");
      if (runtime) runtime.outerHTML = renderRuntime(payload.runtimeConversation || []);
      if (telegram) telegram.outerHTML = renderTelegram(payload.telegramPreview || []);
    }

    function renderSource(source, crawl) {
      const crawlLine = crawl ? "<p class='muted'>Crawled " + escapeHtml(String(crawl.pages?.length || 0)) + " public page(s) from " + escapeHtml(crawl.startUrl || "") + ".</p>" : "";
      return "<section><h2>SourceDocument / sourceRefs</h2><p><strong>" + escapeHtml(source.filename || "customer source") + "</strong></p><p class='muted'>" + escapeHtml(source.sourceKind || "business_description") + (source.sourceUrl ? " · " + escapeHtml(source.sourceUrl) : "") + "</p>" + crawlLine + "<div class='mono'>" + escapeHtml(source.reviewExcerpt || "No source excerpt.") + "</div><h3>sourceRefs</h3><ul>" + (source.sourceRefs || []).map(ref => "<li>" + escapeHtml(ref.label) + " · " + escapeHtml(ref.locator) + "</li>").join("") + "</ul></section>";
    }

    function renderRuntime(turns) {
      return "<section id='customerRuntime'><h2>Runtime test conversation</h2>" + turns.map(turn => "<div class='card'><p><strong>" + escapeHtml(turn.from) + "</strong></p><p>" + escapeHtml((turn.messages || []).join("\\n")) + "</p></div>").join("") + "</section>";
    }

    function renderTelegram(messages) {
      return "<section id='customerTelegram'><h2>Telegram preview mock</h2><div class='preview-phone'>" + messages.map(message => "<div><p>" + escapeHtml(message.text) + "</p>" + (message.buttons || []).map(button => "<span class='button-chip'>" + escapeHtml(button) + "</span>").join("") + "</div>").join("") + "</div><p class='muted'>Preview only. No live Telegram bot is running.</p></section>";
    }

    function renderSafety(notes) {
      return "<section><h2>Boundaries</h2><ul>" + notes.concat(["File attach is browser text-only. No server upload endpoint, PDF parsing, OCR, persistence, WhatsApp, or live channel delivery is active in this screen."]).map(note => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul></section>";
    }

    function setReviewStatus(text) {
      review.innerHTML = "<section><h1>" + escapeHtml(text) + "</h1><p class='muted'>FlowAI is using the existing local pipeline behind this customer chat.</p></section>";
    }

    function addBubble(kind, text) {
      const bubble = document.createElement("div");
      bubble.className = "bubble " + kind;
      bubble.textContent = text;
      thread.appendChild(bubble);
      thread.scrollTop = thread.scrollHeight;
    }

    function firstUrl(text) {
      const match = text.match(/https?:\\/\\/[^\\s]+/);
      return match ? match[0] : "";
    }

    function isSupportedTextFile(value) {
      const name = value.name.toLowerCase();
      return name.endsWith(".md") || name.endsWith(".txt") || value.type === "text/plain" || value.type === "text/markdown";
    }

    async function copyWorkflowJson() {
      if (!currentWorkflowModel) return;
      await navigator.clipboard.writeText(JSON.stringify(currentWorkflowModel.workflowJson, null, 2));
      addBubble("bot", "Workflow JSON copied.");
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
  </script>
</body>
</html>`;
}
