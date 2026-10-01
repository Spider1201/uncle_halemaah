# Product Requirements Document: Uncle Halemaah Dry Cleaning Website

**Status:** Draft  
**Product:** Uncle Halemaah online ordering website  
**Business location:** Ijako, Ogun State, Nigeria  
**Currency:** Nigerian naira (NGN, displayed as `₦`)  
**Date:** 1 October 2026

## 1. Overview

Uncle Halemaah is a dry cleaning shop serving customers in Ijako, Ogun State. This website will let customers browse cleaning services and prices, build a cart, and place pickup or delivery orders online. Customers who sign in with Google can view their order history. Each successful order is stored persistently and receives a clear HTML email confirmation.

The initial release is an order-capture and order-tracking experience. No online payment provider has been specified; payment collection and reconciliation are therefore outside the initial scope.

## 2. Goals

- Make Uncle Halemaah's services and Naira prices easy to browse on mobile and desktop.
- Let a customer place an order with a collection preference, contact phone, and preferred date.
- Persist orders and their item/price details so the shop can fulfill them reliably.
- Give signed-in customers access to their order history and current order statuses.
- Send a useful, professionally formatted HTML email confirmation after a successful checkout.
- Keep the service catalog and order lifecycle ready for future shop-management tooling.

## 3. Users

- **Customer:** A person in or near Ijako who wants to request dry cleaning and track their orders.
- **Shop operator:** Uncle Halemaah staff who receive and fulfill orders. The initial release does not include a staff dashboard; order management may be handled operationally until a later phase.

## 4. Product Scope

### In scope for the first usable release

- Responsive service catalog with descriptions and prices in Naira.
- Cart with item quantities, editable quantities, removal, and a calculated subtotal.
- Google sign-in and sign-out through Auth.js.
- Checkout for either shop pickup or delivery.
- Required customer phone number and preferred date; delivery address required for delivery.
- Persistent order records, immutable order-item price snapshots, and an order status.
- Signed-in user's order history and per-order detail/status view.
- HTML order confirmation email sent through Mailgun after an order is committed.
- Automated tests with Vitest for domain logic and important workflows.
- Deployment on Vercel with Neon Postgres as the persistent database.

### Out of scope unless separately approved

- Online card, bank-transfer, or wallet payment processing.
- Automatic delivery fee calculation, driver assignment, or live delivery tracking.
- Customer self-service order cancellation or editing after submission.
- Staff/admin dashboard, catalog editor, or role management UI.
- SMS/WhatsApp notifications, loyalty features, coupons, and reviews.
- Guaranteed real-time availability or appointment-slot capacity management.

## 5. Customer Experience and Requirements

### 5.1 Service catalog

- Show active services with a name, concise description, unit (for example, per item or per set), and price in NGN.
- Prices must be displayed consistently with the `₦` symbol and readable number formatting.
- Customers can add a service to the cart and choose a quantity.
- Services that are inactive or unavailable cannot be added to a new order.
- The catalog should be usable on narrow mobile screens and clearly identify any price/unit distinctions.

### 5.2 Cart

- Show each selected service, unit price, quantity, and line total.
- Allow quantity changes and item removal.
- Show the subtotal and make clear that any delivery fee or additional charge, if introduced, will be disclosed before order submission.
- Preserve a cart during normal navigation and refreshes. For signed-in users, persistence across devices is a later enhancement unless it is inexpensive to include in the initial implementation.
- The server must re-read current service prices at checkout; client-provided prices are never authoritative.

### 5.3 Authentication

- Support Google sign-in and sign-out through Auth.js.
- Checkout requires an authenticated user so every order has an owner and can appear in order history.
- Returning users must be able to sign in with the Google account associated with their orders.
- Do not expose provider tokens or sensitive authentication data to the browser or application logs.

### 5.4 Checkout

The checkout form collects:

- Fulfillment choice: **Pickup** or **Delivery**.
- Customer phone number (required).
- Preferred date (required, subject to shop confirmation).
- Delivery address (required only for delivery; capture enough detail for a driver to locate the customer, including area/landmark where useful).
- Optional customer note or special instructions.

