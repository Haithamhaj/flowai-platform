const state = {
  fixtures: {},
  selectedUseCase: "clinic",
  mode: "deterministic",
  analysis: null
};

const els = {
  app: document.getElementById("app"),
  useCaseList: document.getElementById("useCaseList"),
  sourceText: document.getElementById("sourceText"),
  aiToggle: document.getElementById("aiToggle"),
  analyzeButton: document.getElementById("analyzeButton"),
  customButton: document.getElementById("customButton"),
  statusStrip: document.getElementById("statusStrip"),
  aiBadge: document.getElementById("aiBadge"),
  brainSummary: document.getElementById("brainSummary"),
  factsEditor: document.getElementById("factsEditor"),
  businessUnderstanding: document.getElementById("businessUnderstanding"),
  workflowPlan: document.getElementById("workflowPlan"),
  validationBadge: document.getElementById("validationBadge"),
  workflowGraph: document.getElementById("workflowGraph"),
  workflowJson: document.getElementById("workflowJson"),
  copyJsonButton: document.getElementById("copyJsonButton"),
  replayButton: document.getElementById("replayButton"),
  chatTranscript: document.getElementById("chatTranscript"),
  telegramPreview: document.getElementById("telegramPreview")
};

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    els.app.className = `app shell-${button.dataset.mode}`;
  });
});

els.aiToggle.addEventListener("change", () => {
  state.mode = els.aiToggle.checked ? "ai_assisted" : "deterministic";
  analyze();
});

els.analyzeButton.addEventListener("click", analyze);
els.replayButton.addEventListener("click", analyze);
els.customButton.addEventListener("click", () => {
  state.selectedUseCase = "custom";
  renderUseCases();
  els.sourceText.value = "# Custom Business\nCategory: service company\nGoal: Paste your business source material here.\n\nServices:\n- Example service - Describe what the customer can request.\n\nRequired fields:\n- customer name: text required\n- phone: phone required\n";
  analyze();
});

els.copyJsonButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.workflowJson.textContent || "");
  els.copyJsonButton.textContent = "Copied";
  setTimeout(() => {
    els.copyJsonButton.textContent = "Copy JSON";
  }, 1200);
});

await boot();

async function boot() {
  const [healthResponse, fixtureResponse] = await Promise.all([
    fetch("/health"),
    fetch("/demo/flowai/fixtures")
  ]);
  const health = await healthResponse.json();
  state.fixtures = await fixtureResponse.json();
  renderUseCases();
  selectUseCase("clinic");
  renderStatus([{ label: health.aiEnabled ? "AI key configured backend-only" : "AI mode unavailable: OPENAI_API_KEY not configured", tone: health.aiEnabled ? "success" : "warning" }]);
  await analyze();
}

function renderUseCases() {
  els.useCaseList.innerHTML = "";
  const entries = Object.values(state.fixtures);
  for (const fixture of entries) {
    const button = document.createElement("button");
    button.className = `use-case ${fixture.id === state.selectedUseCase ? "active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(fixture.title)}</strong><span>${escapeHtml(fixture.subtitle)}</span>`;
    button.addEventListener("click", () => selectUseCase(fixture.id));
    els.useCaseList.appendChild(button);
  }
}

function selectUseCase(id) {
  state.selectedUseCase = id;
  renderUseCases();
  const fixture = state.fixtures[id];
  if (fixture) els.sourceText.value = fixture.sourceText;
  els.sourceText.classList.toggle("rtl", id === "arabic");
  analyze();
}

async function analyze() {
  els.analyzeButton.disabled = true;
  els.analyzeButton.textContent = "Analyzing";
  try {
    const response = await fetch("/demo/flowai/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sourceText: els.sourceText.value,
        mode: state.mode,
        useCaseHint: state.selectedUseCase
      })
    });
    state.analysis = await response.json();
    if (!response.ok) throw new Error(state.analysis.error || "Analysis failed.");
    renderAnalysis();
  } catch (error) {
    renderStatus([{ label: error.message, tone: "danger" }]);
  } finally {
    els.analyzeButton.disabled = false;
    els.analyzeButton.textContent = "Analyze Business";
  }
}

function renderAnalysis() {
  const analysis = state.analysis;
  const aiTone = analysis.aiStatus.enabled ? "success" : analysis.aiStatus.requested ? "warning" : "";
  els.aiBadge.className = `badge ${aiTone}`;
  els.aiBadge.textContent = analysis.aiStatus.enabled ? "AI enabled" : "AI off";

  renderStatus([
    { label: `SourceDocument: ${analysis.sourceDocument.status}`, tone: "success" },
    { label: `Facts confidence: ${percent(analysis.deterministicFacts.confidence)}`, tone: "success" },
    { label: `Workflow: ${analysis.workflow ? "generated" : "blocked"}`, tone: analysis.workflow ? "success" : "danger" },
    { label: `Validation: ${analysis.validation.valid ? "valid" : "issues"}`, tone: analysis.validation.valid ? "success" : "danger" },
    { label: analysis.telegramPreview.label, tone: "warning" }
  ]);

  els.brainSummary.innerHTML = [
    kv("Mode", analysis.aiStatus.message),
    kv("Model", analysis.aiStatus.model || "none"),
    kv("Source refs", String(analysis.sourceDocument.sourceRefs.length)),
    kv("Assumptions", String(analysis.businessUnderstanding.assumptions.length)),
    kv("Missing questions", String(analysis.businessUnderstanding.missingQuestions.length)),
    kv("Warnings", analysis.warnings.join(" | ") || "none")
  ].join("");

  renderFacts(analysis.businessUnderstanding);
  renderStructured(els.businessUnderstanding, compactBu(analysis.businessUnderstanding));
  renderStructured(els.workflowPlan, {
    selectedTemplate: analysis.workflowPlan.selectedTemplate,
    selectedScenarios: analysis.workflowPlan.selectedScenarios,
    selectedCapabilities: analysis.workflowPlan.selectedCapabilities,
    requiredFields: analysis.workflowPlan.requiredFields,
    blockers: analysis.workflowPlan.missingBlockers,
    warnings: analysis.workflowPlan.warnings,
    why: analysis.workflowPlan.assumptions
  });
  renderWorkflow(analysis.workflow);
  renderChat(analysis.runtimeTranscript);
  renderTelegram(analysis.telegramPreview.messages);
  els.workflowJson.textContent = analysis.workflow ? JSON.stringify(analysis.workflow, null, 2) : JSON.stringify(analysis.generationReport, null, 2);
  els.validationBadge.className = `badge ${analysis.validation.valid ? "success" : "danger"}`;
  els.validationBadge.textContent = analysis.validation.valid ? "valid workflow" : "blocked";
}

