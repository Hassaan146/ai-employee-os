import type { Metadata } from "next";
import { AuditLogsView } from "@/app/(app)/audit-logs/AuditLogsView";

export const metadata: Metadata = { title: "AuditLogs" };

export default function AuditLogsPage() {
  return <AuditLogsView />;
}
