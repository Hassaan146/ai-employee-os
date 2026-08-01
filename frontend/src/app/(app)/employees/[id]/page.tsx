import type { Metadata } from "next";
import { EmployeeDetailView } from "@/app/(app)/employees/[id]/EmployeeDetailView";

export const metadata: Metadata = { title: "AI employee" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmployeeDetailView id={id} />;
}
