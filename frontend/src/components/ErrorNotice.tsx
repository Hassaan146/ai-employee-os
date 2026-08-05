"use client";

/**
 * Error banner for pages backed by live endpoints.
 *
 * The counterpart to DataSourceNotice: where that one says "this is fixture
 * data", this one says "the real call failed". Neither ever silently shows
 * nothing.
 */

import { ApiError } from "@/lib/api/client";
import { Badge, Button } from "@/components/ui/primitives";

export function ErrorNotice({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-danger/25 bg-danger/[0.06] px-4 py-3"
    >
      <Badge tone="danger">Request failed</Badge>
      <p className="flex-1 text-xs leading-relaxed text-ink-muted">
        {describe(error)}
      </p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

function describe(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "Cannot reach the backend. Check that it is running on port 8000.";
    }
    if (error.status === 401) {
      return "Your session has expired. Sign in again to continue.";
    }
    if (error.status === 403) {
      return "You do not have permission to do that.";
    }
    if (error.status === 404) {
      return "That record no longer exists. It may have been deleted.";
    }
    if (error.status === 408) {
      return "The request timed out. The backend may be busy.";
    }
    if (error.status === 422) {
      return "The backend rejected the data sent. Check the fields and try again.";
    }
    if (error.status >= 500) {
      return `The backend returned an error (${error.status}). Check its logs.`;
    }
    return `Request failed with status ${error.status}.`;
  }
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}
