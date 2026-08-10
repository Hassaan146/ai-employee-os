import type { Metadata } from "next";
import { WhatsappView } from "@/app/(app)/whatsapp/WhatsappView";

export const metadata: Metadata = { title: "Whatsapp" };

export default function WhatsappPage() {
  return <WhatsappView />;
}
