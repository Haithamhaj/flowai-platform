# Owner-First AI Builder Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture TASK-010 as a docs-only orchestration contract for the owner-first AI builder direction.

**Architecture:** This plan does not implement runtime behavior. It records how future implementation should preserve `SourceDocument -> BusinessUnderstanding -> WorkflowGenerationPlan -> strict Workflow JSON DSL -> validation -> runtime -> preview/export` while adding owner-facing AI orchestration.

**Tech Stack:** Markdown docs, existing FlowAI task system, project-state files, decision log.

---

### Task 1: Create TASK-010 Task File

**Files:**
- Create: `docs/tasks/TASK-010_OWNER_FIRST_AI_BUILDER_ORCHESTRATION.md`

- [x] **Step 1: Define the task boundary**

Write TASK-010 as docs/spec only. Include explicit non-goals for provider calls, dependencies, uploads, parsing, crawling, RAG, persistence, auth, Studio UI, WhatsApp, exporters, Workflow DSL changes, and runtime semantic changes.

- [x] **Step 2: Define orchestration units**

Document the AI Builder Orchestrator, Business Interview Agent, Source Understanding Agent, Product Catalog Agent, Workflow Planner Agent, Workflow Critic Agent, Channel Preview Agent, and Integration Mapper Agent.

- [x] **Step 3: Define tool and prompt contracts**

Document future tools and prompt files as strict JSON-compatible boundaries. Require sourceRefs for product, price, policy, availability, and recommendation claims.

- [x] **Step 4: Define acceptance and handoff**

Set acceptance criteria, verification command, risks, and the next recommended task.

### Task 2: Update Operational Continuity

**Files:**
- Modify: `project-state/PROJECT_STATE.md`
- Modify: `project-state/TASK_GRAPH.md`
- Modify: `docs/10_DECISION_LOG.md`

- [x] **Step 1: Update current reality**

Record that owner review rejected the technical demo UX and accepted the owner-first AI builder direction.

- [x] **Step 2: Update task graph**

Set TASK-010 as current and TASK-011 as the next recommended implementation task.

- [x] **Step 3: Record decision**

Add the 2026-07-01 decision to shift to the owner-first AI builder experience.

### Task 3: Verify And Publish

**Files:**
- No source files should change.

- [ ] **Step 1: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 2: Confirm changed file scope**

Run:

```bash
git diff --name-only
git status --short --untracked-files=all
```

Expected: docs/project-state files only.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/tasks/TASK-010_OWNER_FIRST_AI_BUILDER_ORCHESTRATION.md docs/superpowers/plans/2026-07-01-owner-first-ai-builder-orchestration.md project-state/PROJECT_STATE.md project-state/TASK_GRAPH.md docs/10_DECISION_LOG.md
git commit -m "docs: plan owner-first AI builder orchestration"
```

- [ ] **Step 4: Open PR**

Push the branch and open a PR titled:

```text
TASK-010: Plan owner-first AI builder orchestration
```

PR body should state:

- docs/spec only;
- no provider call;
- no code implementation;
- next recommended task is `TASK-011_OWNER_FIRST_BUILDER_UI`.

## Self-Review

- Spec coverage: TASK-010 defines agents, tools, prompts, data models, UX flow, safety boundaries, and next task.
- Placeholder scan: no TODO/TBD placeholders.
- Scope check: docs-only; no source files, provider calls, or dependency changes.
