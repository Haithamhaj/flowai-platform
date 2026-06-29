# Decision And Recommendation Policy

## Purpose

This document defines how future AI-assisted recommendation and decision behavior can stay grounded in BusinessGraph and Product Catalog facts. It is planning only and does not implement AI providers, ranking, RAG, workflow generation, or runtime behavior.

## Core Policy

The bot may recommend, compare, or route only from source-backed facts that are relevant, fresh enough, conflict-free, and allowed by the Capability Map.

If evidence is missing, stale, conflicted, or outside allowed capabilities, the bot should not guess. It should ask a clarifying question, provide a partial answer with limits, or hand off.

## Recommendation Inputs

Required inputs:

- user need or goal;
- enabled capability;
- eligible entities;
- source-backed attributes;
- constraints and exclusions;
- sourceRefs;
- freshness status;
- confidence;
- conflict status;

Optional inputs:

- user preferences;
- budget range;
- location;
- timing;
- language;
- previous answers inside the current session, only if the runtime/session task supports them.

## Ranking Signals

Allowed ranking signals:

- exact match to user-stated constraints;
- source-backed category or service match;
- source-backed attributes;
- fresh availability;
- fresh price when price is part of the user request;
- business-approved priority;
- reviewer-approved recommendation rules.

Disallowed ranking signals:

- hidden model preference;
- invented popularity;
- unverified reviews;
- stale price/availability;
- inferred medical/legal/safety suitability;
- unsupported claims such as "best", "guaranteed", "most effective", or "cheapest" without evidence.

## Explanation Summary

Recommendations should include concise observable rationale:

- which user constraints were matched;
- which source-backed facts were used;
- what is uncertain or missing;
- when a human should confirm.

Do not include private chain-of-thought.

Example shape:

```json
{
  "recommendationId": "rec_123",
  "entityRefs": ["product_abc"],
  "matchedConstraints": ["budget", "size"],
  "evidenceRefs": ["source_product_page_1"],
  "confidence": 0.74,
  "explanation": "This matches the requested size and is listed as available on the product page.",
  "missingFacts": ["current delivery fee"],
  "handoffRecommended": false
}
```

## Unsupported Claim Handling

If the user asks for a claim that is not source-backed:

- do not invent the answer;
- state that the current sources do not confirm it;
- ask for a source or preference if useful;
- offer a human handoff when the claim matters for purchase, booking, medical/safety, legal/compliance, or pricing decisions.

Examples:

- "Which is cheapest?" requires fresh comparable prices.
- "Is this allergy-safe?" requires source-backed allergy facts and policy.
- "Can I book tomorrow?" requires scheduling evidence or handoff.
- "Is this property still available?" requires fresh listing status.

## Handoff Triggers

Handoff is required or recommended when:

- price/availability is stale or conflicted;
- user asks for medical, legal, emergency, safety, or compliance advice;
- source-only answer policy blocks confident answer;
- required customer data or consent policy is missing;
- recommendation confidence is below threshold;
- enabled capability cannot complete safely;
- user asks for action outside approved bot scope.

## Confidence Policy

Confidence should combine:

- source trust;
- extraction confidence;
- freshness;
- conflict status;
- match quality;
- capability readiness.

Confidence must not hide blockers. A high extraction confidence does not override a stale price, unresolved conflict, or missing approval.

Suggested interpretation:

- `0.80-1.00`: strong source-backed answer within enabled capability.
- `0.60-0.79`: usable with caveats or partial answer.
- `0.40-0.59`: ask clarifying question or recommend handoff.
- below `0.40`: do not recommend; explain missing evidence or hand off.

## Source Requirements By Domain

Ecommerce:

- Product recommendation requires product, relevant attributes, and source-backed constraints.
- Price mention requires fresh price.
- Availability mention requires fresh availability.

Restaurant:

- Dish recommendation requires menu item and source-backed dietary/allergen claims when relevant.
- Price mention requires fresh menu price.

Clinic:

- Appointment/service routing requires service and intake fields.
- Medical advice is not recommended unless a future approved medical policy explicitly permits limited source-only responses.
- Urgent symptoms trigger handoff or emergency instruction policy.

Real estate:

- Listing recommendation requires active listing evidence and fresh price/status.
- Viewing request requires approved lead fields and handoff destination.

B2B/service:

- Solution recommendation requires service taxonomy, target segment, and approved proof claims.
- ROI, compliance, and guarantee claims require explicit source approval.

## Workflow Generator Boundary

Future workflow generation should consume recommendation policy through CapabilityMap:

- enabled recommendation capability becomes a workflow branch only if blockers are empty;
- confidence thresholds decide whether a branch answers, asks a question, or hands off;
- every recommendation response should preserve sourceRefs in metadata or trace where the DSL supports it;
- unsupported recommendations should become fallback or handoff paths.

No Workflow JSON is generated by this document.
