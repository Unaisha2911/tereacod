import type { Metadata } from "next";
import { ProductsListView } from "./products-list-view";

export const metadata: Metadata = { title: "Products" };

export default function AdminCatalogProductsPage() {
  return <ProductsListView />;
}
