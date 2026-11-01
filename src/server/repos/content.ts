/**
 * TereaCOD — content repository (legal documents, compliance records, FAQs).
 */

import { getDb } from "@/server/db/client";
import { cached, CACHE_TTL } from "@/server/cache";
import type { ComplianceRecord, LegalDocument } from "@/types";

/* ------------------------------ legal documents --------------------------- */

export async function listLegalDocuments(): Promise<LegalDocument[]> {
  // Legal bodies are long-lived text — cached 5 minutes (see CACHE_TTL.content).
  return cached("content:legal", CACHE_TTL.content, async () => {
  const db = await getDb();
  const docs = await db.all<{
    id: string;
    slug: string;
    title: string;
    version: string;
    effective_date: string;
    last_updated: string;
    summary: string;
  }>(
    `SELECT * FROM legal_documents WHERE status = 'published' ORDER BY slug`
  );
  if (docs.length === 0) return [];

  const sections = await db.all<{
    document_id: string;
    heading: string;
    body_json: string;
    list_json: string | null;
  }>(
    `SELECT document_id, heading, body_json, list_json FROM legal_sections
     ORDER BY document_id, position`
  );

  return docs.map((doc) => {
    const docSections = sections
      .filter((s) => s.document_id === doc.id)
      .map((s, index) => {
        let paragraphs: string[] = [];
        let list: string[] | undefined;
        try {
          paragraphs = JSON.parse(s.body_json) as string[];
          if (s.list_json) list = JSON.parse(s.list_json) as string[];
        } catch {
          paragraphs = [];
        }
        return {
          id: `${doc.slug}-s${index + 1}`,
          heading: s.heading,
          paragraphs,
          list,
        };
      });
    return {
      slug: doc.slug,
      title: doc.title,
      effectiveDate: doc.effective_date,
      lastUpdated: doc.last_updated,
      version: doc.version,
      summary: doc.summary,
      sections: docSections,
    } satisfies LegalDocument;
  });
  });
}

export async function getLegalDocument(slug: string): Promise<LegalDocument | null> {
  const docs = await listLegalDocuments();
  return docs.find((d) => d.slug === slug) ?? null;
}

/* ----------------------------- compliance records -------------------------- */

export async function listComplianceRecords(): Promise<ComplianceRecord[]> {
  return cached("content:compliance", CACHE_TTL.content, async () => {
  const db = await getDb();
  const rows = await db.all<{
    id: string;
    area: string;
    title: string;
    description: string;
    status: string;
    last_reviewed: string | null;
    expires_at: string | null;
    owner: string | null;
  }>(`SELECT * FROM compliance_records ORDER BY area, title`);

  // Documents are optional; seeded records reference legal docs by convention.
  return rows.map((row) => ({
    id: row.id,
    area: row.area,
    title: row.title,
    description: row.description,
    status: row.status as ComplianceRecord["status"],
    lastReviewed: row.last_reviewed ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    owner: row.owner ?? undefined,
    documents: [],
  }));
  });
}

/* ----------------------------------- FAQs ---------------------------------- */

export interface FaqEntryRow {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export async function listFaqs(): Promise<FaqEntryRow[]> {
  return cached("content:faqs", CACHE_TTL.content, async () => {
    const db = await getDb();
    return db.all<FaqEntryRow>(
      `SELECT id, category, question, answer FROM faqs ORDER BY position, id`
    );
  });
}
