import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeading } from "@/components/layout/page-heading";
import { canonical, faqJsonLd, JsonLd } from "@/lib/seo";
import { FaqView } from "./faq-view";
import { getFaqs } from "@/server/data";

export const metadata: Metadata = {
  title: "TEREA FAQ UAE — Delivery, Ordering, Payments & Age Rules",
  description:
    "Frequently asked questions about TereaCOD TEREA delivery in the UAE — flavours in stock, UAE-wide and same-day Dubai delivery, WhatsApp ordering, cash or card on delivery, age verification, safety and your data. Searchable and filterable by topic.",
  ...canonical("/help/faq"),
};

export default async function FaqPage() {
  // Plain-copy each row: database drivers return null-prototype records,
  // which cannot cross the server→client component boundary as-is.
  const faqs = (await getFaqs()).map((faq) => ({ ...faq }));
  // Topic filter list in first-appearance order (the seeded dataset
  // groups its questions by topic, so this preserves the designed order).
  const categories = [...new Set(faqs.map((faq) => faq.category))];

  return (
    <PageContainer width="default" className="pb-16 sm:pb-24">
      {/* FAQPage rich result — mirrors every Q&A rendered below. */}
      <JsonLd data={faqJsonLd(faqs)} />
      <PageHeading
        eyebrow="Help centre"
        title="Frequently asked questions"
        lead="Practical answers about devices, liquids, safety, orders and your data. Search the list or filter by topic."
      />
      <FaqView faqs={faqs} categories={categories} />
    </PageContainer>
  );
}
