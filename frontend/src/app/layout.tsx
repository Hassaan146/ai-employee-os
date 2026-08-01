import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Employee OS",
    template: "%s · AI Employee OS",
  },
  description:
    "Operations console for AI Employee OS — an AI-powered business operating system that runs repetitive office work through specialised AI employees.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
