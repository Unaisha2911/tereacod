import { withApi, ok } from "@/server/api/guard";
import { adminOverview } from "@/server/repos/admin";
import { hasPermission } from "@/server/rbac";

// orders.read is held by every staff role (super-admin, catalog-manager,
// order-ops, support-agent, viewer) and by no customer role — so requiring
// it enforces "any staff member" without letting plain customers pull ops
// metrics (the old requireAuth-only gate leaked them to any signed-in user).
export const GET = withApi({ requirePermission: "orders.read" }, async ({ identity }) => {
  const overview = await adminOverview();
  // Scope the payload: aggregate ops numbers for any staff member, but audit
  // detail only for roles holding audit.read.
  return ok({
    ...overview,
    recentActivity: identity && hasPermission(identity.roles, "audit.read") ? overview.recentActivity : [],
  });
});
