import type { Metadata } from "next";
import { MeetingsView } from "@/app/(app)/meetings/MeetingsView";

export const metadata: Metadata = { title: "Meetings" };

export default function MeetingsPage() {
  return <MeetingsView />;
}
