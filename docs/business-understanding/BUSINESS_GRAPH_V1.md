# Business Graph V1

## Purpose

Business Graph V1 is the planned source-backed representation of a business before workflow generation. It extends TASK-005A direct interview understanding into a broader graph that can absorb websites, documents, manual interviews, and later integrations without coupling to channels, runtime sessions, crawlers, RAG internals, or Workflow JSON nodes.

This is a planning document only. It does not implement crawling, AI extraction, RAG, workflow generation, API endpoints, or persistence.

## Design Goals

- Represent business facts as structured, source-backed entities.
- Keep uncertain facts, missing facts, conflicts, and confidence visible.
- Support different business types without forcing every business into a product catalog.
- Feed a later WorkflowGenerator through a Capability Map rather than direct channel or runtime assumptions.
- Prevent product, price, policy, availability, and medical/legal-style claims from being invented.

## Core Objects

BusinessGraph:

- `id`
- `businessIdentity`
- `businessTypes`
- `sources`
- `entities`
- `catalog`
- `policies`
- `faqs`
- `forms`
- `capabilities`
- `missingQuestions`
- `assumptions`
- `unknowns`
- `conflicts`
- `confidence`
- `freshness`
- `createdAt`
- `updatedAt`

BusinessIdentity:

- `businessName`
- `legalName`
- `brandNames`
- `category`
- `locations`
- `contactMethods`
- `operatingHours`
- `languages`
- `sourceRefs`
- `confidence`

Entity families:

- Product and product variants.
- Service and appointment/service request options.
- Menu item and menu section.
- Property listing and property collection.
- FAQ and policy.
- Location, contact method, staff/team handoff option.
- Form, field, and required customer data.
- Scenario and business process.

All extracted entities must support:

- stable `id`
- `type`
- `sourceRefs`
- `confidence`
- `freshness`
- `status`
- `notes`

`notes` must be concise observable rationale only, not private chain-of-thought.

## Business Type Packs

Business type packs are planning profiles that tell extraction and review which entities matter most. A business may use multiple packs.

### Ecommerce

Expected entities:

- Products, variants, categories, collections.
- Offers/prices, availability, attributes, images/media.
- Shipping, returns, payment, warranty, support policies.
- Product FAQs and comparison attributes.

Required fields:

- Product name, category, source URL or source section.
- Price source and freshness when price is shown.
- Availability source and freshness when stock is claimed.
- Return/shipping policy evidence when used in answers.

Common scenarios:

- Answer product questions.
- Recommend products from catalog constraints.
- Compare products.
- Create order intent or cart handoff later.
- Escalate when price, stock, or fit is uncertain.

Missing questions:

- Which products are active and sellable?
- Which prices are current enough to show?
- Which attributes can be used for recommendations?
- What should happen when a product is unavailable?
- Can the bot create an order intent, or only hand off?

Workflow templates later:

- Product search and recommendation.
- Product comparison.
- FAQ and policy answer.
- Order intent collection.
- Human handoff for uncertain price/availability.

Validation risks:

- Hallucinated products.
- Stale prices.
- Variant confusion.
- Promotion conflicts.
- Policy mismatch between product page and policy page.

### Physical Store

Expected entities:

- Store locations, departments, product/service categories.
- Opening hours, contact methods, directions.
- In-store services, reservations, pickup policies.
- General product availability when reliable sources exist.

Required fields:

- Store name and location.
- Hours source and freshness.
- Contact method source.
- Which actions are allowed: answer only, lead capture, reservation, pickup request.

Common scenarios:

- Store hours and location answers.
- Product/service category guidance.
- Lead or pickup request collection.
- Handoff to store staff.

Missing questions:

- Is inventory available to the bot?
- Should the bot answer price/stock questions?
- Which location should be used when multiple stores exist?
- When should the bot hand off?

Workflow templates later:

- Location/hours answer.
- Store inquiry lead capture.
- Pickup or reservation intent.
- Staff handoff.

Validation risks:

- Stale hours.
- Multi-location ambiguity.
- Product availability claims without inventory evidence.

### Service Company

Expected entities:

- Services, packages, service areas, pricing model if public.
- Intake forms, qualification criteria, contact/handoff routes.
- Portfolio/case studies if source-backed.
- Policies, service terms, support hours.

Required fields:

- Service name and description.
- Required intake fields.
- Service area or eligibility rules.
- Handoff or booking path.

Common scenarios:

- Explain services.
- Qualify leads.
- Collect service request.
- Recommend service category based on stated need.
- Handoff to sales or operations.

Missing questions:

- Which services are bookable/requestable?
- What qualification fields are required?
- What locations or customer types are supported?
- What claims should the bot avoid?