function renderStatus(items) {
  els.statusStrip.innerHTML = items.map((item) => `<span class="status-pill ${item.tone || ""}">${escapeHtml(item.label)}</span>`).join("");
}

function renderFacts(bu) {
  const fields = [
    ["Business name", bu.businessName || "Unknown"],
    ["Category", bu.category || "Unknown"],
    ["Summary", bu.summary],
    ["Services", bu.services.map((service) => service.name).join(", ") || "None"],
    ["FAQs", String(bu.faqs.length)],
    ["Policies", bu.policies.map((policy) => policy.title).join(", ") || "None"],
    ["Forms", bu.forms.map((form) => form.name).join(", ") || "None"],
    ["Scenarios", bu.scenarios.map((scenario) => scenario.name).join(", ") || "None"],
    ["Unknowns", bu.unknowns.map((item) => item.field).join(", ") || "None"],
    ["Conflicts", bu.conflicts.length ? JSON.stringify(bu.conflicts) : "None"]
  ];

  els.factsEditor.innerHTML = fields.map(([label, value]) => `
    <div class="field-card">
      <label>${escapeHtml(label)}</label>
      <input value="${escapeAttr(value)}" />
      <span>Editable review field. Click Analyze Business after editing source for regeneration.</span>
    </div>
  `).join("");
}

function renderStructured(target, value) {
  target.innerHTML = `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function renderWorkflow(workflow) {
  if (!workflow) {
    els.workflowGraph.innerHTML = `<div class="field-card"><strong>Blocked</strong><p>FlowAI refused to generate a workflow because source-backed requirements are missing.</p></div>`;
    return;
  }

  const edgesBySource = new Map();
  for (const edge of workflow.edges) {
    if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
    edgesBySource.get(edge.source).push(edge);
  }

  els.workflowGraph.innerHTML = workflow.nodes.map((node) => {
    const targets = (edgesBySource.get(node.id) || []).map((edge) => edge.target).join(", ") || "terminal";
    return `
      <div class="node-row">
        <div class="node-card ${escapeAttr(node.type)}">
          <strong>${escapeHtml(node.name || node.id)}</strong>
          <span>${escapeHtml(node.type)}</span>
          <p>${escapeHtml(nodeSummary(node))}</p>
        </div>
        <div class="edge">to ${escapeHtml(targets)}</div>
      </div>
    `;
  }).join("");
}

function renderChat(transcript) {
  els.chatTranscript.innerHTML = transcript.map((message) => `
    <div class="message ${message.role}">
      <strong>${escapeHtml(message.role)}</strong>
      <p>${escapeHtml(message.text)}</p>
      ${message.nodeId ? `<span>${escapeHtml(message.nodeId)}</span>` : ""}
    </div>
  `).join("");
}

function renderTelegram(messages) {
  if (!messages.length) {
    els.telegramPreview.innerHTML = `<div class="telegram-bubble">No Telegram messages because workflow generation is blocked.</div>`;
    return;
  }

  els.telegramPreview.innerHTML = messages.map((message) => `
    <div class="telegram-bubble">
      ${escapeHtml(message.text)}
      ${(message.replyMarkup?.inline_keyboard || []).flat().map((button) => `<div class="telegram-button">${escapeHtml(button.text)}</div>`).join("")}
    </div>
  `).join("");
}

function compactBu(bu) {
  return {
    id: bu.id,
    businessName: bu.businessName,
    category: bu.category,
    summary: bu.summary,
    sourceBackedFields: {
      services: bu.services.map((service) => ({ name: service.name, sourceRefs: service.sourceRefs, confidence: service.confidence })),
      faqs: bu.faqs.map((faq) => ({ question: faq.question, sourceRefs: faq.sourceRefs, confidence: faq.confidence })),
      policies: bu.policies.map((policy) => ({ title: policy.title, sourceRefs: policy.sourceRefs, confidence: policy.confidence }))
    },
    validationState: {
      confidence: bu.confidence,
      missingQuestions: bu.missingQuestions,
      assumptions: bu.assumptions,
      conflicts: bu.conflicts
    }
  };
}

function nodeSummary(node) {
  if (node.message) return node.message;
  if (node.prompt) return node.prompt;
  if (node.fields) return node.fields.map((field) => field.label).join(", ");
  return node.id;
}

function kv(label, value) {
  return `<div class="kv"><strong>${escapeHtml(label)}</strong><br /><span>${escapeHtml(value)}</span></div>`;
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
