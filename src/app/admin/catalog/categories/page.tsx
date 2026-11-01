import type { Metadata } from "next";
import { CategoriesView } from "./categories-view";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCatalogCategoriesPage() {
  return <CategoriesView />;
}