On submission:

- Validate all fields on the server, including that the preferred date is valid and not in the past according to the business's local time.
- Validate that at least one valid service item and quantity are present.
- Recalculate all line totals and subtotal from database prices.
- Create the order and its item snapshots in one database transaction.
- Return a clear success state with an order reference; prevent accidental duplicate submissions where practical.
- Trigger the confirmation email only after the order transaction succeeds.
- If email delivery fails, retain the order and surface the failure to server-side monitoring/logging; do not tell the customer the order failed when it was successfully saved.

No payment is collected in this checkout flow. The customer should not be shown a misleading “paid” state.

### 5.5 Order history and details

- A signed-in customer can view only orders they own.
- List orders newest first with order reference, date placed, fulfillment type, total, preferred date, and current status.
- Provide an order detail view showing the saved service names, quantities, unit-price snapshots, totals, delivery/pickup details, and status history if available.
- Empty history state should explain that no orders have been placed yet and link to the catalog.

### 5.6 Order statuses

Use a small, explicit status lifecycle in the initial release:

- `received`: order was submitted and saved.
- `confirmed`: the shop has reviewed and accepted the request.
- `in_progress`: cleaning is underway.
- `ready`: ready for pickup or delivery dispatch.
- `completed`: order has been handed over/delivered.
- `cancelled`: order will not be fulfilled.

New orders start as `received`. Customer-facing labels should be friendly and should not imply that a preferred date is guaranteed. Status updates will initially require an operator or a later staff tool; how staff apply updates for the first release is an operational decision to settle before launch.

## 6. Confirmation Email

Send an HTML confirmation email through Mailgun after checkout successfully stores an order. Include a plain-text alternative.

The email should contain:

- Uncle Halemaah name and contact details (business phone/email to be supplied).
- A clear statement that the order request was received, not paid or necessarily confirmed for the requested date.
- Order reference and date placed.
- Service names, quantities, unit prices, line totals, and order subtotal.
- Pickup or delivery selection, preferred date, and delivery address when applicable.
- Customer phone and any submitted note, where appropriate.
- A link to the signed-in order detail page.
- A support/contact instruction for corrections or questions.

Email sending should not block order persistence. Use a verified sending domain and configured Mailgun credentials in deployment secrets. Avoid including unnecessary personal data in email subject lines.

## 7. Data Model

Use PostgreSQL on Neon and Drizzle ORM. Names below are conceptual; implementation may adapt naming to repository conventions. IDs should be generated UUIDs unless the implementation has a strong reason to use another opaque identifier. Store timestamps in UTC and convert to the business/customer timezone for display.

### `users`

Managed through the Auth.js Drizzle adapter.

- `id`: primary key, UUID/text as required by adapter.
- `name`: nullable display name.
- `email`: unique, nullable only if supported by chosen adapter/provider configuration.
- `emailVerified`: nullable timestamp.
- `image`: nullable profile image URL.

### `accounts`

Managed through the Auth.js Drizzle adapter for Google identity linkage.

- Adapter-required account fields, including provider, provider account ID, user ID, token fields where required, and token expiry/scope fields.
- Unique constraint on `(provider, providerAccountId)`.
- Foreign key to `users` with deletion behavior compatible with Auth.js.

### `sessions` and `verification_tokens`

Include the tables required by the chosen Auth.js session strategy/Drizzle adapter. If JWT sessions are selected, follow the adapter's actual requirements rather than adding unused persistence tables. Confirm strategy and schema compatibility during implementation.

### `services`

- `id`: primary key.
- `name`: required.
- `slug`: required unique stable URL identifier.
- `description`: required or nullable short description.
- `unitLabel`: required (for example, `per item`, `per pair`, or `per set`).
- `priceKobo`: required non-negative integer price in minor units (100 kobo = ₦1), avoiding floating-point currency arithmetic.
- `isActive`: required boolean, default true.
- `sortOrder`: required integer for catalog ordering.
- `createdAt`, `updatedAt`: required timestamps.

### `orders`

