import { withApi, ok } from "@/server/api/guard";
import { listOrdersForUser } from "@/server/repos/orders";

export const GET = withApi({ requireAuth: true }, async ({ request, identity }) => {
  const { searchParams } = new URL(request.url);
  const page = await listOrdersForUser(identity!.user.id, {
    status: searchParams.get("status") ?? undefined,
    page: Number(searchParams.get("page") ?? 1) || 1,
    pageSize: Number(searchParams.get("pageSize") ?? 10) || 10,
  });
  return ok(page, {
    pagination: {
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      hasMore: page.hasMore,
    },
  });
});
