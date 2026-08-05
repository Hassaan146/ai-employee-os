import type { Metadata } from "next";
import { InvoicesView } from "@/app/(app)/invoices/InvoicesView";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return <InvoicesView />;
}
