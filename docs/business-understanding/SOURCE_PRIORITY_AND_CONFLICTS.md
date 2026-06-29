# Source Priority And Conflicts

## Purpose

BusinessGraph needs predictable source priority and conflict handling before a bot can safely answer, recommend, book, or collect customer information. This document defines planning rules only.

## Source Priority Model

Default priority:

1. Human-approved manual review.
2. Future integration/API data with freshness metadata.
3. Structured website data confirmed by visible page content.
4. Visible official website content.
5. Uploaded documents after upload safety and extraction review.
6. Manual interview statements.
7. Generated candidates requiring approval.

Priority is contextual:

- Current prices: integration/API outranks static page, static page outranks interview.
- Current inventory/listing availability: integration/API outranks all other sources.
- Business goals: recent manual interview may outrank website marketing copy.
- Policies: official policy page outranks interview unless user explicitly approves override.
- Hours and locations: official website or integration outranks interview unless reviewed.
- Legal, medical, safety, compliance: approved source or human review required.

## Source Freshness

Every source-backed fact should track:

- `retrievedAt`
- `validAt`
- `expiresAt`
- `freshnessStatus`
- `contentHash`
- `sourcePriority`
- `confidence`

Freshness status:

- `fresh`: safe for current use under its source class.
- `aging`: usable with caution or review.
- `stale`: do not make confident claims.
- `unknown`: ask for review or avoid claim.

Suggested high-risk freshness:

- Price: short-lived.
- Availability/stock/listing status: short-lived.
- Hours/contact: medium-lived, high impact.
- Menu: medium-lived, price-sensitive.
- Policy: medium-lived, review on hash change.
- Service description: longer-lived, still source-backed.

## Conflict Object

Conflict:

- `id`
- `field`
- `entityRefs`
- `claims`
- `sourceRefs`
- `severity`
- `resolutionStatus`
- `recommendedAction`
- `blocksCapabilities`
- `createdAt`
- `resolvedAt`

Severity:

- `blocking`: publish or workflow generation must stop for affected capability.
- `high`: human approval required.
- `medium`: can proceed with conservative fallback.
- `low`: record but does not block.

Resolution status:

- `unresolved`
- `resolved_by_source_priority`
- `resolved_by_human`
- `ignored_with_reason`

## Conflict Types

Identity conflicts:

- different business names;
- multiple locations without clear active location;
- mismatched contact details.

Catalog conflicts:

- different prices;
- variant mismatch;
- availability mismatch;
- duplicated products with incompatible attributes.

Policy conflicts:

- different return/cancellation/refund rules;
- emergency policy mismatch;
- source-only answer policy differs across pages.

Capability conflicts:

- target goal asks for booking, but source says no booking;
- order intent requested but no commerce integration or handoff;
- FAQ answer exists but policy restricts answering that topic.

Freshness conflicts:

- stale source contradicts fresh source;
- page removed but fact still present in old graph;
- integration/API says unavailable while website says available.

## Resolution Rules

Blocking by default:

- price conflicts;
- availability conflicts;
- medical/legal/safety policy conflicts;
- identity/location conflicts that affect customer action;
- handoff destination conflicts;
- any conflict affecting an enabled capability.

Resolve by source priority only when:

- source priority is explicit;
- newer source is fresh;
- lower source is stale or less authoritative;
- resolution can be explained to reviewer.

Require human approval when:

- both sources are fresh;
- both sources are official;
- conflict affects price, availability, eligibility, medical/safety, legal/compliance, or customer data collection.

Do not silently delete:

- stale facts;
- disappeared pages;
- conflicting facts;
- older source evidence.

Mark them stale, conflicted, superseded, or rejected with reason.

## Publish And Generation Gates

Blocked facts should block:

- workflow branches that claim conflicted data;
- recommendations based on conflicted attributes;
- price or availability answers;
- booking/order flows with unclear handoff;
- source-only FAQ answers with unresolved policy conflict.

Allowed conservative behavior:

- say the information is not confirmed;
- ask a missing question;
- route to human;
- provide source-neutral answer without disputed claim.

## Reviewer Experience

Every conflict shown to a reviewer should include:

- field and entity affected;
- each claim;
- source label and freshness;
- recommended resolution;
- capability impact;
- suggested user-facing fallback.

The reviewer should be able to:

- accept one claim;
- mark as stale;
- add manual approved fact;
- disable affected capability;
- defer until recrawl or integration.
