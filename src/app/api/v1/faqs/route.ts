import { withApi, ok, CDN_CACHE } from "@/server/api/guard";
import { listFaqs } from "@/server/repos/content";

export const GET = withApi({}, async () => {
  const faqs = await listFaqs();
  return ok({ total: faqs.length, faqs }, undefined, { headers: CDN_CACHE.content });
});