Workflow templates later:

- Service chooser.
- Lead qualification.
- Request collection.
- FAQ/policy answer.
- Human handoff.

Validation risks:

- Overstated service guarantees.
- Missing service area constraints.
- Unclear pricing or quote rules.

### Clinic / Appointment

Expected entities:

- Services, specialties, providers, locations.
- Appointment request types, required fields, hours.
- Safety disclaimers, emergency handoff rules.
- Policies for cancellations, insurance, privacy, and diagnosis limits.

Required fields:

- Clinic name and category.
- Services or specialties.
- Required appointment fields.
- Emergency and human handoff rules.
- Source-only policy for medical advice limits.

Common scenarios:

- Appointment request collection.
- Clinic FAQ answer.
- Service/specialty routing.
- Emergency or sensitive case handoff.

Missing questions:

- What emergencies must be refused or redirected?
- Which fields are required before handoff?
- Which providers/services can be requested?
- Can the bot answer medical questions or only policy/service questions?

Workflow templates later:

- Appointment intake.
- Service/specialty routing.
- Clinic FAQ.
- Urgent safety handoff.

Validation risks:

- Medical advice hallucination.
- Privacy-sensitive data collection without approval.
- Missing urgent-care redirect.

### Restaurant / Menu

Expected entities:

- Menu sections, menu items, modifiers, dietary attributes.
- Prices, availability, opening hours, reservation/order policy.
- Delivery/takeout options, branch/location details.

Required fields:

- Menu source and freshness.
- Item names, descriptions, price source when price is shown.
- Ordering/reservation capability status.
- Allergy/dietary evidence if recommendations use it.

Common scenarios:

- Answer menu questions.
- Recommend dishes by dietary preference.
- Compare dishes.
- Create reservation/order intent later.
- Handoff for allergies or uncertain items.

Missing questions:

- Are menu prices current enough to show?
- Which dietary/allergy claims are source-backed?
- Can the bot take orders/reservations?
- What should happen when items are unavailable?

Workflow templates later:

- Menu FAQ.
- Dish recommendation.
- Reservation intent.
- Order intent.
- Staff handoff.

Validation risks:

- Stale menu or prices.
- Allergy claims without evidence.
- Branch-specific availability ambiguity.

### Real Estate

Expected entities:

- Property listings, locations, prices, availability, features.
- Agent/contact options, viewing request forms.
- Policies/disclaimers, financing or rental conditions when source-backed.

Required fields:

- Listing source URL or source section.
- Property status and freshness.
- Price source and freshness.
- Required inquiry/viewing fields.

Common scenarios:

- Property search by constraints.
- Compare listings.
- Collect lead or viewing request.
- Handoff to agent.

Missing questions:

- Which listings are active?
- How fresh are prices and availability?
- What fields are required for a viewing request?
- Which claims require agent approval?

Workflow templates later:

- Listing search.
- Listing comparison.
- Viewing request collection.
- Agent handoff.

Validation risks:

- Stale listings.
- Price/status conflicts.
- Unsupported neighborhood or financing claims.

### B2B / Services

Expected entities:

- Solutions, industries, use cases, plans/packages.
- Case studies, proof points, qualification fields.
- Sales contact, support/contact paths, compliance claims.

Required fields:

- Service/solution taxonomy.
- Target customer segments.
- Qualification fields.
- Claims source and approval status.

Common scenarios:

- Explain solutions.
- Qualify leads.
- Route by industry/use case.
- Answer approved FAQs.
- Handoff to sales/support.

Missing questions:

- Which industries or customer sizes are supported?
- What qualification fields matter?
- Which proof claims are approved?
- What should the bot avoid promising?

Workflow templates later:

- Solution finder.
- Lead qualification.
- Case study answer.
- Sales handoff.

Validation risks:

- Unsupported ROI claims.
- Confusing service tiers.
- Collecting sensitive business data without clear need.

## Workflow Generator Boundary

BusinessGraph is not Workflow JSON. It should feed later generation through an explicit Capability Map:

BusinessGraph -> CapabilityMap -> WorkflowGenerator -> Workflow JSON DSL -> Validator -> Runtime.

Later tasks should preserve this boundary:

- TASK-005B: map accepted BusinessUnderstanding or BusinessGraph into a minimal workflow draft for direct interview only.
- TASK-006: source pipeline and website crawl planning/prototype with no workflow generation.
- TASK-007: source-backed catalog/entity extraction and conflict review.
- Later: provider-backed extraction, RAG, persistence, and Studio review after security and task approval.

No workflow should be published from BusinessGraph if required capabilities have blockers, unresolved conflicts, missing sourceRefs, or stale high-risk facts.
