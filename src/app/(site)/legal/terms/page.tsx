import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getLegalDocumentBySlug, getLegalDocuments } from "@/server/data";
import { LegalDocumentTemplate } from "@/components/legal/legal-document-template";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getLegalDocumentBySlug("terms");
  return {
    ...canonical("/legal/terms"),
    title: doc?.title ?? "Terms of Sale",
    description:
      doc?.summary ??
      "TereaCOD terms of sale for UAE orders — pricing in AED, cash or card on delivery, age-verified delivery of nicotine products, returns and liability under UAE consumer law.",
  };
}

export default async function TermsPage() {
  const [current, documents] = await Promise.all([
    getLegalDocumentBySlug("terms"),
    getLegalDocuments(),
  ]);
  if (!current) notFound();
  const otherDocs = documents.filter((d) => d.slug !== current.slug);
  return <LegalDocumentTemplate doc={current} otherDocs={otherDocs} />;
}
