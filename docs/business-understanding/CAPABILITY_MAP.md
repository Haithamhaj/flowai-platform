# Capability Map

## Purpose

The Capability Map defines what a generated bot can safely do from reviewed BusinessGraph facts. It is the gate between business understanding and future Workflow JSON generation.

This is planning only. It does not implement workflow generation or runtime behavior.

## Capability Object

Capability:

- `id`
- `type`
- `enabled`
- `status`
- `requiredEvidence`
- `evidenceRefs`
- `missingBlockers`
- `confidence`
- `allowedWorkflowNodes`
- `fallbackBehavior`
- `handoffBehavior`
- `sourceRestrictions`
- `reviewStatus`

Status values:

- `enabled`
- `disabled`
- `blocked`
- `candidate_requires_approval`
- `deferred`

## Core Capabilities

### Answer FAQ

Required evidence:

- Approved FAQ or source-backed policy/knowledge fact.
- SourceRefs for answer.
- Source-only answer policy.

Missing blockers:

- No approved answer.
- Conflicting policy.
- Stale or missing source.

Allowed workflow nodes later:

- `message`
- `condition`
- `rag_answer` only when RAG is separately approved and source-backed
- `handoff`
- `end`

Fallback/handoff:

- If answer is unsupported, say the source does not contain enough information and hand off or ask a clarifying question.

### Recommend Products

Required evidence:

- Product catalog.
- Source-backed attributes relevant to the user request.
- Fresh price/availability only if mentioned.
- Decision/recommendation policy.

Missing blockers:

- No catalog.
- Missing source-backed attributes.
- Conflicted price or availability.
- Recommendation would require unsupported claims.

Allowed workflow nodes later:

- `message`
- `question`
- `condition`
- `handoff`
- `end`

Fallback/handoff:

- Ask for user constraints or hand off when no source-backed match exists.

### Compare Products

Required evidence:

- At least two source-backed products.
- Comparable attributes with sourceRefs.
- Fresh/conflict-free price and availability if used.

Missing blockers:

- Missing comparable fields.
- Conflicted claims.
- Stale price or availability.

Allowed workflow nodes later:

- `message`
- `question`
- `condition`
- `handoff`
- `end`

Fallback/handoff:

- Provide partial comparison and list missing facts, or hand off.

### Collect Leads

Required evidence:

- Supported service/product/solution.
- Required lead fields.
- Handoff destination or review route.
- Consent/privacy copy if sensitive fields are collected.

Missing blockers:

- Unknown required fields.
- Unknown handoff route.
- Sensitive fields without approval.

Allowed workflow nodes later:

- `question`
- `field_collection`
- `condition`
- `handoff`
- `end`

Fallback/handoff:

- Collect only approved fields and route to human.

### Book Appointments

Required evidence:

- Bookable service or appointment type.
- Required customer fields.
- Opening hours or scheduling rules if shown.
- Handoff/booking destination.
- Emergency or refusal rules for clinics.

Missing blockers:

- No bookable service.
- Missing required fields.
- No handoff or booking destination.
- Safety/urgent-case policy missing for clinics.

Allowed workflow nodes later:

- `question`
- `field_collection`
- `condition`
- `handoff`
- `end`

Fallback/handoff:

- Collect request only if approved; otherwise hand off.

### Create Order Intent

Required evidence:

- Catalog item.
- Variant and quantity rules if relevant.
- Price/availability freshness policy.
- Handoff or commerce integration boundary.

Missing blockers:

- No fresh catalog.
- Unknown variant.
- Unknown stock.
- No order handoff/integration approval.

Allowed workflow nodes later:

- `question`
- `field_collection`
- `condition`
- `handoff`
- `end`

Fallback/handoff:

- Create an inquiry/request, not an order, unless commerce integration is separately approved.

### Handoff To Human

Required evidence:

- Handoff reason categories.
- Queue/contact path or fallback instruction.
- Business hours if relevant.

Missing blockers:

- No destination.
- Sensitive data routing unclear.

Allowed workflow nodes later:

- `handoff`
- `end`

Fallback/handoff:

- If no queue exists, show approved contact method or ask for missing routing information.

### Refuse / Avoid Topics

Required evidence:

- Refusal rules.
- Safety-sensitive categories.
- Source-only answer policies.

Missing blockers:

- No refusal policy for high-risk domain.
- Missing emergency/safety route for clinics.

Allowed workflow nodes later:

- `message`
- `condition`
- `handoff`
- `end`

Fallback/handoff:

- Refuse unsupported claim and offer approved contact or handoff.

## Business Type Capability Defaults

Ecommerce:

- Likely: answer FAQ, recommend products, compare products, create order intent as request only.
- Block until catalog, price freshness, availability rules, and return/shipping policies are reviewed.

Physical store:

- Likely: answer hours/location, collect leads, handoff.
- Block product availability claims without inventory source.

Service company:

- Likely: explain services, collect leads, qualify requests, handoff.
- Block pricing or guarantees without approved policy.

Clinic / appointment:

- Likely: appointment request, FAQ, handoff, refusal/avoidance rules.
- Block diagnosis, treatment advice, emergency handling without explicit policy.

Restaurant / menu:

- Likely: menu answer, dish recommendation, reservation/order intent as request only.
- Block allergy or price claims without source-backed facts.

Real estate:

- Likely: search listings, compare listings, collect viewing request, handoff.
- Block stale price/status claims.

B2B / services:

- Likely: solution finder, lead qualification, approved FAQ, handoff.
- Block ROI, compliance, or guarantee claims without approved evidence.

## Capability To Workflow Boundary

The WorkflowGenerator should not infer capabilities directly from raw sources. It should consume CapabilityMap entries:

- only enabled capabilities can become workflow branches;
- blocked capabilities become missing questions or review items;
- candidate capabilities require user approval before workflow generation;
- each workflow node should carry sourceRefs/confidence where behavior depends on business facts.

Allowed workflow node references in this document are planning guidance only. This document does not modify Workflow DSL.
