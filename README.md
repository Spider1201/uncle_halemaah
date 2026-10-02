# Uncle Halemaah Shop Site

This repository is for the Uncle Halemaah dry cleaning website described in the PRD. The project is intended to support catalog browsing, checkout, authenticated order history, and order confirmation email delivery.

## Stack

- Next.js App Router
- TypeScript
- Neon Postgres
- Drizzle ORM
- Auth.js with Google provider
- Mailgun for email delivery
- Vitest for tests
- Vercel for deployment

## Project status

The initial storefront catalog is implemented; the remaining product flows are still to be built according to the PRD and project guidance in AGENTS.md.

## Development rules

- Validate all API input with Zod.
- Add tests for every API endpoint.
- Run the relevant test suite before declaring work complete.
- Never hardcode secrets or credentials.
- Keep .env files out of git.
- Update this progress section at the end of each session so another model can continue from the latest state.

## Session progress log

Update this section at the end of every session. The latest session should be at the top.

### Session: 2026-10-02 (checkout name, DB catalog, Mailgun region)

- Status: Requested code changes are implemented; migrations must be applied and the database catalog seeded before DB-backed catalog and checkout can run against Neon.
- Completed in requested order:
  - Added required editable checkout full name, prefilled from the Google profile; Zod validates it and the order stores `customer_name` as a snapshot. My Orders and confirmation email display the saved name.
  - Generated migration `0002_order-customer-name.sql`; existing orders are backfilled from the linked user's name, then email, before the column is made required.
  - Replaced the static catalog UI source with active database service rows, sorted by `sort_order`. Checkout uses the same rows for display/subtotal, while the API reloads authoritative current prices. The seed list remains the source for initializing/upserting those database rows; DB query failures show a friendly message.
  - Added nullable `services.badge` with migration `0003_service-catalog-badge.sql` for catalog labels.
  - Added optional `MAILGUN_API_BASE_URL`, defaulting to `https://api.mailgun.net`; trailing slashes are normalized. `.env.example` documents the EU override as a commented line.
  - Added tests for required name validation, saved-name snapshots/email greeting, database-row catalog mapping/failure fallback, and US/EU Mailgun endpoint selection.
- Validation:
  - Focused checkout/email tests passed: 13 tests.
  - Focused catalog/cart/order tests passed: 19 tests.
  - Focused Mailgun tests passed: 2 tests.
  - Editor diagnostics reported no errors for changed TypeScript files.
  - `npm test` passed: 6 files, 28 tests.
  - Production build passed in an isolated temporary copy before the final env-schema/docs-only adjustments; run `npm run build` again after stopping any active dev server if a final local build is needed.
  - Migrations have been generated but not applied to Neon; catalog seed was not run.
- Next step:
  - Run `npm run db:migrate`, then `npm run db:seed`, and verify with the configured Neon database and live provider settings.

### Session: 2026-10-02 (Mailgun confirmations)

- Status: Order confirmations are sent through Mailgun after successful persistence; mail failures do not fail checkout.
- Completed:
  - Added HTML and plain-text order confirmation content with escaped saved customer/order fields and Naira item/total formatting.
  - The API obtains recipient name/email from the Auth.js session, reloads the saved order using both order ID and authenticated user ID, loads saved order-item snapshots, and only then attempts Mailgun delivery.
  - Mailgun reads `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM` from the process environment. Failures log only a fixed message and order ID; provider errors and secrets are not logged.
  - Updated `.env.example` and Zod env schema to use `MAILGUN_FROM` (not `MAILGUN_FROM_EMAIL`).
  - Added a mocked-Mailgun payload test and a checkout regression test proving HTTP success after email failure.
