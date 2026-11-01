import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { getSiteSettings } from "@/server/repos/settings";
import { SITE_SETTINGS_FALLBACK } from "@/server/api/bootstrap";

export const GET = withApi({}, async () => {
  const settings = (await getSiteSettings()) ?? SITE_SETTINGS_FALLBACK;
  return ok(settings, undefined, { headers: CDN_CACHE.settings });
});
