/**
 * TereaCOD — Help centre FAQ dataset (typed, inline copy).
 * Rendered by /help/faq with search + category filtering.
 */

export const FAQ_CATEGORIES = ["Devices", "Sticks", "Safety", "Orders", "Account", "Privacy"] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export interface FaqEntry {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export const FAQS: FaqEntry[] = [
  /* ------------------------------ Devices ------------------------------ */
  {
    id: "brands-stocked",
    category: "Devices",
    question: "Which brands does TereaCOD stock?",
    answer:
      "The catalog currently stocks one focused line: IQOS ILUMA heat-not-burn tobacco sticks. The range spans all seven sourcing lines — Uzbekistan, Tajikistan, Kyrgyzstan, Indonesia, Switzerland (Duty Free), Japan and Italy — covering toasted tobaccos, Wave menthols, Pearl editions and the Dimension Series. Every listing shows its flavour profile, sticks per pack and origin line, and is authenticity-checked before it goes on the wall.",
  },
  {
    id: "device-setup",
    category: "Devices",
    question: "Do the sticks need a special device?",
    answer:
      "Yes — these tobacco sticks are prepared exclusively for the IQOS ILUMA system and are not compatible with older IQOS models. The device itself is not sold here; you need a charged ILUMA holder. Insert the stick until it stops, start the heating cycle as usual and draw gently. Full usage steps are in the manual that came with your device.",
  },
  {
    id: "devices-rechargeable",
    category: "Devices",
    question: "Do the sticks contain a battery?",
    answer:
      "No. Every stick is just prepared tobacco — all heating and electronics live in the IQOS ILUMA holder, which charges over USB-C. The holder's battery details are in its own manual; each stick is used once and then disposed of responsibly.",
  },
  {
    id: "coils-pods",
    category: "Devices",
    question: "Are the sticks compatible with every IQOS device?",
    answer:
      "No — they are made for the IQOS ILUMA family only and will not work correctly with older-blade IQOS models. Check the Compatibility line on each product page, and if in doubt WhatsApp us the model printed on your holder before ordering.",
  },
  {
    id: "travel-device",
    category: "Devices",
    question: "Can I travel with my device?",
    answer:
      "Airline rules vary by carrier and destination, so always check your airline's policy before flying. As a general baseline: carry devices and liquids in cabin baggage, never in the hold; keep spare batteries away from metal objects; and confirm that vapor products are legal where you are going. Use is prohibited on board at all times.",
  },
  {
    id: "verify-authenticity",
    category: "Devices",
    question: "How does TereaCOD verify authenticity?",
    answer:
      "We source through vetted official distribution channels, and every brand we stock ships with its own security feature — a scratch panel or QR code on the packaging. Our Dubai team checks stock against those marks before listing it. If you want to double-check a product you bought from us, WhatsApp us the code on the panel and we will verify it against our records.",
  },
  /* ------------------------------- Sticks ------------------------------- */
  {
    id: "store-liquids",
    category: "Sticks",
    question: "How should I store the tobacco sticks?",
    answer:
      "Keep the pack sealed, upright, out of direct sunlight and below 25 °C — and always out of reach of children and pets. Stored this way, sticks are best enjoyed before the date printed on the pack.",
  },
  {
    id: "nicotine-strengths",
    category: "Sticks",
    question: "Do the sticks contain nicotine?",
    answer:
      "Yes — these are real tobacco products and they contain nicotine, which is addictive. Heat-not-burn delivers nicotine differently from cigarettes or e-liquids: the tobacco is heated, never burned. Nicotine information is printed on every pack and each product page carries the flavour profile and product details.",
  },
  {
    id: "salt-vs-freebase",
    category: "Sticks",
    question: "How is heat-not-burn different from vaping?",
    answer:
      "Vaping aerosolises a liquid; heat-not-burn heats a real tobacco stick just enough to release a tobacco-flavoured aerosol — no burning, no ash and no lighter. That is why the sticks only work in a compatible induction device such as the IQOS ILUMA. The product pages describe each flavour profile so you can pick the tobacco, menthol or capsule edition that suits you.",
  },
  /* ------------------------------- Safety ------------------------------ */
  {
    id: "legal-age",
    category: "Safety",
    question: "What is the legal age to purchase nicotine products?",
    answer:
      "Eighteen. It is illegal to sell nicotine products to anyone under 18 in the United Arab Emirates, and age verification is applied at purchase and again at delivery.",
  },
  {
    id: "liquid-skin-contact",
    category: "Safety",
    question: "What safety rules apply to the sticks?",
    answer:
      "The sticks are for adult nicotine users only — keep them sealed and away from children and pets, and never eat or swallow one; seek medical advice immediately if that happens. Do not use a damaged or damp stick, and let a used stick cool before disposing of it in general waste.",
  },
  {
    id: "dispose-device",
    category: "Safety",
    question: "How do I dispose of used sticks and the holder?",
    answer:
      "Let used sticks cool completely, then place them in general waste where local rules allow. The ILUMA holder itself contains a rechargeable cell — never bin it; take it to a battery collection point, which most supermarkets and electronics retailers in the UAE provide.",
  },
  /* ------------------------------- Orders ------------------------------ */
  {
    id: "how-ordering-works",
    category: "Orders",
    question: "How do I order from TereaCOD?",
    answer:
      "Two ways. Add products to your bag and check out on the site with your delivery details, or send your list straight to our WhatsApp and a member of the Dubai team will confirm stock, total and delivery with you. Either route ends with the same courier handover — age-checked at your door.",
  },
  {
    id: "change-order",
    category: "Orders",
    question: "Can I change or cancel my order?",
    answer:
      "Orders can be changed or cancelled until they reach the packed stage; after that, refuse the delivery at the door or contact support to arrange a return.",
  },
  {
    id: "delivery-time",
    category: "Orders",
    question: "How long does delivery take?",
    answer:
      "Most orders arrive within 1 hour in our Dubai delivery zone and the same day across the rest of the UAE. A valid Emirates ID check is completed at the door, as required for nicotine products.",
  },
  {
    id: "delivery-fees",
    category: "Orders",
    question: "What does delivery cost?",
    answer:
      "Standard delivery is free on orders of AED 300 or more and AED 25 below that, across all seven Emirates. Express next-day delivery — where available — is AED 35. The cart and checkout show the exact fee for your order before you confirm.",
  },
  {
    id: "payment-methods",
    category: "Orders",
    question: "What payment methods do you accept?",
    answer:
      "Cash on delivery and card on delivery — you pay the courier at the door, in cash or on the courier's machine. No online card charge happens today.",
  },
  {
    id: "returns-faulty",
    category: "Orders",
    question: "What if a pack arrives faulty?",
    answer:
      "Contact support within seven days with your order reference and a photo or short video of the fault. We replace verified faulty packs or refund the order — the details are set out in our Terms of Sale. For hygiene reasons, opened packs can only be returned when the fault is confirmed.",
  },
  /* ------------------------------- Account ----------------------------- */
  {
    id: "reset-password",
    category: "Account",
    question: "How do I reset my password?",
    answer:
      "Choose Forgot password on the sign-in screen, enter your email and follow the secure link we send. Reset links expire for security — request a fresh one if yours has timed out.",
  },
  {
    id: "delete-saved-items",
    category: "Account",
    question: "How do I remove a saved product?",
    answer:
      "Open Saved in your account and deselect the bookmark on the product's card. Saved items sync to your account when you're signed in.",
  },
  /* ------------------------------- Privacy ----------------------------- */
  {
    id: "data-request",
    category: "Privacy",
    question: "How do I request a copy of my data?",
    answer:
      "Submit a request from the privacy page of your account or write to the privacy office. Under UAE Federal Decree-Law No. 45 of 2021 (PDPL) you can request access, rectification, deletion and portability of your personal data.",
  },
  {
    id: "cookies-tracking",
    category: "Privacy",
    question: "Do you use tracking cookies?",
    answer:
      "This release sets no marketing cookies. Strictly necessary cookies keep your session intact, and future analytics cookies will be consent-gated — the Cookie Notice describes the full picture.",
  },
];
