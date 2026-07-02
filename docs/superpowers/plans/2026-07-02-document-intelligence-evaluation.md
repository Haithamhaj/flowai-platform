# Document Intelligence Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document the approved evaluation path for PDF/OCR, extraction, RAG/vector search, crawling, catalog extraction, and source-backed knowledge preparation before adding dependencies or provider integrations.

**Architecture:** This is a docs-only task. It creates a task file and an options document that keep document intelligence behind the source-ingestion/sourceRefs boundary and explicitly defer implementation until separate approved spike tasks.

**Tech Stack:** Markdown docs only; no runtime code, no package source, no new dependencies, no provider credentials.

---

### Task 1: Create TASK-020 Evaluation File

**Files:**
- Create: `docs/tasks/TASK-020_DOCUMENT_INTELLIGENCE_EVALUATION.md`

- [ ] **Step 1: Add task scope**

Create a task file that states the goal, scope, non-goals, acceptance criteria, test plan, risks, Skill/MCP readiness result, and next recommended task.

- [ ] **Step 2: Verify non-goals are explicit**

Confirm the file says no upload endpoints, parser dependencies, OCR implementation, Google integration, OpenAI vector store integration, RAG runtime, crawling implementation, persistence, auth, or production channel work.

### Task 2: Create Options And Decision Document

**Files:**
- Create: `docs/document-intelligence/DOCUMENT_INTELLIGENCE_OPTIONS.md`

- [ ] **Step 1: Compare candidate tools**

Document candidates for:
- PDF/OCR: MinerU, Docling, PaddleOCR, olmOCR.
- Extraction: Google Document AI OCR/Form Parser/Custom Extractor, OpenAI structured extraction.
- RAG/vector: OpenAI Vector Stores/File Search, local vector DB later.
- Crawling: Crawl4AI, Crawlee, Firecrawl as learn-only unless separately reviewed.

- [ ] **Step 2: Record recommendation**

Recommend evaluating extraction/sourceRefs before RAG, using MinerU/Docling/PaddleOCR fixture spikes first, Google Document AI as a separate cloud spike, OpenAI Vector Stores after chunk/sourceRefs exist, and crawling after document extraction.

### Task 3: Update Continuity Docs

**Files:**
- Modify: `project-state/PROJECT_STATE.md`
- Modify: `docs/10_DECISION_LOG.md`

- [ ] **Step 1: Update project state**

Mark TASK-020 as the active evaluation task and record that TASK-019 is merged/complete based on the known main state.

- [ ] **Step 2: Add decision log entry**

Add a concise decision entry that document intelligence starts with evaluation and sourceRefs, not RAG-first implementation.

### Task 4: Verify And Publish

**Files:**
- No additional files.

- [ ] **Step 1: Run docs check**

Run: `git diff --check`

Expected: command exits successfully.

- [ ] **Step 2: Review changed files**

Run: `git diff --stat`

Expected: only docs/project-state files changed.

- [ ] **Step 3: Commit and open PR**

Commit message: `docs: evaluate document intelligence stack`

PR title: `TASK-020: Evaluate document intelligence stack`
