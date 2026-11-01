# TereaCOD

The UAE's #1 vape shop for instant online delivery — a full-stack Next.js 16
(App Router) ecommerce: authentic disposable vapes, pod systems and e-liquids
with transparent AED pricing, age-verified UAE-wide delivery and COD / card-on-
delivery checkout.

## Stack

- **Next.js 16 + TypeScript (strict)** — App Router, RSC-first, route handlers under `/api/v1`
- **SQLite data layer** — D1-shaped schema (`migrations/`), runtime-adaptive driver (`node:sqlite` under Node, `bun:sqlite` under Bun, Cloudflare D1 via binding injection on Workers). Repos live in `src/server/repos/*`
- **Auth & RBAC** — PBKDF2 (50k, tuned for Cloudflare Workers' CPU budget) password hashing, opaque signed session cookies, 6-digit OTP email verification + password reset (hashed, single-use, attempt-capped, resend-cooled), permission slugs enforced on every admin API route
- **Commerce core** — server-authoritative cart/pricing/inventory, idempotent checkout (Idempotency-Key), conditional-UPDATE stock reservation, coupons, audited order state machine (COD settles on delivery)
- **Tailwind CSS 4 + shadcn/ui + framer-motion** — dark violet theme, motion with reduced-motion support
- **Background work** — job outbox (`job_queue`) with email delivery via Resend when configured, maintenance sweep for expired sessions/tokens/carts

## Getting started

```bash
bun install
bun run db:seed          # idempotent seed (catalog, users, orders, coupons)
bun run dev              # http://localhost:3000
```

## Runtime environment variables

Set these as Worker secrets/vars on deploy (`.env` locally):

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENV` | yes | `development` / `preview` / `production` — drives cookie flags and dev-only OTP echo |
| `SESSION_SIGNING_KEY` | **yes in production** (boot fails without it) | HMAC key for signed session/cart cookies |
| `ADMIN_ACCESS_PATH` | **yes in production** (boot fails without it) | Secret staff-console path, format `manage/<secret>` — the literal `/admin` URL is a hard 404. First segment must stay `manage` (middleware matcher); rotate the second segment any time |
| `RESEND_API_KEY` | no | Transactional email (OTP codes, contact, order notices). Without it, sends are recorded in `job_queue` only |
| `TURNSTILE_SECRET_KEY` | no | Captcha verification on auth forms |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | no | Card payments |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | no | Seed-time admin login override |

Staff reach the console only via the secret path (delivered to staff sessions
through `/api/v1/auth/session` and the account overview; customers never see
it). Bookmark it after rotating — there is no other entry point.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Dev server on :3000 |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:seed` | Idempotent seed |
| `bun run db:seed:reset` | Drop the local DB and re-seed |

## Deployment

The runtime schema and repository layer are Cloudflare-portable by design:
the same SQL runs on D1 through the binding injection point
(`src/server/db/client.ts`), media uploads switch to the R2 binding, and the
job queue is designed for Cloudflare Queues (binding commented until consumers ship; currently drained by the in-process sweep + waitUntil).
Push checklist: `scripts/README.md` (D1 migration + seed + export sequence).
