import type { Metadata } from "next";
import { PipelineView } from "@/app/(app)/crm/pipeline/PipelineView";

export const metadata: Metadata = { title: "Sales pipeline" };

export default function PipelinePage() {
  return <PipelineView />;
}
