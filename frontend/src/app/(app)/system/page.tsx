import type { Metadata } from "next";
import { SystemView } from "@/app/(app)/system/SystemView";

export const metadata: Metadata = { title: "System status" };

export default function SystemPage() {
  return <SystemView />;
}
