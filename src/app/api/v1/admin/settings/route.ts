import { z } from "zod";
import { withApi, ok } from "@/server/api/guard";
import {
  getSiteSettings,
  updateSiteSettings,
  getDeliveryConfig,
  saveDeliveryConfig,
  getFeatureFlags,
  saveFeatureFlags,
} from "@/server/repos/settings";
import { logAudit } from "@/server/audit";
import { SITE_SETTINGS_FALLBACK } from "@/server/api/bootstrap";

export const GET = withApi({ requirePermission: "settings.write" }, async () => {
  const [site, delivery, features] = await Promise.all([
    getSiteSettings(),
    getDeliveryConfig(),
    getFeatureFlags(),
  ]);
  return ok({
    site: site ?? SITE_SETTINGS_FALLBACK,
    delivery: {
      freeThreshold: delivery.freeThresholdFils / 100,
      standardFee: delivery.standardFeeFils / 100,
      expressFee: delivery.expressFeeFils / 100,
    },
    features,
  });
});

/**
 * PATCH /api/v1/admin/settings — the settings editor sends the full edited set
 * in ONE request; each section is merged onto its stored KV document so
 * unspecified fields keep their current values (readers never see holes).
 */
const patchSchema = z.object({
  site: z
    .object({
      name: z.string().trim().min(1).max(80).optional(),
      tagline: z.string().trim().max(200).optional(),
      description: z.string().trim().max(1000).optional(),
      complianceNotice: z.string().trim().max(1000).optional(),
      contact: z
        .object({
          phone: z.string().trim().max(40).optional(),
          whatsapp: z.string().trim().max(40).optional(),
          email: z.string().email().optional(),
          supportEmail: z.string().email().optional(),
          hours: z.string().trim().max(120).optional(),
        })
        .optional(),
    })
    .optional(),
  legal: z
    .object({
      name: z.string().trim().min(1).max(160).optional(),
    })
    .optional(),
  locale: z.string().trim().max(20).optional(),
  currency: z.string().trim().max(8).optional(),
  /** Multi-line address — stored as contact.addressLines (one line per row). */
  address: z.string().max(2000).optional(),
  seo: z
    .object({
      titleTemplate: z.string().trim().max(160).optional(),
      defaultDescription: z.string().trim().max(1000).optional(),
    })
    .optional(),
  delivery: z
    .object({
      freeThreshold: z.number().min(0).max(10000).optional(),
      standardFee: z.number().min(0).max(1000).optional(),
      expressFee: z.number().min(0).max(1000).optional(),
    })
    .optional(),
  features: z
    .object({
      maintenance: z.boolean().optional(),
      checkoutEnabled: z.boolean().optional(),
    })
    .optional(),
});

export const PATCH = withApi(
  { requirePermission: "settings.write" },
  async ({ request, identity, meta }) => {
    const body = patchSchema.parse(await request.json());
    const actor = { id: identity!.user.id, label: identity!.user.displayName };

    if (body.site || body.legal || body.locale || body.currency || body.address || body.seo) {
      const current = (await getSiteSettings()) ?? SITE_SETTINGS_FALLBACK;
      const patch: Record<string, unknown> = { ...(body.site ?? {}) };
      if (body.site?.name !== undefined) patch.brandName = body.site.name;
      if (body.legal?.name !== undefined) patch.brandLegalName = body.legal.name;
      if (body.locale !== undefined) patch.locale = body.locale;
      if (body.currency !== undefined) patch.currency = body.currency;
      if (body.address !== undefined) {
        const lines = body.address
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        patch.contact = { ...current.contact, ...(body.site?.contact ?? {}), addressLines: lines };
      } else if (body.site?.contact) {
        patch.contact = { ...current.contact, ...body.site.contact };
      }
      if (body.seo) {
        patch.seo = { ...current.seo, ...body.seo };
      }
      await updateSiteSettings(patch as never, actor);
      await logAudit({
        actorType: "admin",
        actorId: actor.id,
        actorLabel: actor.label,
        action: "settings.update",
        targetType: "setting",
        targetId: "site",
        detail: `Site settings updated (${Object.keys(patch).join(", ")})`,
        after: body,
        ip: meta.ip,
      });
    }

    if (body.delivery) {
      const config = await getDeliveryConfig();
      await saveDeliveryConfig(
        {
          freeThresholdFils: Math.round((body.delivery.freeThreshold ?? config.freeThresholdFils / 100) * 100),
          standardFeeFils: Math.round((body.delivery.standardFee ?? config.standardFeeFils / 100) * 100),
          expressFeeFils: Math.round((body.delivery.expressFee ?? config.expressFeeFils / 100) * 100),
        },
        actor
      );
      await logAudit({
        actorType: "admin",
        actorId: actor.id,
        actorLabel: actor.label,
        action: "settings.update",
        targetType: "setting",
        targetId: "delivery",
        detail: "Delivery fees updated",
        after: body.delivery,
        ip: meta.ip,
      });
    }

    if (body.features) {
      const flags = await getFeatureFlags();
      await saveFeatureFlags({ ...flags, ...body.features }, actor);
      await logAudit({
        actorType: "admin",
        actorId: actor.id,
        actorLabel: actor.label,
        action: "settings.update",
        targetType: "setting",
        targetId: "features",
        severity: "warning",
        detail: `Feature flags updated (${Object.entries(body.features)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")})`,
        after: body.features,
        ip: meta.ip,
      });
    }

    const [site, delivery, features] = await Promise.all([
      getSiteSettings(),
      getDeliveryConfig(),
      getFeatureFlags(),
    ]);
    return ok({
      site: site ?? SITE_SETTINGS_FALLBACK,
      delivery: {
        freeThreshold: delivery.freeThresholdFils / 100,
        standardFee: delivery.standardFeeFils / 100,
        expressFee: delivery.expressFeeFils / 100,
      },
      features,
    });
  }
);
