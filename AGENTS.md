# AGENTS.md

## Project overview

This project is the Uncle Halemaah dry cleaning shop website described in the PRD. The target stack is:

- Next.js App Router with TypeScript
- Neon Postgres as the database
- Drizzle ORM + migrations checked into git
- Auth.js with Google sign-in
- Mailgun for HTML order confirmation emails
- Vitest for unit and integration tests
- Vercel for deployment

The app is intended to support catalog browsing, cart checkout, authenticated order history, schedule-based fulfillment, and email confirmation flows.

## Required stack and architecture

- Frontend: Next.js App Router, TypeScript, React Server Components where appropriate
- API routes: route handlers under app/api
- Database access: Drizzle schema and queries placed in db/ and lib/
- Auth: Auth.js with Google provider, server-side auth checks, owner-only access to user orders
- Email: Mailgun API with env-based configuration
- Validation: Zod for all API request input validation and server-side data shaping
- Tests: Vitest for every API route and business logic that affects API behavior
- Deployment: Vercel with separate env config for preview and production

## Folder structure

Use this layout unless a more specific structure is already established by the project:

```text
.
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── orders/
│   │   ├── services/
│   │   └── ...
│   ├── (auth)/
│   ├── checkout/
│   ├── orders/
│   ├── catalog/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── ui/
│   └── ...
├── db/
│   ├── schema.ts
│   ├── index.ts
│   ├── migrations/
│   └── seed.ts
├── lib/
│   ├── auth/
│   ├── email/
│   ├── validators/
│   ├── utils/
│   └── ...
├── server/
│   ├── orders/
│   ├── services/
│   └── ...
├── tests/
│   ├── api/
│   ├── unit/
│   └── fixtures/
├── types/
├── public/
├── .env.example
├── .gitignore
├── AGENTS.md
├── PRD.md
├── README.md
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Naming conventions

- Use PascalCase for React component files and component names: `OrderSummary.tsx`, `CartItem.tsx`
- Use camelCase for functions, variables, and utility methods: `createOrder`, `validateCheckoutInput`
- Use kebab-case for non-component file names when appropriate: `order-status.ts`, `service-catalog.ts`
- Use snake_case for database tables and columns: `order_items`, `subtotal_kobo`, `preferred_date`
- Use UPPER_SNAKE_CASE for environment constants and reusable fixed values
- Keep route files in `app/api/.../route.ts` and use explicit, domain-based names
- Keep validation schemas in `lib/validators` or adjacent to the route they protect
- Keep business logic in `server/` or `lib/` and avoid mixing it directly into UI components
- Do not add hidden “magic” values; prefer domain constants and typed helpers

## Visual design system

- Palette: white/off-white surfaces, deep navy primary (`#18334b`), soft blue accent (`#e7f0f6`), and neutral grey text/borders. Avoid gradients and heavy shadows.
- Typography: use the shared Inter sans-serif font loaded with `next/font`; use the CSS type scale (`--text-xs` through `--text-2xl`) with generous line-height.
- Spacing: use the shared 4/8px-based spacing tokens (`--space-1` through `--space-8`), consistent page widths, and generous whitespace.
- Buttons: use shared primary, secondary, and ghost treatments; preserve semantic button/link behavior and visible keyboard focus.
- Surfaces: use subtle borders and modest rounded corners for repeated service/order items and genuinely framed forms; avoid nested cards and heavy shadows.
- Inputs: keep labels associated with controls and show a high-contrast focus ring.
- Status: use the shared order status badge styles and keep status text visible without relying on color alone.
- Layouts are mobile-first and must remain usable without horizontal scrolling at narrow viewport widths.

## Code and API rules

### 1) Validate all API input with Zod

- Every request body, query string, and route parameter must be validated with a Zod schema before business logic runs.
- Reject invalid data with clear, explicit error messages.
- Do not trust client-provided prices, order items, or user-submitted fields; server-side recalculation is required.
- Use Zod to guard API routes, server actions with external input, and any request parsing that touches the database or email layer.

### 2) Write tests for every API endpoint

- Every API route must have a test covering the happy path and at least the validation failure path.
- When an endpoint has auth or ownership checks, add a test proving unauthorized access is denied.
- Keep endpoint tests close to the route behavior and avoid testing only mocks.
- Prefer real request/response flows when practical; test actual behavior, not mock-only implementation details.

### 3) Run tests before saying a task is done

- Do not mark a task as complete without running the relevant tests.
- If you change API behavior, run the affected endpoint tests and the related unit suite.
- If the work is broad enough to affect multiple routes, run the relevant project test command before finalizing.
- If tests fail, fix the issue before claiming completion.

### 4) Secrets and environment variables

- Never hardcode API keys, provider secrets, database URLs, or tokens.
- Store secrets in environment variables only.
- Use `.env.example` as the template for required variables. Do not commit real secrets.
- Keep `.env` and `.env.*` files out of git.
- Never log sensitive auth, tokens, or personal customer information.

### 5) Git hygiene

- Keep `.env` files excluded from version control.
- Add `.env.example` with documented placeholder values only.
- Do not commit local database credentials, Mailgun keys, or provider tokens.

### 6) Session continuity and handoff

- Update the project README at the end of each session with the current status, what was completed, what remains, and what the next model should do.
- Keep the README in a state that another model can pick up without guessing.
- Include enough detail for a continuation session: completed work, blockers, exact next action, and validation evidence.

## Safety and product rules

- Only expose customer data to the authenticated owner.
- Recalculate monetary values on the server using persisted current prices.
- Preserve immutable price snapshots on orders.
- Do not mark an order as paid or confirmed unless the business logic explicitly supports it.
- Use clean, user-safe validation and email templates; do not render raw unsanitized customer input into HTML without escaping.
- Keep the implementation aligned with the PRD and avoid introducing features outside the approved scope unless explicitly requested.

## Default workflow for this repo

1. Read the PRD and any relevant existing project files before implementing.
2. Add or update validation logic with Zod before writing route logic.
3. Add failing tests for each API endpoint or changed behavior.
4. Implement the server logic.
5. Run the targeted test suite.
6. Update the README progress section for handoff.
7. Only then report the work as done.

## Final reminders

- Validate all API input with Zod.
- Test every API endpoint.
- Run tests before completion.
- Never hardcode secrets.
- Keep `.env` out of git.
- Update the README progress section at the end of each session.
