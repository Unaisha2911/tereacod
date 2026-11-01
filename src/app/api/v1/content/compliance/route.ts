import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { listComplianceRecords } from "@/server/repos/content";

export const GET = withApi({}, async () => {
  const records = await listComplianceRecords();
  return ok({ total: records.length, records }, undefined, { headers: CDN_CACHE.content });
});
