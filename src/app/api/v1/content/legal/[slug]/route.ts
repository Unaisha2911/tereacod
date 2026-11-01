import { withApi, ok, fail, ErrorCode } from "@/server/api/guard";
import { getLegalDocument } from "@/server/repos/content";

export const GET = withApi({}, async ({ params }) => {
  const document = await getLegalDocument(params.slug);
  if (!document) {
    return fail(404, ErrorCode.NOT_FOUND, `No legal document found for slug "${params.slug}".`);
  }
  return ok(document);
});
