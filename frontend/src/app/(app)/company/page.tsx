import type { Metadata } from "next";
import { CompanyView } from "@/app/(app)/company/CompanyView";

export const metadata: Metadata = { title: "Company & plan" };

export default function CompanyPage() {
  return <CompanyView />;
}
