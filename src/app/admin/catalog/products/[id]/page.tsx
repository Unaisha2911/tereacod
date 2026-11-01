import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminBasePath } from "@/server/console";
import { FileQuestion } from "lucide-react";
import { getCurrentIdentity } from "@/server/auth-context";
import { hasPermission } from "@/server/rbac";
import { adminGetProduct } from "@/server/repos/catalog";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductEditorView } from "./product-editor-view";

export const metadata: Metadata = { title: "Edit product" };

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  // Per-page permission gate (QA audit): product records require catalog.read.
  const identity = await getCurrentIdentity();
  if (!identity || !hasPermission(identity.roles, "catalog.read")) redirect(adminBasePath());

  const { id } = await params;
  const detail = await adminGetProduct(id);

  if (!detail) {
    return (
      <div className="mx-auto max-w-7xl">
        <EmptyState
          icon={FileQuestion}
          title={`No product with id "${id}"`}
          body="The record may have been removed, or the link points at an outdated id. Product ids live in the catalog database."
          actionLabel="Back to products"
          actionHref={adminBasePath() + "/catalog/products"}
        />
      </div>
    );
  }

  return <ProductEditorView detail={detail} />;
}
