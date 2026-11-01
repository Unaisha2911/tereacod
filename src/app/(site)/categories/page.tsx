import { permanentRedirect } from "next/navigation";

/** Legacy route — the shop now lives at /collections (301). */
export default function CategoriesRedirectPage() {
  permanentRedirect("/collections");
}
