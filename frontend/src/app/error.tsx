"use client";

/**
 * Global error boundary.
 *
 * Without this, an uncaught render error shows Next.js's default screen, which
 * tells the user nothing and offers no way back. This shows what happened and
 * gives them a retry that re-renders the segment rather than forcing a reload.
 */

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card, CardBody, CardHeader } from "@/components/ui/primitives";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the browser console and any attached logging.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md animate-fade-up">
        <CardHeader
          title="Something went wrong"
          description="An unexpected error stopped this page from rendering."
        />
        <CardBody className="space-y-4">
          <p className="text-xs leading-relaxed text-ink-muted">
            The error has been logged to the browser console. Retrying re-renders
            the page; if it keeps failing, the backend may be unreachable.
          </p>

          {error.message ? (
            <pre className="max-h-32 overflow-auto rounded-lg border border-line-soft bg-canvas px-3 py-2.5 font-mono text-[10px] leading-relaxed text-danger">
              {error.message}
            </pre>
          ) : null}

          {error.digest ? (
            <p className="font-mono text-[10px] text-ink-faint">
              Digest: {error.digest}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            <Link href="/dashboard">
              <Button variant="secondary">Back to dashboard</Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
