import type { Metadata } from "next";
import { EmployeesView } from "@/app/(app)/employees/EmployeesView";

export const metadata: Metadata = { title: "AI employees" };

export default function EmployeesPage() {
  return <EmployeesView />;
}
