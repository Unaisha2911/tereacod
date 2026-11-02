import type { LegalDocument } from "@/types";

/**
 * MOCK LEGAL DOCUMENTS
 * --------------------
 * Shop-appropriate sample copy until the client supplies
 * approved documents. Each document renders through the same template
 * with a table of contents, effective/updated dates and version.
 */

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Sale",
    effectiveDate: "1 January 2025",
    lastUpdated: "12 January 2025",
    version: "v2.3",
    summary:
      "The terms on which TereaCOD Trading L.L.C. sells to you through the TereaCOD shop: eligibility, ordering, AED pricing, UAE-wide delivery, age verification at the door, returns for faulty devices and liability.",
    sections: [
      {
        id: "eligibility",
        heading: "1. Eligibility",
        paragraphs: [
          "You must be at least 18 years old to buy nicotine products in the United Arab Emirates. By placing an order through TereaCOD you confirm that you meet this requirement and that the name, contact number and delivery address you provide are accurate and your own.",
          "We verify age at purchase and again at the door: the courier hands over nicotine products only after checking a valid Emirates ID. If verification fails, the order is returned to our Dubai warehouse.",
        ],
        list: [
          "Minimum age: 18 years",
          "One account per person",
          "Age verification with Emirates ID before every handover",
        ],
      },
      {
        id: "orders",
        heading: "2. Orders and acceptance",
        paragraphs: [
          "Orders are placed through the shop checkout or by WhatsApp. An order becomes a contract when we confirm it — by checkout confirmation and dispatch, or by WhatsApp confirmation from a member of the Dubai team. We may decline an order that fails age or address verification, or where a product is out of stock after confirmation.",
          "All prices are shown and charged in UAE dirhams (AED) and include VAT where applicable. Delivery fees, if any, are shown before you confirm the order. As a prototype storefront, no payment is ever collected and no order is transmitted.",
        ],
      },
      {
        id: "delivery",
        heading: "3. Delivery",
        paragraphs: [
          "We deliver to all seven Emirates — most orders arrive within 1 hour of confirmation in Dubai and the same day across the other Emirates. Standard delivery is free on orders of AED 300 or more (AED 25 below that); express next-day delivery is available where coverage allows, for AED 35.",
          "The courier will call before arrival and verify a valid Emirates ID at the door. If the person receiving the order cannot prove they are 18 or over, the delivery is not handed over and is returned to us; we will contact you to rearrange.",
        ],
      },
      {
        id: "returns",
        heading: "4. Returns and cancellations",
        paragraphs: [
          "Devices found to be faulty on arrival can be returned within seven days of delivery for a replacement or refund — contact support with your order reference and a photo or short video of the fault. For hygiene reasons, opened e-liquids, pods and coils can only be returned where a fault is confirmed.",
          "Orders can be changed or cancelled until they are packed. Complaints are handled by the support desk first; unresolved issues follow the escalation route described in our Consumer Information page.",
        ],
      },
      {
        id: "liability",
        heading: "5. Liability",
        paragraphs: [
          "Products sold on TereaCOD are supplied by TereaCOD Trading L.L.C. on behalf of vetted brands, and we remain responsible to you for their conformity. Nothing in these terms limits liability for death, personal injury or fraud to the extent such limitation is not permitted under UAE law.",
          "Otherwise, and to the extent permitted by UAE law, our liability for any order is limited to the amount you paid for that order.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Notice",
    effectiveDate: "1 January 2025",
    lastUpdated: "10 January 2025",
    version: "v1.8",
    summary:
      "How TereaCOD handles personal data: what this prototype stores, the purposes we use data for, and your rights under UAE Federal Decree-Law No. 45 of 2021 (PDPL).",
    sections: [
      {
        id: "data-we-collect",
        heading: "1. Data we collect",
        paragraphs: [
          "In this prototype release, TereaCOD stores no personal data on a server. Your cart and saved products live in your browser's session storage, and the contact and address details you type at checkout exist only in that session — they are never transmitted or persisted.",
          "When the production storefront goes live, this notice will describe account data, order and delivery history, support correspondence and security logs.",
        ],
        list: ["Cart and saved products (session storage only)", "Order details entered at checkout (not transmitted in this release)", "Support messages you send us", "Technical logs (security)"],
      },
      {
        id: "purposes",
        heading: "2. How we use data",
        paragraphs: [
          "Data is used to fulfil and deliver orders, verify that buyers and recipients are 18 or over, answer support enquiries, meet legal obligations for nicotine sales in the UAE and keep the storefront secure. Product updates are sent only where you have consented, and you can withdraw that consent at any time.",
        ],
      },
      {
        id: "rights",
        heading: "3. Your rights",
        paragraphs: [
          "Under UAE Federal Decree-Law No. 45 of 2021 (PDPL) you can request access to your personal data, and ask for it to be rectified, deleted or ported. Submit a request from the privacy page of your account, or write to the privacy office using the contact below; we respond within the period the law requires.",
        ],
      },
      {
        id: "contact-privacy",
        heading: "4. Contacting the privacy office",
        paragraphs: [
          "Write to privacy@tereacod.ae or use the enquiry form on our contact page. Include the email address or order reference the request relates to so we can locate the records. Requests are answered within five business days in this release.",
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Notice",
    effectiveDate: "1 January 2025",
    lastUpdated: "8 January 2025",
    version: "v1.2",
    summary:
      "What TereaCOD stores on your device: strictly necessary session storage and display preferences — no third-party advertising trackers. Analytics, if ever added, will be consent-gated.",
    sections: [
      {
        id: "what-we-use",
        heading: "1. Cookies we use",
        paragraphs: [
          "The storefront sets no advertising or cross-site tracking cookies of any kind. What it does keep on your device is described below — none of it is shared with third parties for marketing.",
        ],
        list: [
          "Strictly necessary — keeps your session and cart intact while you browse",
          "Preferences — remembers display choices such as theme or sorting",
          "Analytics — aggregated and consent-gated (not used in this release)",
        ],
      },
      {
        id: "managing",
        heading: "2. Managing cookies",
        paragraphs: [
          "You can clear or block storage at any time through your browser settings; the cart and saved-products features will simply reset for that session. If consent-gated analytics are introduced in a future release, a consent manager will let you accept or refuse them before anything is set.",
        ],
      },
    ],
  },
  {
    slug: "consumer-information",
    title: "Consumer Information",
    effectiveDate: "1 January 2025",
    lastUpdated: "12 January 2025",
    version: "v1.0",
    summary:
      "What every TereaCOD customer should know: the nicotine health warning, the 18+ rule and Emirates ID checks, our authenticity guarantee, the marking to expect on genuine packaging and how to complain.",
    sections: [
      {
        id: "health-warning",
        heading: "1. Health warning",
        paragraphs: [
          "WARNING: This product contains nicotine. Nicotine is an addictive chemical.",
          "These products are not recommended for non-smokers, young people, or pregnant or breastfeeding women. Nicotine-containing products must be kept out of reach of children and pets at all times. If you experience any adverse effect, stop using the product and seek medical advice.",
        ],
      },
      {
        id: "age-restriction",
        heading: "2. Age restriction",
        paragraphs: [
          "It is illegal to sell nicotine products to persons under 18 in the United Arab Emirates. Age is verified at purchase and again at delivery: the courier hands over only after checking a valid Emirates ID belonging to an adult at the address.",
        ],
      },
      {
        id: "authenticity",
        heading: "3. Authenticity guarantee",
        paragraphs: [
          "Every product stocked by TereaCOD is sourced through vetted official channels and checked against the brand's own security features — scratch panel, QR code and packaging marks — before it is listed. Genuine packaging also carries the ESMA/ECAS conformity marking expected for the category in the UAE.",
          "If a product you bought from us fails either check, contact us and we will make it right — see the Terms of Sale for returns.",
        ],
      },
      {
        id: "safe-use",
        heading: "4. Safe use basics",
        paragraphs: [
          "Vapor products are for adult use only, and the basics are simple: store liquids upright away from children and sunlight, charge only with the cable supplied, never modify batteries or chargers, and dispose of devices and cells at battery collection points rather than household waste.",
        ],
        list: [
          "Store liquids upright, away from children and sunlight",
          "Never modify batteries or chargers",
          "Dispose of devices and cells at battery collection points",
        ],
      },
      {
        id: "reporting",
        heading: "5. Reporting a safety issue or complaint",
        paragraphs: [
          "If you suspect a defect or experience an adverse reaction, stop using the product and tell us: use the enquiry form on our contact page or the support email, quoting your order reference and including photos where possible. Safety reports are prioritised by the support desk and escalated to the compliance office where needed.",
        ],
      },
    ],
  },
];

export const legalDocumentBySlug = (slug: string) => LEGAL_DOCUMENTS.find((d) => d.slug === slug);