- Test a real send:
  - Set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `MAILGUN_FROM` in the ignored `.env.local`. Use a verified Mailgun domain and a sender address on that domain. If the domain is still in Mailgun sandbox mode, authorize the Google account's recipient email in Mailgun first.
  - Ensure database migrations have been applied and services seeded, then sign in with Google and submit a checkout using that same Google account.
  - Confirm the order succeeds in the UI and check the recipient inbox (including spam) and Mailgun logs. Never paste or print the API key.
- Validation:
  - `npm test -- --run` passed: 6 files, 24 tests.
  - `npm run build` passed with a temporary process-only `MAILGUN_FROM` value; no environment file values were printed or persisted.
  - No live Mailgun request was made in this session.
- Next step:
  - Replace any old local `MAILGUN_FROM_EMAIL` setting with `MAILGUN_FROM`, then test delivery with a verified/authorized recipient.

### Session: 2026-10-02 (My Orders details)

- Status: My Orders shows persisted order and item details for the authenticated owner.
- Completed:
  - Loaded order-item snapshots only for the authenticated user's order IDs.
  - Displayed service names, quantities, saved unit prices and line totals, order total, pickup/delivery type, preferred date, phone, status, order reference, and placement date.
  - Orders remain in Neon independently of the browser cart or Auth.js login session; logging out and back in with the same Google account retrieves the same rows by user ID.
- Validation:
  - `npm test -- --run` passed: 5 files, 21 tests.
  - `npm run build` passed with temporary process-only `MAILGUN_FROM=Uncle Halemaah <preview@example.test>`; no environment files were read or edited.
  - My Orders was not tested against live customer data in this run.
- Next step:
  - Verify the page against the configured Neon database after migrations and order seeding/submission.

### Session: 2026-10-01 (Google authentication)

- Status: Google sign-in/sign-out and the protected orders entry page are implemented; Google OAuth credentials and a database migration still need to be configured/applied locally.
- Completed:
  - Added Auth.js v5 with Google provider and the Drizzle adapter using database sessions.
  - Added a safe sign-in return path, sign-in page, sign-out actions, and server-side authentication guard for `/orders`.
  - Added Auth.js-compatible Drizzle account/session columns and generated `db/migrations/0000_authjs-tables.sql`.
  - Added focused safe-redirect tests.
- Required environment variables for Google authentication and persistence:
  - `DATABASE_URL`: Neon Postgres connection string.
  - `AUTH_SECRET`: long random secret, for example generated with `npx auth secret`.
  - `AUTH_GOOGLE_ID`: Google OAuth client ID.
  - `AUTH_GOOGLE_SECRET`: Google OAuth client secret.
- Optional environment variable:
  - `NEXT_PUBLIC_APP_URL`: local app URL (`http://localhost:3000`) or deployed origin.
- Google OAuth redirect URI:
  - Local: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://<your-production-domain>/api/auth/callback/google`
- Next step:
  - Set the variables above in an ignored `.env.local`, apply the Drizzle migration with `npm run db:migrate`, and test Google sign-in/sign-out plus unauthenticated `/orders` redirection.
- Validation:
  - Auth.js and Drizzle adapter dependencies installed.
  - Generated the initial Drizzle migration for the project's current schema.
  - `npm test -- --run` passed: 3 test files, 9 tests.
  - `npm run build` passed with temporary process-only placeholder env values; no credentials were written to files.
  - Live Google OAuth and database-backed session behavior remain unverified until real credentials are configured and the migration is applied.

