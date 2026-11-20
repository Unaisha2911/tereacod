import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getLegalDocumentBySlug, getLegalDocuments } from "@/server/data";
import { LegalDocumentTemplate } from "@/components/legal/legal-document-template";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getLegalDocumentBySlug("consumer-information");
  return {
    ...canonical("/legal/consumer-information"),
    title: doc?.title ?? "Consumer Information",
    description:
      doc?.summary ??
      "Consumer information for TereaCOD customers — nicotine health warnings, age-verification requirements, delivery coverage across the Emirates and how to contact UAE consumer protection authorities.",
  };
}

export default async function ConsumerInformationPage() {
  const [current, documents] = await Promise.all([
    getLegalDocumentBySlug("consumer-information"),
    getLegalDocuments(),
  ]);
  if (!current) notFound();
  const otherDocs = documents.filter((d) => d.slug !== current.slug);
  return <LegalDocumentTemplate doc={current} otherDocs={otherDocs} />;
}
