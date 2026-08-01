import type { Metadata } from "next";
import { TeamView } from "@/app/(app)/team/TeamView";

export const metadata: Metadata = { title: "Team" };

export default function TeamPage() {
  return <TeamView />;
}
