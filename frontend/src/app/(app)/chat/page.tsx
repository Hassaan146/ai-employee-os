import type { Metadata } from "next";
import { ChatView } from "@/app/(app)/chat/ChatView";

export const metadata: Metadata = { title: "Assistant chat" };

export default function ChatPage() {
  return <ChatView />;
}
