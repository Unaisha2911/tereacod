# scripts/ — operational tooling

Everything here is **developer/operator tooling** that runs under the Bun CLI
(or shell) OUTSIDE the Next.js app — it is never bundled into the site, never
served, and never imported by `src/` at runtime. The only allowed dependency
direction is `scripts/* → src/server/*` (ids, money, password, rbac, db) —
never the reverse. `src/data/*` is seed-only input and must not be imported
by runtime code either.

## The single seed

**`seed.ts` is the one and only seed script.** It targets the one and only
database (`db/tereacod.db`) and prepares a fresh deployment — e.g. the
tereacod.ae push — with everything EXCEPT the catalog:

| Seeded | Contents |
| --- | --- |
| Settings (KV docs) | `settings:site` copy, `settings:delivery` fees, `settings:features` flags |
| Navigation | header / mobile / footer / legal-strip items |
| Legal documents | terms, privacy, cookies, consumer information (+ sections) |
| Compliance records | baseline compliance module inventory |
| FAQs | storefront help-centre Q&A |
| RBAC + admin login | permissions, roles and the single admin user |
| Logos | brand media rows (`/brand/*.jpg`) + favicon/og asset check |

**Not seeded:** products, brands, categories, coupons, demo customers,
demo orders, demo tickets, audit history — the catalog is authored in the
admin console after go-live. Re-running the seed is safe on a live store:
it only converges the sections above and never deletes runtime-created
rows (no catalog purge), and it never touches an existing admin password —
rotate deliberately with `ADMIN_PASSWORD=… bun run db:seed`.

```bash
bun run db:seed           # idempotent upsert
bun run db:seed:reset     # --reset: drop the local DB file first
ADMIN_EMAIL=... ADMIN_PASSWORD=... bun run db:seed   # override admin login
```

## Pushing to a fresh remote database (Cloudflare D1)

```bash
bun run db:migrate:remote      # 1. schema migrations
bun run db:seed                # 2. seed the local single database
bun run db:seed:export         # 3. export → scripts/seed-d1.sql + scripts/seed-kv/
bun run db:seed:remote         # 4. apply the SQL dump to remote D1
bun run db:seed:kv:remote      # 5. settings documents → Workers KV
```

⚠ `db:seed:export` / `db:seed:remote` RESET the remote tables to the local
seed content — a bootstrap tool, not a merge tool. The exported artifacts
embed the admin password hash and are gitignored (`mode 0600`).

## Other tooling

| File | Purpose | npm script |
| --- | --- | --- |
| `seed.ts` | The single seed — see above. | `db:seed`, `db:seed:reset` |
| `export-d1-seed.ts` | Turns the seeded local DB into Cloudflare deploy artifacts: `scripts/seed-d1.sql` + `scripts/seed-kv/*.json` (gitignored — they embed the admin password hash). | `db:seed:export` |
| `kv-remote.ts` | Applies `scripts/seed-kv/*.json` to the Workers KV `SETTINGS` binding. | `db:seed:kv:remote` |
| `media-sync-remote.ts` | Uploads locally-stored media bytes (`public/uploads/` + `media_blobs`) to the production R2 bucket so seeded/uploaded media URLs resolve remotely. | — |
| `admin-password.ts` | Verify / reset the admin password hash. `verify` reads the remote hash from stdin (wrangler JSON) or `--hash`; `set` writes `db/set-admin-password.sql` for one surgical remote UPDATE. Mirrors `src/server/password.ts` exactly. | `admin:password:verify`, `admin:password:set`, `admin:password:set:remote` |
| `smoke-keying.ts` | Luminance-keys the `smoke-src/*.png` plates into the transparent smoke overlays in `public/smoke/` (runtime assets for the atmosphere engine). | `assets:smoke` |
| `smoke-src/` | Source plates consumed by `smoke-keying.ts`. | — |

## Removed during consolidation

The former one-off scripts were merged into `seed.ts` or deleted once
applied — none are needed on a fresh deployment:

- `brand-assets.mjs` — favicon.ico / og-image.jpg generation now lives in
  `seed.ts` (regenerates from `public/logo.svg` only when the committed
  files are missing).
- `rebrand-db.ts`, `rebrand-settings-live.ts`, `rebrand-images.ts`,
  `rebrand-shots.mjs` — the Vapetive → TereaCOD rebrand, fully applied;
  rebranded content is now the seed itself.
- `generate-images.sh` — one-shot generator for the demo product art; the
  demo catalog is no longer seeded and product imagery is uploaded through
  the admin.
- `apply-admin-password.cjs` — superseded by `admin-password.ts set` +
  `wrangler d1 execute DB --local --file db/set-admin-password.sql`.
- `verify-*.mjs`, `variant-swap-e2e.mjs`, `account-*.mjs`, `site-audit.mjs`,
  `overflow-audit.mjs` — one-off QA/audit runs against the demo catalog.
