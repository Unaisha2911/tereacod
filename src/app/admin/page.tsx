import type { Metadata } from "next";
import { OverviewView } from "./overview-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminOverviewPage() {
  return <OverviewView />;
}