### Session: 2026-10-02 (cart and checkout)

  - Added add/remove/quantity cart actions with localStorage persistence and catalog subtotal display.
  - Added authenticated `/checkout` with pickup/delivery, phone, preferred date, optional address/note, and an order receipt state.
  - Added authenticated `POST /api/orders`; validates request data, rejects past dates in Africa/Lagos, reads active service prices from the database, and stores order and item snapshots in an atomic Neon batch.
  - Replaced the protected orders placeholder with a database-backed history filtered by the signed-in user's ID.
  - Added `db/seed.ts` and the `npm run db:seed` command to sync catalog prices into the database in kobo.
  - Existing initial migration already creates `orders` and `order_items` linked by UUID foreign keys to `users`; added UUID defaults for service/order/item IDs in the follow-up migration.
  - Added endpoint and cart-operation tests.
  - Configure `DATABASE_URL` and Auth.js variables, review/apply migrations with `npm run db:migrate`, run `npm run db:seed`, then exercise Google sign-in and place a test order.
  - `npm test -- --run` passed: 5 test files, 21 tests, including 9 order endpoint-handler tests.
  - `npm run build` passed with temporary process-only placeholder environment values; no credentials were written to disk.
  - Editor diagnostics reported no errors in the touched auth, checkout, order, or seed files.
  - Neon migrations and database seeding were not run because no real `DATABASE_URL` is configured in this workspace.


### Session: 2026-10-01 (Google authentication)

- Status: Google sign-in/sign-out and the protected orders entry page are implemented; Google OAuth credentials and a database migration still need to be configured/applied locally.
- Completed:
  - Added Auth.js v5 with Google provider and the Drizzle adapter using database sessions.
  - Added a safe sign-in return path, sign-in page, sign-out actions, and server-side authentication guard for `/orders`.
  - Added Auth.js-compatible Drizzle account/session columns and generated `db/migrations/0000_authjs-tables.sql`.
  - Added focused safe-redirect tests.
- Required environment variables for Google authentication and persistence:
  - `DATABASE_URL`: Neon Postgres connection string.
  - `AUTH_SECRET`: long random secret, for example generated with `npx auth secret`.
  - `AUTH_GOOGLE_ID`: Google OAuth client ID.
  - `AUTH_GOOGLE_SECRET`: Google OAuth client secret.
- Optional environment variable:
  - `NEXT_PUBLIC_APP_URL`: local app URL (`http://localhost:3000`) or deployed origin.
- Google OAuth redirect URI:
  - Local: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://<your-production-domain>/api/auth/callback/google`
- Next step:
  - Set the variables above in an ignored `.env.local`, apply the Drizzle migration with `npm run db:migrate`, and test Google sign-in/sign-out plus unauthenticated `/orders` redirection.
- Validation:
  - Auth.js and Drizzle adapter dependencies installed.
  - Generated the initial Drizzle migration for the project's current schema.
  - `npm test -- --run` passed: 3 test files, 9 tests.
  - `npm run build` passed with temporary process-only placeholder env values; no credentials were written to files.
  - Live Google OAuth and database-backed session behavior remain unverified until real credentials are configured and the migration is applied.
### Session: 2026-10-01 (catalog)

- Status: Base scaffold and services catalog UI are implemented; dependencies are installed and the production build passes.
- Completed:
  - Added AGENTS.md with the project stack, folder structure, naming conventions, and repo rules.
  - Added README.md with project overview and a continuation progress workflow.
  - Added .gitignore to keep environment secrets out of git.
  - Created the base Next.js + TypeScript scaffold, Drizzle schema, Neon database connection wrapper, and Vitest config.
  - Added an environment template at .env.example and a basic env validator.
  - Added a responsive services catalog with seeded dry cleaning offerings and Naira prices.
  - Added catalog tests for the seeded service list and currency formatting.
- Next step:
  - Run the Vitest suite, which was skipped this session, then continue with the next storefront flow from the PRD.
- Validation:
  - `npm install --cache "C:\Temp\npmcache" --no-fund --no-audit --progress=false --loglevel=verbose` completed successfully and created the project lockfile.
  - `npm run build` passed, including compilation, linting/type checks, and static page generation.
  - Tests were intentionally skipped at the user's request.
  - Next.js reports an additional lockfile at `C:\Users\KRITEX\package-lock.json` and infers that directory as the workspace root; the app build still passes.

## Handoff notes

When continuing from another session, read this section first, then the PRD, then the current codebase state. Continue from the last recorded action instead of starting from scratch.
