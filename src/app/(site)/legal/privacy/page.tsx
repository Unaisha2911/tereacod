import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import { notFound } from "next/navigation";
import { getLegalDocumentBySlug, getLegalDocuments } from "@/server/data";
import { LegalDocumentTemplate } from "@/components/legal/legal-document-template";

export async function generateMetadata(): Promise<Metadata> {
  const doc = await getLegalDocumentBySlug("privacy");
  return {
    ...canonical("/legal/privacy"),
    title: doc?.title ?? "Privacy Notice",
    description:
      doc?.summary ??
      "How TereaCOD collects, uses, stores and protects customer personal data for UAE orders — account details, delivery addresses, age verification records and your privacy rights under UAE law.",
  };
}

export default async function PrivacyPage() {
  const [current, documents] = await Promise.all([
    getLegalDocumentBySlug("privacy"),
    getLegalDocuments(),
  ]);
  if (!current) notFound();
  const otherDocs = documents.filter((d) => d.slug !== current.slug);
  return <LegalDocumentTemplate doc={current} otherDocs={otherDocs} />;
}
