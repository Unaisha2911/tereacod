import { withApi, ok } from "@/server/api/guard";
import { adminCustomers } from "@/server/repos/admin";

export const GET = withApi({ requirePermission: "customers.read" }, async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const customers = await adminCustomers({
    search: searchParams.get("q") ?? undefined,
    status: (searchParams.get("status") as "active" | "all" | null) ?? undefined,
  });
  return ok({ items: customers, total: customers.length });
});
