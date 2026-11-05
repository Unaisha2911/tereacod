"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Cigarette, Zap } from "lucide-react";
import { RevealSection } from "@/components/atmosphere/reveal-section";
import { NeonHeading } from "./neon-heading";
import { SectionContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

/**
 * STORE COLLECTIONS — the two permanent storefront collections.
 *
 * "TEREA Sticks" and "IQOS Devices" are the two pillars of the catalog;
 * each card links to its dedicated /collections/<slug> shelf. The shelves
 * start empty — products are authored later from the admin console and
 * appear on their collection page automatically (no demo products here by
 * design).
 */

interface StoreCollection {
  slug: string;
  name: string;
  blurb: string;
  image: string;
  accentText: string;
  chipBg: string;
  icon: typeof Cigarette;
  iconTone: string;
}

const STORE_COLLECTIONS: StoreCollection[] = [
  {
    slug: "terea-sticks",
    name: "TEREA Sticks",
    blurb:
      "The full heat-not-burn stick range for IQOS ILUMA — toasted tobaccos, menthols and Pearl editions across all seven origin lines.",
    image: "/collections/terea-sticks-collection.jpg",
    accentText: "text-violet-soft",
    chipBg: "bg-violet-glow/15 text-violet-soft",
    icon: Cigarette,
    iconTone: "text-violet-soft",
  },
  {
    slug: "iqos-devices",
    name: "IQOS Devices",
    blurb:
      "ILUMA pocket devices, PEM holders and official accessories — authentic hardware for every TEREA stick, delivered UAE-wide.",
    image: "/collections/iqos-devices-collection.jpg",
    accentText: "text-ice",
    chipBg: "bg-ice/15 text-ice",
    icon: Zap,
    iconTone: "text-ice",
  },
];

function CollectionCard({ collection, index }: { collection: StoreCollection; index: number }) {
  const reduced = useReducedMotion();
  const Icon = collection.icon;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="h-full"
    >
      <Link
        href={`/collections/${collection.slug}`}
        aria-label={`${collection.name} collection — browse the shelf`}
        className="group relative flex h-full min-h-72 flex-col overflow-hidden rounded-3xl border border-line bg-elevated/45 transition-[border-color,box-shadow] duration-300 hover:border-violet-glow/45 hover:shadow-[0_0_36px_rgba(139,92,246,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Collection artwork */}
        <div className="relative h-44 w-full overflow-hidden sm:h-52">
          <Image
            src={collection.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0912] via-[#0c0912]/25 to-transparent" aria-hidden="true" />
          <span
            className={cn(
              "absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm",
              collection.chipBg
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            Collection
          </span>
        </div>

        {/* Copy */}
        <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
          <h3 className={cn("font-display text-2xl font-bold", collection.accentText)}>
            {collection.name}
          </h3>
          <p className="text-[0.9rem] leading-relaxed text-muted-foreground">{collection.blurb}</p>
          <span className="mt-auto inline-flex items-center gap-2 pt-3 text-sm font-medium text-foreground transition-colors group-hover:text-violet-soft">
            Shop the collection
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function StoreCollectionsSection() {
  return (
    <SectionContainer spacing="lg">
      <section aria-labelledby="store-collections-heading" className="relative z-10">
        <RevealSection className="flex flex-wrap items-end justify-between gap-6">
          <NeonHeading
            id="store-collections-heading"
            eyebrow="The two pillars"
            title="Shop by"
            accent="collection"
            iceAccent
          />
          <Link
            href="/collections"
            className="group inline-flex items-center gap-2 rounded-full border border-line-strong bg-foreground/[0.03] px-5 py-2.5 text-sm font-medium text-foreground shadow-[0_0_12px_rgba(139,92,246,0.12)] transition-[border-color,box-shadow] hover:border-violet-glow/55 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
          >
            All collections
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </RevealSection>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {STORE_COLLECTIONS.map((collection, index) => (
            <CollectionCard key={collection.slug} collection={collection} index={index} />
          ))}
        </div>
      </section>
    </SectionContainer>
  );
}
