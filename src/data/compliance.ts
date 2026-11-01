import type { ComplianceRecord } from "@/types";

/**
 * SEED COMPLIANCE RECORDS
 * -----------------------
 * Document inventory for the compliance module, imported by
 * scripts/seed.ts into the compliance_records table. Statuses
 * intentionally mix verified / pending / missing / expired so every UI
 * state is exercised. Presence of this data does not establish
 * compliance — it is baseline copy for a fresh deployment.
 */

export const COMPLIANCE_RECORDS: ComplianceRecord[] = [
  {
    id: "cmp-001",
    area: "Product safety",
    title: "Nicotine content test reports",
    description: "Per-batch laboratory reports verifying declared nicotine strength for all e-liquid SKUs.",
    status: "verified",
    lastReviewed: "2024-12-18",
    expiresAt: "2025-06-18",
    owner: "Quality",
    documents: [{ id: "cd-1", title: "Batch test summary Q4-2024", type: "pdf" }],
  },
  {
    id: "cmp-002",
    area: "Packaging",
    title: "Child-resistant closure certification (ISO 8317)",
    description: "Certification for all e-liquid bottles and sealed device outer packaging.",
    status: "verified",
    lastReviewed: "2024-11-02",
    expiresAt: "2026-11-01",
    owner: "Packaging",
    documents: [{ id: "cd-2", title: "ISO 8317 certificate", type: "pdf" }],
  },
  {
    id: "cmp-003",
    area: "Notifications",
    title: "EU CE notification records (ECID)",
    description: "Notification identifiers for all SKUs sold into EU markets.",
    status: "verified",
    lastReviewed: "2025-01-04",
    owner: "Regulatory",
    documents: [{ id: "cd-3", title: "ECID register", type: "web" }],
  },
  {
    id: "cmp-004",
    area: "UAE market",
    title: "UAQ/ESMA conformity file",
    description: "Federal conformity documentation for devices distributed in the UAE.",
    status: "pending",
    lastReviewed: "2024-10-20",
    owner: "Regulatory",
    documents: [],
  },
  {
    id: "cmp-005",
    area: "Marketing",
    title: "Advertising claims review log",
    description: "Sign-off log ensuring no unapproved health claims appear on site or packaging.",
    status: "verified",
    lastReviewed: "2025-01-09",
    expiresAt: "2025-04-09",
    owner: "Compliance",
    documents: [{ id: "cd-4", title: "Claims review log", type: "pdf" }],
  },
  {
    id: "cmp-006",
    area: "Age verification",
    title: "Age-verification provider assessment",
    description: "Vendor and DPIA assessment for the future age-verification integration.",
    status: "missing",
    owner: "Compliance",
    documents: [],
  },
  {
    id: "cmp-007",
    area: "Product safety",
    title: "Battery transport declaration (UN 38.3)",
    description: "Transport test summary for lithium cells shipped as cargo.",
    status: "expired",
    lastReviewed: "2023-12-01",
    expiresAt: "2024-12-01",
    owner: "Logistics",
    documents: [{ id: "cd-5", title: "UN 38.3 summary (2023)", type: "pdf" }],
  },
];
