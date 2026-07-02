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
      --bg: #f7f8fa;
      --panel: #ffffff;
      --panel-soft: #f1f5f8;
      --ink: #17212b;
      --muted: #667789;
      --line: #d9e2ea;
      --brand: #0f766e;
      --brand-dark: #115e59;
      --danger: #b42318;
      --ok: #087443;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink); }
    button, textarea, input { font: inherit; }
    button { border: 0; border-radius: 8px; padding: 10px 14px; background: var(--brand); color: #fff; font-weight: 700; cursor: pointer; }
    button.secondary { background: #334155; }
    button.ghost { background: #fff; color: var(--brand-dark); border: 1px solid var(--line); }
    button:disabled { cursor: not-allowed; opacity: 0.55; }
    input, textarea { border: 1px solid var(--line); border-radius: 8px; padding: 11px 12px; color: var(--ink); background: #fff; }
    textarea { min-height: 54px; max-height: 190px; resize: vertical; line-height: 1.45; }
    .app { height: 100vh; display: grid; grid-template-rows: auto 1fr auto; background: var(--panel); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 18px; border-bottom: 1px solid var(--line); }
    .brand { display: flex; flex-direction: column; gap: 2px; }
    .brand strong { font-size: 17px; }
    .brand span, .muted { color: var(--muted); font-size: 13px; line-height: 1.45; }
    .thread { overflow: auto; padding: 24px 18px; display: flex; flex-direction: column; gap: 16px; }
    .message { width: min(860px, 100%); margin: 0 auto; display: flex; gap: 12px; align-items: flex-start; }
    .message.owner { justify-content: flex-end; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto; background: var(--panel-soft); color: var(--muted); font-weight: 800; }
    .owner .avatar { order: 2; background: #dff3ed; color: var(--brand-dark); }
    .bubble { max-width: min(720px, calc(100vw - 96px)); border: 1px solid var(--line); border-radius: 8px; padding: 13px 15px; background: var(--panel-soft); line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
    .owner .bubble { background: #e8f6f1; border-color: #b6ded3; }
    .system .bubble { background: #fff7e8; border-color: #e7c68a; color: #6f4b16; }
    .bubble h2 { margin: 0 0 8px; font-size: 16px; letter-spacing: 0; }
    .bubble h3 { margin: 12px 0 6px; font-size: 13px; color: var(--muted); letter-spacing: 0; }
    .bubble p { margin: 0 0 8px; }
    .bubble ul { margin: 6px 0 0; padding-left: 20px; }
    .bubble li { margin: 4px 0; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .pill-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
    .pill { display: inline-flex; min-height: 24px; align-items: center; border: 1px solid var(--line); border-radius: 999px; padding: 3px 8px; font-size: 12px; color: var(--muted); background: #fff; }
    .composer-shell { border-top: 1px solid var(--line); background: rgba(255,255,255,0.96); padding: 12px 14px 16px; }
    .composer { width: min(860px, 100%); margin: 0 auto; display: grid; gap: 9px; }
    .link-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
    .message-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .file-label { border: 1px solid var(--line); border-radius: 8px; padding: 9px 12px; color: var(--brand-dark); background: #fff; font-weight: 700; cursor: pointer; }
    .file-label input { display: none; }
    .toggle { display: inline-flex; gap: 7px; align-items: center; color: var(--muted); font-size: 13px; }
    .toggle input { width: 16px; height: 16px; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.46); display: none; align-items: center; justify-content: center; padding: 18px; z-index: 10; }
    .modal-backdrop.open { display: flex; }
    .modal { width: min(980px, 100%); max-height: min(820px, 92vh); overflow: auto; background: #fff; border-radius: 8px; border: 1px solid var(--line); box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22); }
    .modal-head { position: sticky; top: 0; display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 14px 16px; background: #fff; border-bottom: 1px solid var(--line); }
    .modal-body { padding: 16px; display: grid; grid-template-columns: minmax(240px, 0.7fr) minmax(320px, 1fr); gap: 12px; }
    .card { border: 1px solid var(--line); border-radius: 8px; padding: 13px; background: #fff; }
    .node-list { display: grid; gap: 7px; }
    .node-btn { text-align: left; border: 1px solid var(--line); color: var(--ink); background: #fff; font-weight: 650; }
    .node-btn.selected { border-color: var(--brand); background: #e7f6f1; }
    .modal textarea { width: 100%; min-height: 120px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .ok { color: var(--ok); }
    .danger { color: var(--danger); }
    @media (max-width: 760px) {
      header { padding: 10px 12px; }
      .thread { padding: 16px 10px; }
      .bubble { max-width: calc(100vw - 72px); }
      .link-row, .message-row, .modal-body { grid-template-columns: 1fr; }
      .composer-shell { padding: 10px; }
      .modal-backdrop { padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="app" id="customerChatApp">
    <header>
      <div class="brand">
        <strong>FlowAI</strong>
        <span>AI chatbot builder</span>
      </div>
      <a class="muted" href="/">Studio review</a>
    </header>
    <main class="thread" id="customerThread" aria-live="polite"></main>
    <div class="composer-shell">
      <form class="composer" id="customerComposer">
        <div class="link-row">
          <input id="customerLink" placeholder="Paste a website link, or leave empty and chat normally" inputmode="url" />
          <button class="ghost" id="customerUseLink" type="button">Use link</button>
        </div>
        <div class="message-row">
          <textarea id="customerMessage" placeholder="Message FlowAI about the chatbot you want..."></textarea>
          <button id="customerSend" type="submit">Send</button>
        </div>
        <div class="toolbar">
          <label class="file-label">Attach .md/.txt
            <input id="customerFile" type="file" accept=".txt,.md,text/plain,text/markdown" />
          </label>
          <label class="toggle"><input id="customerLiveAi" type="checkbox" />Live AI review</label>
          <label class="toggle"><input id="customerKnowledge" type="checkbox" />RAG search</label>
          <span class="muted">PDF/OCR upload is not active in this local demo yet.</span>
        </div>
      </form>
    </div>
  </div>
  <div class="modal-backdrop" id="workflowModal" role="dialog" aria-modal="true" aria-label="Workflow editor">
    <div class="modal">
      <div class="modal-head">
        <div>
          <strong>Workflow preview</strong>
          <div class="muted">Edit node text without leaving the chat.</div>
        </div>
        <button class="ghost" id="closeWorkflowModal" type="button">Close</button>
      </div>
      <div class="modal-body" id="customerWorkflowEditor">
        <div class="card">
          <h2>Nodes</h2>
          <div class="node-list" id="customerNodeList"></div>
        </div>
        <div class="card">
          <h2>Edit selected node</h2>
          <p class="muted" id="customerSelectedNode">Build a workflow first.</p>
          <textarea id="customerNodeText"></textarea>
          <div class="actions">
            <button id="customerSaveNode" type="button">Save text</button>
            <button class="ghost" id="customerCopyJson" type="button">Copy JSON</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    const thread = document.getElementById("customerThread");
    const composer = document.getElementById("customerComposer");
    const message = document.getElementById("customerMessage");
    const link = document.getElementById("customerLink");
    const useLink = document.getElementById("customerUseLink");
    const file = document.getElementById("customerFile");
    const liveAi = document.getElementById("customerLiveAi");
    const knowledge = document.getElementById("customerKnowledge");
    const workflowModal = document.getElementById("workflowModal");
    const closeWorkflowModal = document.getElementById("closeWorkflowModal");
    const nodeList = document.getElementById("customerNodeList");
    const selectedNode = document.getElementById("customerSelectedNode");
    const nodeText = document.getElementById("customerNodeText");
    const saveNode = document.getElementById("customerSaveNode");
    const copyJson = document.getElementById("customerCopyJson");
    let currentWorkflowModel = null;
    let selectedNodeId = null;

    addMessage("bot", "أهلًا، أنا FlowAI. احكِ لي عن البزنس أو أرسل رابط موقع أو أرفق ملف نصي، وسأرجع لك داخل هذه المحادثة بما فهمته، ما ينقصني، وهل أقدر أبني الشجرة الآن.");

    composer.addEventListener("submit", async (event) => {
      event.preventDefault();
      await sendCustomerMessage();
    });

    useLink.addEventListener("click", async () => {
      const url = link.value.trim();
      if (!url) {
        addMessage("system", "ضع رابط الموقع أولًا، أو اكتب الرابط داخل المحادثة.");
        return;
      }
      addMessage("owner", url);
      await buildFromWebsite(url);
    });

    file.addEventListener("change", async () => {
      const selected = file.files && file.files[0];
      if (!selected) return;
      if (!isSupportedTextFile(selected)) {
        addMessage("system", "حاليًا أقبل ملفات .md و .txt فقط داخل المتصفح. PDF و OCR يحتاجان مهمة منفصلة لاحقًا.");
        file.value = "";
        return;
      }
      if (selected.size > 200000) {
        addMessage("system", "هذا الديمو المحلي يقبل ملفات حتى 200 KB فقط.");
        file.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        const text = String(reader.result || "");
        addMessage("owner", "أرفقت ملف: " + selected.name);
        await buildFromText(text, {
          filename: selected.name,
          mimeType: selected.name.endsWith(".txt") ? "text/plain" : "text/markdown",
          sourceKind: "document_text"
        });
      };
      reader.onerror = () => addMessage("system", "لم أستطع قراءة الملف داخل المتصفح.");
      reader.readAsText(selected);
    });

    closeWorkflowModal.addEventListener("click", closeWorkflow);
    workflowModal.addEventListener("click", (event) => {
      if (event.target === workflowModal) closeWorkflow();
    });
    saveNode.addEventListener("click", async () => {
      if (!currentWorkflowModel || !selectedNodeId) return;
      await sendWorkflowCommand({ type: "edit_node_text", nodeId: selectedNodeId, text: nodeText.value });
    });
    copyJson.addEventListener("click", copyWorkflowJson);

    async function sendCustomerMessage() {
      const text = message.value.trim();
      const url = link.value.trim() || firstUrl(text);
      if (!text && !url) return;
      addMessage("owner", text || url);
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
      addMessage("bot", "تمام، سأقرأ الموقع الآن وأرجع لك بالنتيجة هنا داخل المحادثة.");
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
        addMessage("system", "لم أستطع قراءة الموقع: " + (payload.error?.message || "الرابط غير قابل للقراءة حاليًا."));
        return;
      }
      appendAssistantResult(payload.preview, payload.crawl);
    }

    async function buildFromText(content, source) {
      addMessage("bot", "سأراجع المعلومات وأبني لك نتيجة قابلة للمراجعة داخل الشات.");
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
        addMessage("system", "لم أستطع بناء النتيجة: " + (preview.message || "المدخل غير قابل للمعالجة."));
        return;
      }
      appendAssistantResult(preview, null);
    }

    function appendAssistantResult(preview, crawl) {
      currentWorkflowModel = preview.visualWorkflow || null;
      selectedNodeId = currentWorkflowModel?.nodes?.[0]?.id || null;
      addRichMessage("bot", renderAssistantResult(preview, crawl));
      if (currentWorkflowModel) renderNodeEditor();
    }

    function renderAssistantResult(preview, crawl) {
      const brief = preview.businessBrief || {};
      const source = preview.sourcePanel || {};
      const proposal = preview.workflowProposal || {};
      const catalog = preview.productCatalog || {};
      const services = brief.services || [];
      const catalogItems = catalog.items || [];
      const faqs = brief.faqs || [];
      const blockers = proposal.blockers || [];
      const missingQuestions = brief.missingQuestions || [];
      const combinedMissing = [...missingQuestions, ...blockers].filter((item, index, items) => item && items.indexOf(item) === index);
      const fields = proposal.requiredFields || [];
      const sourceRefs = source.sourceRefs || [];
      const crawlNote = crawl ? "<p>قرأت " + escapeHtml(String(crawl.pages?.length || 0)) + " صفحات عامة من الموقع.</p>" : "";
      const sourceRefText = sourceRefs.length > 0 ? "<p class='muted'>sourceRefs: " + escapeHtml(sourceRefs.map(ref => ref.label).slice(0, 4).join(", ")) + "</p>" : "";
      const servicesHtml = services.length > 0
        ? "<ul>" + services.map(service => "<li>" + escapeHtml(service.name) + "</li>").join("") + "</ul>"
        : "<p class='muted'>لم أستخرج خدمات أو منتجات واضحة كفاية من المصدر.</p>";
      const catalogHtml = catalogItems.length > 0
        ? "<ul>" + catalogItems.map(item => "<li><strong>" + escapeHtml(item.name) + "</strong>" + (item.description ? "<br><span class='muted'>" + escapeHtml(item.description) + "</span>" : "") + "</li>").join("") + "</ul><p class='muted'>هذه عناصر كتالوج للمراجعة من المصدر. الأسعار والتوفر لا تُستخدم إلا إذا كانت واضحة ومسنودة بالمصدر.</p>"
        : "<p class='muted'>لم أجد كتالوج منتجات/باقات واضحًا بعد.</p>";
      const faqsHtml = faqs.length > 0
        ? "<ul>" + faqs.map(faq => "<li>" + escapeHtml(faq.question) + "</li>").join("") + "</ul>"
        : "<p class='muted'>لم أجد FAQ واضحة بعد.</p>";
      const missingHtml = combinedMissing.length > 0
        ? "<ul>" + combinedMissing.map(item => "<li>" + escapeHtml(item) + "</li>").join("") + "</ul>"
        : "<p class='ok'>المعلومات الأساسية كافية لبناء مسودة أولية.</p>";
      const fieldsHtml = fields.length > 0
        ? "<div class='pill-row'>" + fields.map(field => "<span class='pill'>" + escapeHtml(field) + "</span>").join("") + "</div>"
        : "<p class='muted'>لم يتم تحديد حقول جمع بيانات العميل بعد.</p>";

      return [
        "<h2>فهمت من المصدر</h2>",
        "<p><strong>" + escapeHtml(brief.businessName || "البزنس") + "</strong></p>",
        "<p>" + escapeHtml(brief.summary || "راجعت المصدر، لكن أحتاج تفاصيل أكثر حتى أخرج chatbot قابل للنشر.") + "</p>",
        crawlNote,
        sourceRefText,
        "<h3>الخدمات/المنتجات التي وجدتها</h3>",
        servicesHtml,
        "<h3>المنتجات/الباقات التي فهمتها</h3>",
        catalogHtml,
        "<h3>الأسئلة الشائعة</h3>",
        faqsHtml,
        "<h3>الحقول التي سيجمعها البوت</h3>",
        fieldsHtml,
        "<h3>المعلومات الناقصة</h3>",
        missingHtml,
        currentWorkflowModel ? renderWorkflowLinkMessage(preview) : renderBlockedWorkflowMessage()
      ].join("");
    }

    function renderWorkflowLinkMessage(preview) {
      const summary = preview.workflowSummary || {};
      return "<div class='actions'><button id='openWorkflowEditor' type='button'>افتح الشجرة</button><button class='ghost' id='copyWorkflowFromChat' type='button'>Copy workflow JSON</button></div><p class='muted'>تم بناء مسودة workflow: " + escapeHtml(summary.name || "Workflow draft") + " · " + escapeHtml(String(summary.nodeCount || 0)) + " nodes. يمكنك فتحها بدون مغادرة الشات.</p>";
    }

    function renderBlockedWorkflowMessage() {
      return "<p class='muted'>لم أبنِ الشجرة بعد. أرسل الخدمات والحقول المطلوبة مثل الاسم، الجوال، نوع الطلب، والمدينة، وسأبنيها لك.</p>";
    }

    function addMessage(kind, text) {
      const messageNode = document.createElement("article");
      messageNode.className = "message " + kind;
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = kind === "owner" ? "You" : "AI";
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = text;
      messageNode.append(avatar, bubble);
      thread.appendChild(messageNode);
      thread.scrollTop = thread.scrollHeight;
    }

    function addRichMessage(kind, html) {
      const messageNode = document.createElement("article");
      messageNode.className = "message " + kind;
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = kind === "owner" ? "You" : "AI";
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.innerHTML = html;
      messageNode.append(avatar, bubble);
      thread.appendChild(messageNode);
      bindChatActions(bubble);
      thread.scrollTop = thread.scrollHeight;
    }

    function bindChatActions(scope) {
      scope.querySelector("#openWorkflowEditor")?.addEventListener("click", openWorkflow);
      scope.querySelector("#copyWorkflowFromChat")?.addEventListener("click", copyWorkflowJson);
    }

    function openWorkflow() {
      if (!currentWorkflowModel) return;
      workflowModal.classList.add("open");
      renderNodeEditor();
    }

    function closeWorkflow() {
      workflowModal.classList.remove("open");
    }

    function renderNodeEditor() {
      if (!currentWorkflowModel) return;
      nodeList.innerHTML = currentWorkflowModel.nodes.map(node => "<button class='node-btn " + (node.id === selectedNodeId ? "selected" : "") + "' type='button' data-node='" + escapeHtml(node.id) + "'>" + escapeHtml(node.name || node.id) + "<br><span class='muted'>" + escapeHtml(node.type) + "</span></button>").join("");
      nodeList.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
        selectedNodeId = button.getAttribute("data-node");
        renderNodeEditor();
      }));
      const selected = currentWorkflowModel.nodes.find(node => node.id === selectedNodeId) || currentWorkflowModel.nodes[0];
      if (!selected) return;
      selectedNode.textContent = selected.id + " · " + selected.type;
      nodeText.value = selected.text || "";
      nodeText.disabled = !selected.editable;
    }

    async function sendWorkflowCommand(command) {
      if (!currentWorkflowModel?.workflowJson) return;
      const response = await fetch("/api/workflow-editor/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: currentWorkflowModel.workflowJson, command })
      });
      const payload = await response.json();
      if (!response.ok) {
        addMessage("system", "لم أستطع تعديل الشجرة: " + (payload.message || "التعديل غير صالح."));
        return;
      }
      currentWorkflowModel = payload.model;
      selectedNodeId = command.nodeId || selectedNodeId;
      renderNodeEditor();
      addMessage("bot", "تم تعديل نص العقدة وتحديث تجربة التشغيل المصغرة.");
    }

    async function copyWorkflowJson() {
      if (!currentWorkflowModel?.workflowJson) return;
      await navigator.clipboard.writeText(JSON.stringify(currentWorkflowModel.workflowJson, null, 2));
      addMessage("bot", "تم نسخ Workflow JSON. يبقى strict JSON ويمكن ربطه لاحقًا بأي CRM أو ticketing system.");
    }

    function firstUrl(text) {
      const match = text.match(/https?:\\/\\/[^\\s]+/);
      return match ? match[0] : "";
    }

    function isSupportedTextFile(value) {
      const name = value.name.toLowerCase();
      return name.endsWith(".md") || name.endsWith(".txt") || value.type === "text/plain" || value.type === "text/markdown";
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
  </script>
</body>
</html>`;
}
