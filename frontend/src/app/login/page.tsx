import type { Metadata } from "next";
import { LoginView } from "@/app/login/LoginView";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <LoginView />;
}
