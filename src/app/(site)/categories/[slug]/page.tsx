import { permanentRedirect } from "next/navigation";

interface CategoryRedirectProps {
  params: Promise<{ slug: string }>;
}

/** Legacy category route — 301s to the matching /collections page. */
export default async function CategoryRedirectPage({ params }: CategoryRedirectProps) {
  const { slug } = await params;
  permanentRedirect(`/collections/${slug}`);
}