- `id`: primary key.
- `orderNumber`: required unique, human-friendly, non-sequentially guessable reference suitable for email/customer support.
- `userId`: required foreign key to `users`.
- `status`: required enum/text constrained to the lifecycle above; default `received`.
- `fulfillmentType`: required enum: `pickup` or `delivery`.
- `customerPhone`: required snapshot from checkout.
- `preferredDate`: required date or local-date representation; define timezone handling explicitly (business timezone: Africa/Lagos).
- `deliveryAddress`: nullable for pickup; required for delivery, stored as a checkout snapshot.
- `customerNote`: nullable.
- `subtotalKobo`: required non-negative integer recalculated by the server.
- `deliveryFeeKobo`: non-negative integer, default zero for the initial release; retain the field to support a later disclosed fee.
- `totalKobo`: required non-negative integer; initially equals subtotal plus delivery fee.
- `createdAt`, `updatedAt`: required timestamps.

Indexes: `(userId, createdAt)` for history; unique index on `orderNumber`; optionally `(status, createdAt)` for future operations.

### `order_items`

- `id`: primary key.
- `orderId`: required foreign key to `orders`, cascade delete only if order deletion is permitted (prefer retaining orders and not exposing deletion).
- `serviceId`: nullable foreign key to `services` so historical orders survive service deletion; use soft deactivation for normal catalog changes.
- `serviceName`: required snapshot.
- `unitLabel`: required snapshot.
- `unitPriceKobo`: required non-negative integer snapshot.
- `quantity`: required positive integer.
- `lineTotalKobo`: required non-negative integer calculated on the server.

Keep monetary snapshots even when a catalog service changes price or is deactivated. An order's displayed total must never change due to later catalog edits.

### `order_status_events` (recommended)

- `id`: primary key.
- `orderId`: required foreign key to `orders`.
- `fromStatus`: nullable for initial event.
- `toStatus`: required status.
- `changedByUserId`: nullable foreign key to `users` for system-originated events.
- `note`: nullable internal/customer-safe note; do not expose internal-only notes to customers without a field-level policy.
- `createdAt`: required timestamp.

Create the initial `received` event with the order in the same transaction. This supports trustworthy status history and future staff tooling.

### Relationships and integrity

- One user has many orders; each order belongs to one user.
- One order has one or more order items.
- One service can be referenced by many order items, but each order item preserves independent service and price snapshots.
- Enforce non-negative money, positive quantity, required delivery address for delivery where practical, and allowed status values in database constraints as well as application validation.
- Avoid hard-deleting users/orders in normal product operations; define privacy deletion/anonymization policy before launch.

## 8. Technical Constraints and Architecture

- **Web:** Next.js App Router with TypeScript.
- **Database:** Neon Postgres; Drizzle ORM and migrations checked into version control.
- **Authentication:** Auth.js with Google provider and a compatible Drizzle adapter/session strategy.
- **Email:** Mailgun API; credentials and sender configuration supplied through environment variables/secrets.
- **Tests:** Vitest for unit and integration-level checks. Keep business rules such as price calculation, input validation, and status transitions independently testable.
- **Hosting:** Vercel. Configure production and preview environment variables separately and use Neon connection settings compatible with Vercel/serverless execution.
- **Security:** Authorize order reads by authenticated owner on the server; validate all mutations server-side; protect secrets; use safe HTML escaping/template rendering for customer-provided values; rate-limit or otherwise protect order submission and authentication-sensitive endpoints as appropriate.
- **Accessibility:** Semantic forms, keyboard operation, visible focus, associated labels and errors, sufficient contrast, and accessible status announcements.
- **Observability:** Log order reference and email-send outcome without logging tokens or unnecessary personal/customer data.

## 9. Success Metrics

- A customer can complete an order on a mobile device without staff intervention for basic navigation.
- Every successful checkout produces exactly one persistent order with consistent server-calculated totals and item snapshots.
- A signed-in customer cannot access another customer's order by changing an identifier or URL.
- Confirmation email is queued/sent for successful orders; email failure does not lose the order.
- Catalog and checkout clearly communicate prices in NGN and pickup/delivery requirements.

Instrument funnel events only where privacy expectations and consent are appropriate. Initial operational measures can include catalog-to-checkout conversion, order submission success/failure, email delivery failures, and orders by status.

