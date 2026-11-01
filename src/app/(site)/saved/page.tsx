import type { Metadata } from "next";
import { SavedView } from "./saved-view";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Saved",
  description: "Products you saved while browsing the TereaCOD catalog — synced to your account when you sign in.",
};

export default function SavedPage() {
  return <SavedView />;
}
