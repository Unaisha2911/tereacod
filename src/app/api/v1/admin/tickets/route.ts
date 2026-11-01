import { withApi, ok } from "@/server/api/guard";
import { listTickets } from "@/server/repos/support";

export const GET = withApi({ requirePermission: "support.read" }, async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const tickets = await listTickets({
    status: (searchParams.get("status") as "open" | "all" | null) ?? undefined,
    priority: (searchParams.get("priority") as "high" | "all" | null) ?? undefined,
    query: searchParams.get("q") ?? undefined,
  });
  return ok({ items: tickets, total: tickets.length });
});
