import type { Metadata } from "next";
import { LeadsView } from "@/app/(app)/crm/leads/LeadsView";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return <LeadsView />;
}
