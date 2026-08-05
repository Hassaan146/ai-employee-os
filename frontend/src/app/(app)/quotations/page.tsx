import type { Metadata } from "next";
import { QuotationsView } from "@/app/(app)/quotations/QuotationsView";

export const metadata: Metadata = { title: "Quotations" };

export default function QuotationsPage() {
  return <QuotationsView />;
}
