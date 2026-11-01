import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeading } from "@/components/layout/page-heading";
import { PrototypeNotice } from "@/components/shared/prototype-notice";
import { cn } from "@/lib/utils";
import { AccountNav } from "./account-nav";

/** Slim, true notice shown across the account area. */
export const ACCOUNT_NOTICE =
  "Your account is protected by encrypted sessions. 18+ account rules apply.";

/**
 * AccountPage — shared chrome for every account screen.
 *
 * layout="nav"    → Breadcrumbs + account notice + heading + grid
 *                   (sticky account nav | content column).
 * layout="center" → Breadcrumbs + account notice + centered narrow
 *                   column for auth screens (the view provides its own h1).
 */
export function AccountPage({
  title,
  lead,
  eyebrow,
  crumbs,
  actions,
  layout = "nav",
  centerWidth = "md",
  children,
}: {
  title: string;
  lead?: string;
  eyebrow?: string;
  /** Override the default Home / Account / {title} trail. */
  crumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  layout?: "nav" | "center";
  centerWidth?: "md" | "lg";
  children: React.ReactNode;
}) {
  const items: BreadcrumbItem[] = crumbs ?? [
    { label: "Home", href: "/" },
    { label: "Account", href: "/account" },
    { label: title },
  ];

  return (
    <PageContainer>
      <Breadcrumbs items={items} className="pt-6 sm:pt-8" />
      <PrototypeNotice className="mt-4">{ACCOUNT_NOTICE}</PrototypeNotice>

      {layout === "nav" ? (
        <>
          <PageHeading eyebrow={eyebrow} title={title} lead={lead} actions={actions} />
          <div className="grid items-start gap-8 pb-24 lg:grid-cols-[16rem_1fr]">
            <div className="min-w-0">
              <AccountNav />
            </div>
            <div className="min-w-0 space-y-5">{children}</div>
          </div>
        </>
      ) : (
        <div className={cn("mx-auto w-full pb-24 pt-8 sm:pt-10", centerWidth === "lg" ? "max-w-lg" : "max-w-md")}>
          {children}
        </div>
      )}
    </PageContainer>
  );
}
