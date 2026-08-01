import Link from "next/link";
import { Button } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 text-center">
      <div className="space-y-4">
        <p className="font-mono text-5xl font-semibold tracking-tight text-accent">404</p>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Page not found
          </h1>
          <p className="max-w-sm text-xs leading-relaxed text-ink-muted">
            That route does not exist in the console yet. It may be part of a
            later phase.
          </p>
        </div>
        <Link href="/dashboard" className="inline-block">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
