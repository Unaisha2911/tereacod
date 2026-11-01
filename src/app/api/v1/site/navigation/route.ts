import { withApi, ok } from "@/server/api/guard";
import {
  headerNav,
  mobileNav,
  footerColumns,
  legalNav,
} from "@/server/repos/settings";
import type { NavigationItem } from "@/types";

export const GET = withApi({}, async ({ request }) => {
  const location = new URL(request.url).searchParams.get("location") ?? "header";
  let items: NavigationItem[] = [];
  switch (location) {
    case "header":
      items = await headerNav();
      break;
    case "mobile":
      items = await mobileNav();
      break;
    case "legal":
      items = await legalNav();
      break;
    case "footer": {
      const columns = await footerColumns();
      return ok({ columns });
    }
    default:
      items = [];
  }
  return ok({ items });
});
