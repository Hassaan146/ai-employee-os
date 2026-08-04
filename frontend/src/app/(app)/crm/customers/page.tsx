import type { Metadata } from "next";
import { CustomersView } from "@/app/(app)/crm/customers/CustomersView";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return <CustomersView />;
}