## 10. Acceptance Criteria

- Catalog displays only active services and prices formatted in Naira.
- Cart totals update correctly when quantities change or services are removed.
- Checkout rejects empty carts, invalid quantities, missing phone/date, and missing delivery address for delivery.
- Checkout ignores client-submitted prices and calculates totals from current database prices.
- Successful checkout atomically creates an order, item snapshots, and initial status event.
- Duplicate/retried submissions do not silently create duplicate orders where an idempotency mechanism can be applied.
- The customer sees a success state and order reference after the order is saved.
- A Mailgun HTML and plain-text confirmation is sent/attempted with accurate order details after persistence.
- Signed-in users can list and view their own orders; unauthenticated users are directed to sign in; other users' orders are inaccessible.
- Status is visible in history/detail views and starts as `received`.
- Key validation, money calculation, authorization, order creation, and email-trigger behavior have automated Vitest coverage.

## 11. Build Phases

### Phase 0: Decisions and business setup

- Confirm service names, descriptions, units, prices, and initial catalog ordering.
- Confirm business phone/email, sender display name, service area, pickup instructions, delivery policy/fee, business hours, and operating timezone.
- Decide how staff will receive and update orders before an admin interface exists.
- Decide the preferred-date rules (lead time, closed days, and whether customers may select same-day service).
- Register/configure Google OAuth credentials, Mailgun sending domain, Neon database, and Vercel project.

**Exit:** Business rules and required production accounts are available; delivery fees and payment expectations are explicit in customer-facing copy.

### Phase 1: Foundation and persistence

- Set up the Next.js App Router and TypeScript project structure.
- Configure Neon, Drizzle schema/migrations, environment validation, and database access.
- Add Auth.js Google sign-in/out and adapter tables.
- Add Vitest and test setup for domain and database-facing code.

**Exit:** Migrations apply successfully; Google sign-in works in a preview environment; tests run in CI.

### Phase 2: Catalog and cart

- Implement catalog browsing and responsive service presentation.
- Implement cart add/update/remove behavior and subtotal calculations.
- Seed the initial service catalog through a repeatable migration/seed process.

**Exit:** A customer can browse seeded active services and build a valid cart; price calculations are tested.

### Phase 3: Checkout and order lifecycle

- Implement authenticated checkout with pickup/delivery fields and server validation.
- Add transactional order/order-item creation with price snapshots and initial status event.
- Implement order history and order detail authorization.
- Add customer-facing status labels and empty/error/success states.

**Exit:** An authenticated user can submit and review their own persistent order; ownership and totals are covered by tests.

### Phase 4: Email and operational readiness

- Create branded, accessible HTML and plain-text confirmation templates.
- Integrate Mailgun after successful order persistence; handle delivery failures without losing orders.
- Add operational logging, production configuration, and end-to-end smoke checks.
- Verify mobile usability, accessibility basics, OAuth redirect settings, and production email sending.

**Exit:** A production-like order can be placed, stored, viewed, and confirmed by email without exposing secrets or another user's data.

### Phase 5: Launch and follow-up

- Deploy to Vercel with production Neon and Mailgun settings.
- Verify catalog/prices, customer contact details, service area and policies with the business owner.
- Monitor initial orders and email outcomes; adjust copy and operational workflow.
- Consider staff order management, online payments, delivery pricing, and SMS only after validating the initial workflow.

## 12. Open Questions

- What are the exact services, units, descriptions, and Naira prices?
- What phone number, support email, and business hours should the site and emails show?
- Is delivery available throughout Ijako or only in defined areas, and is there a fee?
- How should the shop review and update order statuses before a staff dashboard exists?
- What preferred-date rules, lead times, holidays, and closed days apply?
- Should checkout require Google sign-in, or should guest checkout be supported with later account claiming? This PRD assumes sign-in is required.
- How will customers pay at launch, and should payment method/instructions be captured on the order?
- What logo, brand colors, photos, and consent/privacy wording are available?
- What retention, export, and deletion policy should apply to customer accounts, addresses, and order history?
