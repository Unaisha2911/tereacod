import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NeonHeading } from "@/components/homepage/neon-heading";
import { CategoryCard } from "@/components/shared/category-card";
import { getCategories, getProducts } from "@/server/data";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Shop Heat-Not-Burn Collections — IQOS ILUMA Tobacco Sticks",
  description:
    "Shop TereaCOD by collection — heat-not-burn tobacco sticks and IQOS devices made for IQOS ILUMA across all seven origin lines. Authentic stock, AED pricing, UAE-wide delivery.",
  ...canonical("/collections"),
  openGraph: {
    title: "Shop Heat-Not-Burn Collections — IQOS ILUMA Tobacco Sticks",
    description:
      "Shop TereaCOD by collection — heat-not-burn tobacco sticks and IQOS devices across all seven origin lines, delivered UAE-wide.",
    url: "/collections",
    siteName: "TereaCOD",
    type: "website",
    locale: "en_AE",
    images: [{ url: "/collections/terea-sticks-collection.jpg", width: 1344, height: 768, alt: "TEREA sticks collections at TereaCOD UAE" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Heat-Not-Burn Collections — IQOS ILUMA Tobacco Sticks",
    images: ["/collections/terea-sticks-collection.jpg"],
  },
};

/** Collections — index of browsable category shelves. */
export default async function CollectionsPage() {
  const [catalogCategories, catalogItems] = await Promise.all([getCategories(), getProducts()]);

  return (
    <section className="relative">
      <PageContainer className="relative z-10">
        <div className="pt-6">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Collections" }]}
          />
        </div>

        <h1 className="sr-only">Collections</h1>

        <div className="pb-4 pt-10 sm:pt-14">
          <NeonHeading
            eyebrow="TereaCOD"
            title="Shop the"
            accent="collections"
            iceAccent
          />
          <p className="max-w-2xl pt-5 text-lead text-muted-foreground">
            Focused collections spanning every brand we stock — heat-not-burn
            tobacco sticks and IQOS devices across all seven origin lines.
            Pick a shelf below and browse the full {catalogItems.length}-product range.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {catalogCategories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
