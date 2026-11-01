import { withApi, ok } from "@/server/api/guard";
import { listAuditEvents } from "@/server/repos/admin";

export const GET = withApi({ requirePermission: "audit.read" }, async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const page = await listAuditEvents({
    severity: (searchParams.get("severity") as "info" | "all" | null) ?? undefined,
    search: searchParams.get("q") ?? undefined,
    page: Number(searchParams.get("page") ?? 1) || 1,
    pageSize: Number(searchParams.get("pageSize") ?? 12) || 12,
  });
  return ok(page.items, {
    pagination: {
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      hasMore: page.hasMore,
    },
  });
});
