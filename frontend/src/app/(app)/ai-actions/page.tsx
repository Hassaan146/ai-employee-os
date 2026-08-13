import type { Metadata } from "next";
import { AiActionsView } from "@/app/(app)/ai-actions/AiActionsView";

export const metadata: Metadata = { title: "AI actions" };

export default function AiActionsPage() {
  return <AiActionsView />;
}
