-- 0007_store_collections — seed the two storefront collections.
--
-- The homepage carries two permanent collection cards (TEREA Sticks and
-- IQOS Devices) that link to their dedicated /collections/<slug> pages.
-- The catalog is otherwise authored from the admin console, so these two
-- categories are created here (empty — no demo products) so the pages
-- resolve immediately and new products can be assigned to them from the
-- console the moment they are added.
--
-- INSERT OR IGNORE keeps this idempotent: if an operator already created a
-- category with either slug, their row (and its products) is left untouched.

INSERT OR IGNORE INTO categories
  (id, slug, name, description, long_description, accent, featured, position, created_at, updated_at)
VALUES
  ('cat_store_terea_sticks', 'terea-sticks', 'TEREA Sticks',
   'The full TEREA heat-not-burn stick range for IQOS ILUMA — every origin line, flavour family and edition on one shelf.',
   'Browse the complete TEREA sticks collection: smooth toasted tobaccos, crisp menthols and click-capsule Pearl editions across all seven sourcing lines — Uzbekistan, Tajikistan, Kyrgyzstan, Indonesia, Switzerland (Duty Free), Japan and Italy. Every pack is authenticity-checked, priced in AED and dispatched from Dubai with cash or card on delivery.',
   'violet', 1, 1, '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z'),
  ('cat_store_iqos_devices', 'iqos-devices', 'IQOS Devices',
   'IQOS ILUMA heated-tobacco devices and official accessories — the hardware that heats every TEREA stick.',
   'The IQOS devices collection: ILUMA and ILUMA i pocket devices, PEM holders, chargers, caps and official accessories. Authentic hardware, AED pricing and UAE-wide delivery with cash or card on payment at the door.',
   'ice', 1, 2, '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z');
