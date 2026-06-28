# 07 Task System

Each task file must include:

- Task ID
- Title
- Status
- Owner/Agent
- Context shard
- Goal
- Why now
- Non-goals
- Inputs
- Skill/MCP readiness
- Expected outputs
- Files likely touched
- Acceptance criteria
- Test plan
- Review checklist
- Risks
- Handoff notes

## Statuses

- `proposed`: idea exists, not ready.
- `ready`: scoped and ready to start.
- `in_progress`: actively being worked.
- `blocked`: cannot proceed without input or external state.
- `review`: implementation done, needs review.
- `done`: accepted and handed off.
- `deferred`: intentionally postponed.

One active task at a time unless explicitly approved.

## Skill/MCP Readiness Section

Every task must include a short readiness section:

- Task type.
- Skills/tools expected.
- Skills/tools available.
- Missing skills/tools worth recommending.
- Decision: proceed, pause for approval, or continue without extra tools.
