# Product Catalog Model

## Purpose

The Product Catalog Model defines source-backed commerce and inventory facts for ecommerce, restaurants, real estate, physical stores, and service catalogs. It is a planning contract only and does not implement catalog extraction, crawling, pricing, inventory, recommendations, or order creation.

## Core Rule

No catalog source, no product claim.

The bot may only answer, compare, or recommend products from catalog facts that have sourceRefs, freshness, confidence, and conflict status. If those facts are missing or stale, the bot should ask a missing question or hand off.

## Product

Product:

- `id`
- `name`
- `slug`
- `description`
- `brand`
- `categories`
- `variants`
- `offers`
- `availability`
- `attributes`
- `media`
- `comparisonFields`
- `sourceRefs`
- `freshness`
- `confidence`
- `conflicts`
- `status`

Required before product can be used:

- name
- sourceRef
- category or collection when available
- confidence
- freshness
- conflict status

Optional:

- description
- brand
- media
- attributes
- offers/prices
- availability

If optional facts are missing, the product can exist but those claims must not be made.

## Variant

Variant:

- `id`
- `productId`
- `name`
- `sku`
- `options`
- `attributes`
- `offerRefs`
- `availability`
- `sourceRefs`
- `freshness`
- `confidence`
- `conflicts`

Examples of variant options:

- size
- color
- capacity
- material
- package size
- menu portion
- property unit type

Variant rules:

- Do not collapse variants when price, availability, or attributes differ.
- If source data does not prove variants, keep the product as a single product with unknown variants.
- If a variant has a price conflict, block confident price display for that variant only.

## Category

Category:

- `id`
- `name`
- `parentCategoryId`
- `description`
- `productIds`
- `sourceRefs`
- `confidence`

Category rules:

- Categories from navigation and structured catalog data should be preserved.
- Generated categories are candidates requiring approval.
- Category membership should not imply availability or price.

## Offer And Price

Offer:

- `id`
- `productId`
- `variantId`
- `price`
- `currency`
- `priceText`
- `salePrice`
- `regularPrice`
- `validFrom`
- `validUntil`
- `retrievedAt`
- `sourceRefs`
- `freshness`
- `confidence`
- `conflicts`

Price rules:

- No fresh price, no confident price.
- If currency is missing, show price text only if exact source text is safe and clearly marked as source-backed.
- If sale and regular prices conflict across sources, block publish or require user approval.
- Do not compute discounts unless both regular and sale prices are source-backed.
- Do not invent taxes, delivery fees, or total cost.

## Availability

Availability:

- `status`: `in_stock`, `out_of_stock`, `limited`, `preorder`, `backorder`, `available`, `unavailable`, `unknown`
- `quantity`
- `locationId`
- `retrievedAt`
- `sourceRefs`
- `freshness`
- `confidence`
- `conflicts`

Availability rules:

- Static website availability is lower confidence than integration/API inventory.
- Unknown availability must not be phrased as available.
- Location-specific availability must cite a location source.
- For restaurants, availability may be menu-active rather than inventory-active.
- For real estate, availability should be treated as high-risk and freshness-sensitive.

## Attributes

Attribute:

- `key`
- `label`
- `value`
- `unit`
- `sourceRefs`
- `confidence`

Attribute examples:

- material
- dimensions
- weight
- color
- dietary tags
- allergens
- bedrooms
- bathrooms
- service duration
- supported industry

Attribute rules:

- Attributes used for recommendations must be source-backed.
- Allergy, medical, legal, or compliance-sensitive attributes require stronger evidence or approval.
- If an attribute conflicts across variants, keep it variant-specific.

## Media

Media:

- `id`
- `url`
- `type`: `image`, `video`, `document`
- `altText`
- `productId`
- `variantId`
- `sourceRefs`
- `confidence`

Media rules:

- Do not hotlink or reuse media in generated artifacts unless rights and source rules are approved later.
- Media may support review but should not become proof of price, availability, or policy.

## Comparison Fields

ComparisonField:

- `key`
- `label`
- `value`
- `unit`
- `rankable`
- `sourceRefs`
- `confidence`

Comparison rules:

- Only compare facts present for both compared items or state when a fact is missing.
- Do not rank by hidden model preference.
- Explain ranking with source-backed fields.
- If comparison is incomplete, provide a partial comparison and missing facts.

## Catalog Conflicts

Conflict examples:

- Different prices for same SKU.
- Product page says in stock, category page says out of stock.
- Menu page and PDF menu show different prices.
- Real estate listing status differs between listing page and summary page.

Conflict handling:

- Mark the affected fact and entity with conflict references.
- Block confident recommendations if the conflict affects the recommendation basis.
- Block publish if the workflow would claim conflicted price, availability, safety, policy, or eligibility.
- Allow human approval to resolve conflicts with an audit note.

## Business Type Mapping

Ecommerce:

- Product, Variant, Category, Offer, Availability, Attribute, Media.

Restaurant:

- Menu item maps to Product.
- Menu section maps to Category.
- Modifiers map to Variant or Attribute.
- Dietary/allergen labels map to Attributes with high evidence requirements.

Physical store:

- Product may be category-level unless inventory source exists.
- Location-specific availability is required for stock claims.

Service company:

- Service package can use Product-like fields, but capability should usually be lead collection rather than order intent.

Clinic:

- Service catalog is not a product catalog for medical advice.
- Appointment/service facts should feed booking capability, not product recommendation.

Real estate:

- Listing maps to Product-like entity with high freshness requirements for price and availability.

## Recommendation Boundary

Product recommendations must cite catalog facts:

- product sourceRefs
- relevant attributes
- price/availability source when mentioned
- confidence
- conflict status

If evidence is missing, the recommendation must become:

- a missing question,
- a source request,
- a partial answer,
- or a human handoff.
